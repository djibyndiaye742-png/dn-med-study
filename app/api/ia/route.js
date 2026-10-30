
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        { error: "Clé Gemini absente. Vérifie les variables Vercel." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const fichier = formData.get("fichier");
    const action = formData.get("action");
    const question = formData.get("question") || "";

    if (!fichier || typeof fichier.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "Aucun PDF reçu." },
        { status: 400 }
      );
    }

    if (!fichier.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Le fichier doit être un PDF." },
        { status: 400 }
      );
    }

    if (fichier.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "PDF trop volumineux. Essaie un fichier de moins de 4 Mo." },
        { status: 413 }
      );
    }

    const prompts = {
      resume: `Tu es un professeur de médecine.
Analyse attentivement ce cours et produis un résumé détaillé et structuré.
Présente les définitions, mécanismes, classifications, notions importantes et points à mémoriser.
N'invente aucune information absente du document.`,

      qcm: `Tu es un enseignant en médecine.
Crée 15 QCM de niveau universitaire exclusivement à partir du cours.
Pour chaque question, propose 4 réponses, indique la ou les bonnes réponses et explique chaque correction.
Ne crée aucune information non présente dans le document.`,

      flashcards: `Crée 20 flashcards médicales à partir du cours.
Chaque carte doit comporter une question précise et une réponse claire.
Privilégie les définitions, mécanismes, classifications et notions essentielles.`,

      chat: `Tu es un tuteur médical.
Réponds à la question suivante en utilisant prioritairement le document.
Si le document ne contient pas la réponse, indique-le clairement.
Question : ${question}`
    };

    if (!prompts[action]) {
      return NextResponse.json(
        { error: "Action inconnue." },
        { status: 400 }
      );
    }

    if (action === "chat" && !question.trim()) {
      return NextResponse.json(
        { error: "Écris une question." },
        { status: 400 }
      );
    }

    const base64 = Buffer.from(
      await fichier.arrayBuffer()
    ).toString("base64");

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 50000);

    let response;

    try {
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompts[action] },
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
          }),
          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json();

    if (!response.ok) {
      console.error("Erreur Gemini :", response.status, data);

      return NextResponse.json(
        {
          error: data.error?.message || "Erreur de communication avec Gemini.",
          code: response.status
        },
        { status: response.status }
      );
    }

    const resultat = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("\n");

    if (!resultat) {
      return NextResponse.json(
        { error: "Gemini n'a retourné aucun texte." },
        { status: 502 }
      );
    }

    return NextResponse.json({ resultat });

  } catch (error) {
    console.error("Erreur moteur IA :", error);

    if (error.name === "AbortError") {
      return NextResponse.json(
        { error: "Gemini met trop de temps à répondre. Essaie avec un PDF plus petit." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
