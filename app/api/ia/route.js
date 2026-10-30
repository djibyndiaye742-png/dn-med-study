import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite"
];

const PROMPTS = {
  resume: `Tu es un professeur de médecine universitaire.
Analyse attentivement le cours fourni.
Produis un résumé détaillé, clair et structuré avec :
- Définitions
- Explications et mécanismes
- Classifications
- Points essentiels à mémoriser
- Notions importantes pour les examens
N'invente aucune information absente du document.`,

  qcm: `Tu es un enseignant en médecine universitaire.
Crée 15 QCM de niveau deuxième année médecine à partir du cours.
Chaque question comporte 4 propositions A, B, C et D.
Indique les bonnes réponses et explique chaque correction.
Respecte strictement les informations du document.`,

  flashcards: `Crée 20 flashcards médicales à partir du cours.
Chaque carte contient une question précise et une réponse claire.
Privilégie les définitions, mécanismes, classifications et notions essentielles.
N'invente aucune information.`,

  chat: null
};

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        { error: "Clé Gemini absente du serveur. Vérifie GEMINI_API_KEY sur Vercel." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const fichier = formData.get("fichier");
    const action = formData.get("action");
    const question = String(formData.get("question") || "");

    if (!fichier || typeof fichier.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "Aucun fichier PDF reçu." },
        { status: 400 }
      );
    }

    if (
      !fichier.name?.toLowerCase().endsWith(".pdf") ||
      fichier.type !== "application/pdf"
    ) {
      return NextResponse.json(
        { error: "Le fichier doit être un PDF valide." },
        { status: 400 }
      );
    }

    if (fichier.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "PDF trop volumineux. Utilise un fichier de moins de 4 Mo." },
        { status: 413 }
      );
    }

    if (!["resume", "qcm", "flashcards", "chat"].includes(action)) {
      return NextResponse.json(
        { error: "Action inconnue." },
        { status: 400 }
      );
    }

    if (action === "chat" && !question.trim()) {
      return NextResponse.json(
        { error: "Écris une question avant de continuer." },
        { status: 400 }
      );
    }

    const prompt = action === "chat"
      ? `Tu es un tuteur médical.
Réponds à la question en utilisant prioritairement le cours fourni.
Si le cours ne contient pas la réponse, indique-le clairement.
Question : ${question}`
      : PROMPTS[action];

    const base64 = Buffer.from(
      await fichier.arrayBuffer()
    ).toString("base64");

    const body = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192
      }
    };

    let lastError = null;

    for (const model of MODELS) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey
            },
            body: JSON.stringify(body),
            signal: controller.signal
          }
        );

        const data = await response.json();

        if (response.ok) {
          const resultat = data.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("\n");

          if (!resultat) {
            return NextResponse.json(
              { error: "Le modèle n'a retourné aucun texte. Réessaie." },
              { status: 502 }
            );
          }

          return NextResponse.json({ resultat, model });
        }

        lastError = data.error?.message || "Erreur Gemini.";

        if (![429, 500, 503].includes(response.status)) {
          return NextResponse.json(
            { error: lastError, code: response.status },
            { status: response.status }
          );
        }

      } catch (error) {
        if (error.name === "AbortError") {
          lastError = "Le modèle met trop de temps à répondre.";
        } else {
          lastError = error.message;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    return NextResponse.json(
      {
        error: "Les modèles Gemini sont momentanément indisponibles. Réessaie dans quelques minutes.",
        details: lastError
      },
      { status: 503 }
    );

  } catch (error) {
    console.error("Erreur moteur IA :", error);

    return NextResponse.json(
      { error: "Erreur interne : " + error.message },
      { status: 500 }
    );
  }
}



