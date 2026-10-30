"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const cours = [
  {
    matiere: "Anatomie",
    titre: "Le système cardiovasculaire",
    contenu: "Le système cardiovasculaire comprend le cœur et les vaisseaux sanguins. Le cœur assure la circulation du sang dans l'organisme.",
    resume: "Le cœur possède quatre cavités : deux oreillettes et deux ventricules. Il assure la circulation pulmonaire et systémique."
  },
  {
    matiere: "Physiologie",
    titre: "La respiration",
    contenu: "La respiration permet les échanges gazeux entre l'organisme et son environnement. Elle comprend la ventilation, les échanges alvéolaires et le transport des gaz.",
    resume: "L'oxygène passe des alvéoles vers le sang. Le dioxyde de carbone suit le trajet inverse."
  },
  {
    matiere: "Biochimie",
    titre: "Les glucides",
    contenu: "Les glucides sont des molécules énergétiques. On distingue les monosaccharides, les disaccharides et les polysaccharides.",
    resume: "Le glucose est une source énergétique majeure pour les cellules."
  }
];

const questions = [
  {
    question: "Combien de cavités possède le cœur humain ?",
    choix: ["Deux", "Trois", "Quatre", "Six"],
    reponse: 2,
    explication: "Le cœur humain possède deux oreillettes et deux ventricules."
  },
  {
    question: "Où se déroulent les échanges gazeux pulmonaires ?",
    choix: ["Dans la trachée", "Dans les alvéoles", "Dans le larynx", "Dans les bronches principales"],
    reponse: 1,
    explication: "Les échanges gazeux ont lieu au niveau de la membrane alvéolocapillaire."
  },
  {
    question: "Quel est le principal sucre utilisé par les cellules ?",
    choix: ["Glucose", "Cellulose", "Lactose", "Amidon"],
    reponse: 0,
    explication: "Le glucose est un substrat énergétique important des cellules."
  }
];

