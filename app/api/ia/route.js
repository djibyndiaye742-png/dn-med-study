import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé Gemini non configurée sur le serveur." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const fichier = formData.get("fichier");
    const action = formData.get("action");
    const question = formData.get("question") || "";

    if (!fichier || fichier.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Ajoute un document PDF valide." },
        { status: 400 }
      );
    }

    if (fichier.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Le PDF ne doit pas dépasser 15 Mo." },
        { status: 400 }
      );
    }

    const prompts = {
      resume: "Analyse ce cours médical et crée un résumé détaillé, structuré avec titres, définitions, mécanismes, points essentiels et notions à retenir. N'invente aucune information.",
      qcm: "Crée 15 QCM médicaux à partir de ce cours. Donne les propositions, les bonnes réponses et une explication détaillée pour chaque question. Ne sors pas du contenu du document.",
      flashcards: "Crée 20 flashcards de révision à partir de ce cours. Pour chaque carte, donne une question et une réponse précise.",
      chat: `Réponds à cette question en t'appuyant sur le cours fourni : ${question}. Si la réponse n'est pas dans le cours, précise-le clairement.`
    };

    if (!prompts[action]) {
      return NextResponse.json(
        { error: "Action non reconnue." },
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

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
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
          }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Erreur Gemini." },
        { status: response.status }
      );
    }

    const resultat = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("\n");

    if (!resultat) {
      throw new Error("Gemini n'a pas retourné de réponse.");
    }

    return NextResponse.json({ resultat });

  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Une erreur est survenue." },
      { status: 500 }
    );
  }
                    }
