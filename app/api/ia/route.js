import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite"
];

const PROMPTS = {
  resume: `Tu es un professeur de médecine universitaire expérimenté.
Analyse attentivement le PDF et produis une fiche de cours claire, fidèle et pédagogique.
Organise le résultat avec des titres et sous-titres :
1. Objectifs et idée générale
2. Définitions importantes
3. Explication des mécanismes, étape par étape
4. Classifications et tableaux comparatifs si utiles
5. Exemples pour comprendre
6. Points essentiels à mémoriser
7. Pièges et notions importantes pour les examens.
Le PDF reste la référence du programme. Tu peux reformuler pour rendre le cours compréhensible, mais ne déforme pas ses informations. Si tu ajoutes une précision médicale extérieure indispensable à la compréhension, indique clairement « Complément pédagogique ».
Présente les formules lisiblement et explique chaque symbole. N'invente pas de données.`,

  qcm: `Tu es un enseignant de médecine universitaire et un concepteur de QCM exigeant.
À partir du PDF fourni, crée exactement 15 questions de niveau deuxième année de médecine.
Chaque question comporte exactement 4 propositions A, B, C et D.
Certaines questions peuvent avoir une seule bonne réponse, d'autres plusieurs. Indique le type avec "single" ou "multiple".
Les propositions doivent être plausibles, précises, non ambiguës et tester la compréhension du cours, pas seulement la mémorisation.
Pour chaque question, donne les lettres exactes des bonnes réponses et une explication pédagogique qui justifie la réponse et, si utile, explique les pièges des autres propositions.
Le PDF est la référence principale : ne fabrique pas de faits qui contredisent le document.
Réponds UNIQUEMENT avec un objet JSON valide, sans Markdown, sans bloc de code et sans texte avant ou après, selon cette structure exacte :
{
  "title": "QCM - [titre court du thème]",
  "questions": [
    {
      "id": 1,
      "type": "single",
      "question": "Énoncé complet de la question",
      "options": {
        "A": "Proposition A",
        "B": "Proposition B",
        "C": "Proposition C",
        "D": "Proposition D"
      },
      "correctAnswers": ["A"],
      "explanation": "Explication pédagogique claire."
    }
  ]
}
Respecte exactement cette structure pour les 15 questions. Les correctAnswers doivent contenir uniquement A, B, C ou D.`,

  flashcards: `Crée 20 flashcards médicales à partir du PDF.
Chaque carte contient une question précise et une réponse claire.
Privilégie les définitions, mécanismes, classifications et notions essentielles.
Explique les notions suffisamment pour faciliter la mémorisation.
Le PDF reste la référence : ne contredis pas son contenu. Si tu ajoutes un complément indispensable, signale-le comme « Complément pédagogique ».`,
  chat: null
};

function extraireSources(candidate) {
  const chunks = candidate?.groundingMetadata?.groundingChunks || [];

  const sources = chunks
    .map(chunk => chunk.web)
    .filter(web => web?.uri)
    .map(web => ({
      title: web.title || web.uri,
      uri: web.uri
    }));

  return [...new Map(
    sources.map(source => [source.uri, source])
  ).values()];
}

export async function POST(request) {
  try {
    // Vérification obligatoire de la connexion.
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return NextResponse.json(
        { error: "Connecte-toi pour utiliser l'Assistant IA." },
        { status: 401 }
      );
    }

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    const { data: authData, error: authError } =
      await supabaseAuth.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Session invalide. Connecte-toi à nouveau." },
        { status: 401 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        {
          error: "Clé Gemini absente du serveur. Vérifie GEMINI_API_KEY sur Vercel."
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const fichier = formData.get("fichier");
    const actionRecue = formData.get("action");
    const action = actionRecue === "question" ? "chat" : actionRecue;
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
        {
          error: "PDF trop volumineux. Utilise un fichier de moins de 4 Mo."
        },
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
      ? `Tu es le professeur particulier de médecine de l'étudiant. Tu es pédagogue, rigoureux, patient et capable d'expliquer les notions à un étudiant de deuxième année.

DOCUMENT DE RÉFÉRENCE :
Lis le PDF fourni et identifie le thème, les notions et le niveau du cours.

TA MISSION :
Réponds à la question de l'étudiant en prenant le cours comme point de départ, mais ne te limite jamais à recopier les diapositives.
Mobilise tes connaissances médicales fiables pour expliquer les notions, les mécanismes physiologiques ou pathologiques, les liens entre les concepts et les exemples utiles.
Si le cours mentionne une notion sans l'expliquer suffisamment, développe-la avec tes connaissances.
Si la question porte sur un élément qui n'est pas développé dans le cours, explique-le quand même s'il est médicalement pertinent, puis précise brièvement qu'il s'agit d'un complément au cours. Ne réponds pas simplement « le cours ne mentionne pas cela ».
Tu peux utiliser Google Search lorsque cela améliore réellement la réponse : pour vérifier une recommandation actuelle, une donnée récente, une définition spécialisée ou un point médical qui mérite des sources. Privilégie les sources institutionnelles et scientifiques fiables (OMS, ministères de la Santé, sociétés savantes, recommandations officielles, publications scientifiques). N'effectue pas de recherche inutile pour les notions fondamentales bien établies.
Distingue clairement :
- « Dans le cours » : ce que le document enseigne.
- « Pour comprendre » : tes explications et connaissances pédagogiques.
- « Complément » : les informations utiles ajoutées au-delà du cours.
Ne présente jamais une hypothèse comme un fait. En cas de controverse ou d'incertitude, dis-le.
Ne donne pas de conseil de diagnostic ou de traitement personnalisé à un patient réel.

PRÉSENTATION ATTENDUE :
Utilise un titre clair, des sous-titres, des paragraphes courts, des listes et des tableaux lorsque cela aide.
Explique les mécanismes étape par étape avec des liens logiques.
Définis les termes difficiles dès leur apparition.
Donne au moins un exemple concret ou une analogie simple lorsque c'est pertinent.
Termine par « À retenir » avec les idées essentielles.
Évite les réponses superficielles, les répétitions et les longues citations du PDF.

QUESTION DE L'ÉTUDIANT :
${question}`
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
        temperature: action === "chat" ? 0.65 : action === "qcm" ? 0.35 : 0.4,
        maxOutputTokens: 8192
      }
    };

    let lastError = null;

    for (const model of MODELS) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        55000
      );

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
          const candidate = data.candidates?.[0];

          const resultat = candidate?.content?.parts
            ?.map(part => part.text || "")
            .join("\n")
            .trim();

          if (!resultat) {
            return NextResponse.json(
              {
                error: "Le modèle n'a retourné aucun texte. Réessaie."
              },
              { status: 502 }
            );
          }

          return NextResponse.json({
            resultat,
            model,
            sources: action === "chat"
              ? extraireSources(candidate)
              : []
          });
        }

        lastError = data.error?.message || "Erreur Gemini.";

        if (![429, 500, 503].includes(response.status)) {
          return NextResponse.json(
            {
              error: lastError,
              code: response.status
            },
            { status: response.status }
          );
        }

      } catch (error) {
        lastError = error.name === "AbortError"
          ? "Le modèle met trop de temps à répondre."
          : error.message;

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
      {
        error: "Erreur interne : " + error.message
      },
      { status: 500 }
    );
  }
      }