export default function Home() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [profil, setProfil] = useState({});
  const [onglet, setOnglet] = useState("Accueil");
  const [historique, setHistorique] = useState([]);
  const [question, setQuestion] = useState(0);
  const [choix, setChoix] = useState({});
  const [termine, setTermine] = useState(false);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (utilisateur) => {
      if (!utilisateur) {
        router.replace("/connexion");
        return;
      }

      setUser(utilisateur);

      try {
        const profilDoc = await getDoc(
          doc(db, "users", utilisateur.uid)
        );

        if (profilDoc.exists()) {
          setProfil(profilDoc.data());
        }

        const resultats = await getDocs(
          query(
            collection(db, "users", utilisateur.uid, "resultats"),
            orderBy("date", "desc")
          )
        );

        setHistorique(
          resultats.docs.map(d => ({ id: d.id, ...d.data() }))
        );
      } catch (error) {
        console.error("Erreur de chargement :", error);
      }

      setChargement(false);
    });

    return () => unsubscribe();
  }, [router]);

  async function deconnexion() {
    await signOut(auth);
    router.replace("/connexion");
  }

  async function enregistrerResultat() {
    const score = questions.filter(
      (q, i) => choix[i] === q.reponse
    ).length;

    try {
      await addDoc(
        collection(db, "users", user.uid, "resultats"),
        {
          score,
          total: questions.length,
          date: serverTimestamp(),
          activite: "QCM général"
        }
      );

      setTermine(true);
    } catch (error) {
      alert("Impossible de sauvegarder le résultat.");
    }
  }

  if (chargement) {
    return <main style={center}>Chargement de DN Med Study...</main>;
  }

  if (!user) return null;

  const nom = profil.prenom || user.displayName || "Étudiant";

  return (
    <main style={page}>
      <header style={header}>
        <h2>DN Med Study 🩺</h2>
        <button onClick={deconnexion} style={logout}>
          Déconnexion
        </button>
      </header>

      <div style={layout}>
        <nav style={menu}>
          {["Accueil", "Cours", "Résumés", "QCM", "PDF", "Profil"].map(item => (
            <button
              key={item}
              onClick={() => setOnglet(item)}
              style={{
                ...menuButton,
                background: onglet === item ? "#0f766e" : "transparent",
                color: onglet === item ? "white" : "#334155"
              }}
            >
              {item}
            </button>
          ))}
        </nav>

        <section style={content}>
          {onglet === "Accueil" && (
            <>
              <h1>Bienvenue, {nom} !</h1>
              <p>Ton espace personnel de révision médicale.</p>

              <div style={grid}>
                {["Cours", "Résumés", "QCM", "PDF"].map(item => (
                  <button
                    key={item}
                    style={card}
                    onClick={() => setOnglet(item)}
                  >
                    <h2>{item}</h2>
                    <p>Accéder à {item.toLowerCase()}</p>
                  </button>
                ))}
              </div>

              <h2>Derniers résultats</h2>
              {historique.length === 0
                ? <p>Aucun résultat enregistré.</p>
                : historique.slice(0, 5).map(r => (
                  <p key={r.id}>
                    {r.activite} : {r.score}/{r.total}
                  </p>
                ))
              }
            </>
          )}

          {onglet === "Cours" && (
            <>
              <h1>Cours de médecine</h1>
              {cours.map(c => (
                <article style={article} key={c.titre}>
                  <small>{c.matiere}</small>
                  <h2>{c.titre}</h2>
                  <p>{c.contenu}</p>
                </article>
              ))}
            </>
          )}

          {onglet === "Résumés" && (
            <>
              <h1>Fiches de révision</h1>
              {cours.map(c => (
                <article style={article} key={c.titre}>
                  <small>{c.matiere}</small>
                  <h2>{c.titre}</h2>
                  <p>{c.resume}</p>
                </article>
              ))}
            </>
          )}

          {onglet === "QCM" && (
            <>
              <h1>QCM de révision</h1>

              {!termine ? (
                <>
                  <p>Question {question + 1} sur {questions.length}</p>
                  <h2>{questions[question].question}</h2>

                  {questions[question].choix.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setChoix({ ...choix, [question]: i })}
                      style={{
                        ...option,
                        background: choix[question] === i ? "#ccfbf1" : "white"
                      }}
                    >
                      {c}
                    </button>
                  ))}

                  {question < questions.length - 1 ? (
                    <button
                      style={action}
                      disabled={choix[question] === undefined}
                      onClick={() => setQuestion(question + 1)}
                    >
                      Question suivante
                    </button>
                  ) : (
                    <button
                      style={action}
                      disabled={Object.keys(choix).length !== questions.length}
                      onClick={enregistrerResultat}
                    >
                      Terminer et enregistrer
                    </button>
                  )}
                </>
              ) : (
                <>
                  <h2>Résultat du QCM</h2>
                  <h1>
                    {questions.filter((q, i) => choix[i] === q.reponse).length}
                    /{questions.length}
                  </h1>

                  {questions.map((q, i) => (
                    <article style={article} key={i}>
                      <p>{q.question}</p>
                      <p>
                        {choix[i] === q.reponse
                          ? "Bonne réponse"
                          : "Réponse incorrecte"}
                      </p>
                      <p>Correction : {q.choix[q.reponse]}</p>
                      <p>{q.explication}</p>
                    </article>
                  ))}

                  <button
                    style={action}
                    onClick={() => {
                      setQuestion(0);
                      setChoix({});
                      setTermine(false);
                    }}
                  >
                    Recommencer
                  </button>
                </>
              )}
            </>
          )}

          {onglet === "PDF" && (
            <>
              <h1>Bibliothèque PDF</h1>
              <p>Les documents pédagogiques seront ajoutés ici.</p>
              <p>Aucun document PDF n'est encore disponible.</p>
            </>
          )}

          {onglet === "Profil" && (
            <>
              <h1>Mon profil étudiant</h1>
              <article style={article}>
                <p>Prénom : {profil.prenom || "Non renseigné"}</p>
                <p>Nom : {profil.nom || "Non renseigné"}</p>
                <p>Email : {user.email}</p>
                <p>Identifiant : {user.uid}</p>
              </article>
            </>
          )}
        </section>
      </div>
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
  padding: "15px 20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const layout = {
  display: "flex",
  flexWrap: "wrap",
  gap: 15,
  padding: 15
};

const menu = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  width: 150
};

const menuButton = {
  padding: 12,
  border: "none",
  borderRadius: 8,
  textAlign: "left",
  cursor: "pointer"
};

const content = {
  flex: 1,
  minWidth: 260,
  background: "white",
  borderRadius: 12,
  padding: 20
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 12
};

const card = {
  background: "#f0fdfa",
  border: "1px solid #ccfbf1",
  padding: 15,
  borderRadius: 10,
  textAlign: "left",
  cursor: "pointer"
};

const article = {
  padding: 15,
  margin: "15px 0",
  background: "#f8fafc",
  borderRadius: 10,
  lineHeight: 1.6
};

const option = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: 13,
  margin: "8px 0",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  cursor: "pointer"
};

const action = {
  padding: 13,
  marginTop: 15,
  background: "#0f766e",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer"
};

const logout = {
  padding: 9,
  border: "none",
  borderRadius: 7,
  cursor: "pointer"
};
