import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const CASES = {
  abdomen: {
    title: "Douleur abdominale",
    patient: "Mamadou, 24 ans",
    initial: "J'ai mal au ventre depuis ce matin."
  },
  respiration: {
    title: "Difficulté respiratoire",
    patient: "Aminata, 32 ans",
    initial: "J'ai du mal à respirer depuis hier soir."
  },
  fievre: {
    title: "Fièvre et frissons",
    patient: "Ibrahima, 28 ans",
    initial: "J'ai de la fièvre et des frissons depuis deux jours."
  }
};

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");

    if (!token) {
      return NextResponse.json(
        { error: "Connexion requise." },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !data?.user) {
      return NextResponse.json(
        { error: "Session invalide. Reconnecte-toi." },
        { status: 401 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé Gemini absente sur Vercel." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { caseId, messages, action } = body;
    const clinicalCase = CASES[caseId];

    if (!clinicalCase || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Cas clinique invalide." },
        { status: 400 }
      );
    }

    if (messages.length > 50) {
      return NextResponse.json(
        { error: "Conversation trop longue. Recommence un cas." },
        { status: 400 }
      );
    }

    const conversation = messages
      .filter(m =>
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string"
      )
      .map(m =>
        `${m.role === "user" ? "Médecin étudiant" : "Patient"} : ${m.content.slice(0, 2000)}`
      )
      .join("\n");

    const evaluation = action === "evaluate";

    const prompt = evaluation
      ? `Tu es un enseignant de médecine chargé d'évaluer une consultation simulée.

Cas : ${clinicalCase.title}
Patient : ${clinicalCase.patient}

Conversation :
${conversation}

Évalue la démarche de l'étudiant de manière pédagogique.
Présente :
1. Qualité de l'interrogatoire.
2. Questions importantes oubliées.
3. Informations cliniques correctement recherchées.
4. Hypothèses diagnostiques à envisager, sans affirmer un diagnostic certain.
5. Examens complémentaires pertinents à discuter.
6. Points à améliorer.
7. Une note indicative sur 20, avec justification.

Ne récompense pas les conclusions non justifiées. Rappelle que cette simulation ne remplace pas la supervision clinique. Réponds en français.`
      : `Tu incarnes un patient dans une simulation médicale destinée à un étudiant en médecine.

Cas : ${clinicalCase.title}
Identité : ${clinicalCase.patient}
Première plainte : ${clinicalCase.initial}

Règles :
- Réponds uniquement comme le patient, en français naturel.
- Ne révèle que les informations que le médecin demande.
- Si une question est posée, réponds de façon réaliste et cohérente.
- N'invente pas de nouveaux symptômes sans raison.
- Garde les mêmes informations tout au long de la consultation.
- Ne donne pas spontanément le diagnostic.
- Si le médecin pose une question incompréhensible, demande-lui de préciser.
- Ne donne jamais de conseils de traitement au médecin.
- Reste dans le rôle du patient.

Conversation jusqu'ici :
${conversation}

Réponds maintenant à la dernière question du médecin.`;

    const models = [
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite"
    ];

    let lastError = "";

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: evaluation ? 0.3 : 0.7,
                maxOutputTokens: 1500
              }
            }),
            signal: AbortSignal.timeout(45000)
          }
        );

        const result = await response.json();

        if (!response.ok) {
          lastError = result.error?.message || "Erreur Gemini.";
          if ([429, 500, 503].includes(response.status)) continue;

          return NextResponse.json(
            { error: lastError },
            { status: response.status }
          );
        }

        const text = result.candidates?.[0]?.content?.parts
          ?.map(part => part.text || "")
          .join("\n")
          .trim();

        if (!text) {
          throw new Error("Réponse vide du modèle.");
        }

        return NextResponse.json(
          evaluation ? { report: text } : { reply: text }
        );

      } catch (error) {
        lastError = error.message;
      }
    }

    return NextResponse.json(
      {
        error: "Le service IA est momentanément indisponible.",
        details: lastError
      },
      { status: 503 }
    );

  } catch (error) {
    console.error("Patient virtuel :", error);

    return NextResponse.json(
      { error: "Erreur interne du patient virtuel." },
      { status: 500 }
    );
  }
      }
