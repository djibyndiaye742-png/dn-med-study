"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export default function Home() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [nom, setNom] = useState("Étudiant");
  const [fichier, setFichier] = useState(null);
  const [action, setAction] = useState("");
  const [resultat, setResultat] = useState("");
  const [question, setQuestion] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/connexion");
        return;
      }

      setUser(u);

      try {
        const profil = await getDoc(doc(db, "users", u.uid));
        if (profil.exists()) {
          setNom(profil.data().prenom || u.displayName || "Étudiant");
        }
      } catch (e) {
        console.error(e);
      }

      setChargement(false);
    });

    return () => unsubscribe();
  }, [router]);

  async function deconnexion() {
    await signOut(auth);
    router.replace("/connexion");
  }

  async function analyser(type) {
    setErreur("");
    setResultat("");

    if (!fichier) {
      setErreur("Choisis d'abord un cours au format PDF.");
      return;
    }

    if (type === "chat" && !question.trim()) {
      setErreur("Écris d'abord ta question.");
      return;
    }

    setAction(type);

    try {
      const formData = new FormData();
      formData.append("fichier", fichier);
      formData.append("action", type);

      if (type === "chat") {
        formData.append("question", question);
      }

      const response = await fetch("/api/ia", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur pendant l'analyse.");
      }

      setResultat(data.resultat);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setAction("");
    }
  }

  if (chargement) {
    return <main style={center}>Chargement de DN Med Study...</main>;
  }

  if (!user) return null;

  return (
    <main style={page}>
      <header style={header}>
        <div>
          <h2>DN Med Study 🩺</h2>
          <small>Plateforme intelligente de médecine</small>
        </div>

        <button style={logout} onClick={deconnexion}>
          Déconnexion
        </button>
      </header>

      <section style={container}>
        <h1>Bienvenue, {nom} !</h1>
        <p>Ton assistant intelligent de révision médicale.</p>

        <article style={card}>
          <h2>1. Importer un cours</h2>
          <p>Sélectionne un document PDF contenant ton cours.</p>

          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => {
              setFichier(e.target.files?.[0] || null);
              setResultat("");
              setErreur("");
            }}
          />

          {fichier && (
            <p style={{ color: "#0f766e" }}>
              Document sélectionné : {fichier.name}
            </p>
          )}
        </article>

        <article style={card}>
          <h2>2. Travailler avec Gemini</h2>

          <div style={grid}>
            <button
              style={button}
              disabled={!!action}
              onClick={() => analyser("resume")}
            >
              Générer un résumé
            </button>

            <button
              style={button}
              disabled={!!action}
              onClick={() => analyser("qcm")}
            >
              Générer des QCM
            </button>

            <button
              style={button}
              disabled={!!action}
              onClick={() => analyser("flashcards")}
            >
              Créer des flashcards
            </button>
          </div>
        </article>

        <article style={card}>
          <h2>3. Ton tuteur médical IA</h2>
          <p>Pose une question sur le contenu de ton PDF.</p>

          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Exemple : explique-moi le mécanisme de la respiration..."
            style={textarea}
          />

          <button
            style={button}
            disabled={!!action}
            onClick={() => analyser("chat")}
          >
            Poser ma question
          </button>
        </article>

        {action && (
          <article style={card}>
            <h3>Gemini analyse ton cours...</h3>
            <p>Patiente quelques instants.</p>
          </article>
        )}

        {erreur && (
          <article style={{ ...card, color: "#b91c1c" }}>
            <strong>Erreur :</strong> {erreur}
          </article>
        )}

        {resultat && (
          <article style={resultCard}>
            <h2>Résultat de l'analyse</h2>
            <div style={resultText}>{resultat}</div>

            <button
              style={button}
              onClick={() => {
                navigator.clipboard.writeText(resultat);
                alert("Résultat copié !");
              }}
            >
              Copier le résultat
            </button>
          </article>
        )}
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  background: "#f1f5f9",
  color: "#172033",
  fontFamily: "Arial, sans-serif"
};

const center = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center"
};

const header = {
  background: "#0f766e",
  color: "white",
  padding: "18px 22px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 12
};

const container = {
  maxWidth: 950,
  margin: "auto",
  padding: 20
};

const card = {
  background: "white",
  padding: 22,
  marginTop: 20,
  borderRadius: 12,
  boxShadow: "0 2px 8px #0000000d"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 12
};

const button = {
  background: "#0f766e",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: 14,
  marginTop: 10,
  cursor: "pointer"
};

const logout = {
  padding: 10,
  border: "none",
  borderRadius: 7,
  cursor: "pointer"
};

const textarea = {
  display: "block",
  width: "100%",
  minHeight: 100,
  padding: 12,
  marginTop: 12,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  boxSizing: "border-box"
};

const resultCard = {
  ...card,
  border: "1px solid #99f6e4"
};

const resultText = {
  whiteSpace: "pre-wrap",
  lineHeight: 1.8,
  margin: "20px 0",
  overflowWrap: "anywhere"
};
