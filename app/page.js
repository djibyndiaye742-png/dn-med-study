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

const sections = [
  { id: "dashboard", label: "Tableau de bord", icon: "⌂" },
  { id: "courses", label: "Mes cours", icon: "▤" },
  { id: "resume", label: "Mes résumés", icon: "▧" },
  { id: "qcm", label: "Mes QCM", icon: "☷" },
  { id: "flashcards", label: "Flashcards", icon: "▣" },
  { id: "chat", label: "Assistant IA", icon: "✧" },
  { id: "settings", label: "Paramètres", icon: "⚙" }
];

const colors = {
  blue: "#3978f6",
  violet: "#7956e8",
  teal: "#0c9b91",
  rose: "#e65b83"
};

export default function Home() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [nom, setNom] = useState("Étudiant");
  const [chargement, setChargement] = useState(true);
  const [menuOuvert, setMenuOuvert] = useState(false);

  const [section, setSection] = useState("dashboard");
  const [fichier, setFichier] = useState(null);
  const [action, setAction] = useState("");
  const [question, setQuestion] = useState("");
  const [erreur, setErreur] = useState("");

  const [historique, setHistorique] = useState([]);
  const [resultatActuel, setResultatActuel] = useState(null);
  const [chargementHistorique, setChargementHistorique] = useState(false);

  const [theme, setTheme] = useState("light");
  const [couleur, setCouleur] = useState("blue");

  const couleurPrincipale = colors[couleur] || colors.blue;
  const sombre = theme === "dark";

  const styles = {
    background: sombre ? "#101522" : "#f5f7fb",
    surface: sombre ? "#192235" : "#ffffff",
    text: sombre ? "#f1f5fb" : "#172033",
    muted: sombre ? "#a3afc2" : "#758198",
    border: sombre ? "#2c3950" : "#e8edf5",
    primary: couleurPrincipale
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("dn-theme");
    const savedColor = localStorage.getItem("dn-color");

    if (savedTheme) setTheme(savedTheme);
    if (savedColor && colors[savedColor]) setCouleur(savedColor);
  }, []);

  useEffect(() => {
    localStorage.setItem("dn-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("dn-color", couleur);
  }, [couleur]);

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

        await chargerHistorique(u.uid);
      } catch (e) {
        console.error("Erreur de chargement :", e);
      }

      setChargement(false);
    });

    return () => unsubscribe();
  }, [router]);

  async function chargerHistorique(uid) {
    setChargementHistorique(true);

    try {
      const ref = collection(db, "users", uid, "resultats");
      const q = query(ref, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const elements = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      setHistorique(elements);
    } catch (e) {
      console.error("Erreur historique :", e);
    } finally {
      setChargementHistorique(false);
    }
  }

  async function deconnexion() {
    await signOut(auth);
    router.replace("/connexion");
  }

  async function analyser(type) {
    setErreur("");

    if (!fichier) {
      setErreur("Sélectionne d'abord un cours au format PDF.");
      return;
    }

    if (type === "chat" && !question.trim()) {
      setErreur("Écris d'abord ta question.");
      return;
    }

    setAction(type);
    setResultatActuel(null);

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

      const titres = {
        resume: "Résumé du cours",
        qcm: "QCM du cours",
        flashcards: "Flashcards du cours",
        chat: "Réponse de l'assistant"
      };

      const nouveauResultat = {
        type,
        titre: titres[type],
        contenu: data.resultat,
        fichier: fichier.name,
        question: type === "chat" ? question : "",
        date: new Date().toISOString()
      };

      // Sauvegarde permanente dans Firestore
      const ref = collection(db, "users", user.uid, "resultats");

      const docRef = await addDoc(ref, {
        ...nouveauResultat,
        createdAt: serverTimestamp()
      });

      const resultatEnregistre = {
        ...nouveauResultat,
        id: docRef.id
      };

      setResultatActuel(resultatEnregistre);
      setHistorique((ancien) => [
        resultatEnregistre,
        ...ancien
      ]);

      const destinations = {
        resume: "resume",
        qcm: "qcm",
        flashcards: "flashcards",
        chat: "chat"
      };

      setSection(destinations[type]);
    } catch (e) {
      console.error(e);
      setErreur(e.message || "Une erreur est survenue.");
    } finally {
      setAction("");
    }
  }

  function ouvrirResultat(item) {
    setResultatActuel(item);
    setSection(item.type);
    setMenuOuvert(false);
  }

  function formatDate(date) {
    if (!date) return "Date inconnue";

    const d = date?.toDate ? date.toDate() : new Date(date);

    if (Number.isNaN(d.getTime())) return "Date inconnue";

    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  const compteurs = {
    resume: historique.filter((x) => x.type === "resume").length,
    qcm: historique.filter((x) => x.type === "qcm").length,
    flashcards: historique.filter((x) => x.type === "flashcards").length
  };

  const titres = {
    dashboard: "Tableau de bord",
    courses: "Mes cours",
    resume: "Mes résumés",
    qcm: "Mes QCM",
    flashcards: "Mes flashcards",
    chat: "Assistant médical IA",
    settings: "Paramètres"
  };

  function changerSection(id) {
    setSection(id);
    setResultatActuel(null);
    setMenuOuvert(false);
    setErreur("");
  }

  function copierResultat() {
    if (!resultatActuel?.contenu) return;

    navigator.clipboard.writeText(resultatActuel.contenu);
    alert("Contenu copié !");
  }

  if (chargement) {
    return (
      <main className="loading-screen">
        <div className="loading-logo">DN</div>
        <p>Préparation de ton espace médical...</p>
      </main>
    );
  }

  if (!user) return null;

  const contenusSection = historique.filter(
    (item) => item.type === section
  );

  return (
    <main
      className="app-shell"
      style={{
        "--primary": styles.primary,
        "--bg": styles.background,
        "--surface": styles.surface,
        "--text": styles.text,
        "--muted": styles.muted,
        "--border": styles.border
      }}
    >
      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        button, input, textarea { font: inherit; }
        button { cursor: pointer; }

        .app-shell {
          min-height: 100vh;
          display: flex;
          background: var(--bg);
          color: var(--text);
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }

        .sidebar {
          width: 255px;
          min-width: 255px;
          background: var(--surface);
          border-right: 1px solid var(--border);
          padding: 25px 17px;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          position: sticky;
          top: 0;
          height: 100vh;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 8px 30px;
        }

        .brand-icon, .loading-logo {
          width: 43px;
          height: 43px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: var(--primary);
          color: white;
          font-weight: 900;
          letter-spacing: -1px;
          box-shadow: 0 7px 18px color-mix(in srgb, var(--primary), transparent 70%);
        }

        .brand-name { font-size: 16px; font-weight: 850; }
        .brand-sub { font-size: 11px; color: var(--muted); margin-top: 3px; }

        .nav-label {
          color: var(--muted);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.4px;
          padding: 12px 12px;
          text-transform: uppercase;
        }

        .nav-button {
          border: 0;
          background: transparent;
          color: var(--muted);
          padding: 12px 13px;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 13px;
          border-radius: 11px;
          text-align: left;
          font-size: 13px;
          font-weight: 650;
          margin: 3px 0;
          transition: .2s ease;
        }

        .nav-button:hover { background: var(--bg); color: var(--text); }
        .nav-button.active { background: color-mix(in srgb, var(--primary), transparent 90%); color: var(--primary); }
        .nav-icon { width: 21px; text-align: center; font-size: 19px; }

        .sidebar-bottom { margin-top: auto; }
        .profile-mini {
          display: flex;
          align-items: center;
          gap: 10px;
          border-top: 1px solid var(--border);
          padding: 18px 5px 5px;
          margin-top: 20px;
        }

        .avatar {
          width: 37px;
          height: 37px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: color-mix(in srgb, var(--primary), transparent 86%);
          color: var(--primary);
          font-weight: 800;
        }

        .profile-name { font-size: 12px; font-weight: 750; }
        .profile-role { font-size: 10px; color: var(--muted); margin-top: 3px; }

        .main-area { flex: 1; min-width: 0; }
        .topbar {
          height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 34px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .top-title { font-size: 15px; font-weight: 800; }
        .top-subtitle { font-size: 11px; color: var(--muted); margin-top: 4px; }

        .top-actions { display: flex; gap: 10px; align-items: center; }
        .icon-button {
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          border-radius: 11px;
          width: 39px;
          height: 39px;
          font-size: 17px;
        }

        .content {
          max-width: 1250px;
          margin: auto;
          padding: 35px;
        }

        .welcome {
          border-radius: 22px;
          padding: 34px;
          background: linear-gradient(115deg, var(--primary), #2345a7);
          color: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 15px 35px color-mix(in srgb, var(--primary), transparent 78%);
        }

        .welcome:after {
          content: "✚";
          position: absolute;
          right: 45px;
          top: -35px;
          font-size: 180px;
          opacity: .09;
        }

        .welcome-tag {
          font-size: 10px;
          letter-spacing: 1.7px;
          font-weight: 800;
          opacity: .8;
          text-transform: uppercase;
        }

        .welcome h1 { font-size: clamp(25px, 3vw, 35px); margin: 13px 0 8px; letter-spacing: -1.2px; }
        .welcome p { font-size: 13px; opacity: .85; margin: 0; line-height: 1.7; max-width: 520px; }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 32px 0 16px;
        }

        .section-heading h2 { font-size: 17px; margin: 0; letter-spacing: -.3px; }
        .section-heading p { font-size: 12px; color: var(--muted); margin: 5px 0 0; }

        .stats-grid, .tools-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 15px;
        }

        .stat-card, .panel, .tool-card, .history-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 17px;
          padding: 20px;
          box-shadow: 0 4px 16px #15233b05;
        }

        .stat-top { display: flex; justify-content: space-between; align-items: center; }
        .stat-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: color-mix(in srgb, var(--primary), transparent 90%);
          color: var(--primary);
          font-size: 18px;
        }

        .stat-number { font-size: 28px; font-weight: 850; margin-top: 18px; }
        .stat-label { color: var(--muted); font-size: 12px; margin-top: 4px; }

        .tools-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .tool-card { transition: .2s ease; }
        .tool-card:hover { transform: translateY(-3px); border-color: var(--primary); }
        .tool-card h3 { font-size: 15px; margin: 14px 0 7px; }
        .tool-card p { font-size: 12px; line-height: 1.6; color: var(--muted); margin: 0 0 15px; }

        .primary-button {
          border: 0;
          background: var(--primary);
          color: white;
          border-radius: 10px;
          padding: 11px 16px;
          font-size: 12px;
          font-weight: 750;
          transition: .2s;
        }

        .primary-button:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .primary-button:disabled { opacity: .5; cursor: not-allowed; transform: none; }

        .secondary-button {
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 700;
        }

        .upload-box {
          border: 1.5px dashed var(--border);
          border-radius: 16px;
          padding: 25px;
          text-align: center;
          background: var(--surface);
        }

        .upload-box input { max-width: 100%; margin-top: 15px; font-size: 12px; }
        .field {
          width: 100%;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          border-radius: 11px;
          padding: 13px;
          outline: none;
        }

        .field:focus { border-color: var(--primary); }
        textarea.field { min-height: 115px; resize: vertical; }

        .history-list { display: grid; gap: 12px; }
        .history-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          cursor: pointer;
          transition: .2s;
        }

        .history-card:hover { border-color: var(--primary); transform: translateY(-1px); }
        .history-title { font-size: 13px; font-weight: 750; }
        .history-meta { color: var(--muted); font-size: 11px; margin-top: 6px; }

        .result-panel {
          margin-top: 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 17px;
          padding: 25px;
        }

        .result-content {
          white-space: pre-wrap;
          line-height: 1.85;
          font-size: 13px;
          overflow-wrap: anywhere;
          margin: 22px 0;
        }

        .error-box {
          padding: 14px;
          border-radius: 11px;
          background: #fee2e2;
          color: #991b1b;
          font-size: 12px;
          margin: 15px 0;
        }

        .empty {
          padding: 45px 20px;
          text-align: center;
          border: 1px dashed var(--border);
          border-radius: 16px;
          color: var(--muted);
          font-size: 13px;
        }

        .setting-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 17px 0;
          border-bottom: 1px solid var(--border);
        }

        .setting-title { font-size: 13px; font-weight: 750; }
        .setting-description { font-size: 11px; color: var(--muted); margin-top: 5px; }

        .color-options { display: flex; gap: 10px; flex-wrap: wrap; }
        .color-dot {
          width: 29px;
          height: 29px;
          border-radius: 50%;
          border: 3px solid var(--surface);
          outline: 1px solid var(--border);
        }

        .loading-screen {
          min-height: 100vh;
          display: grid;
          place-content: center;
          justify-items: center;
          gap: 14px;
          background: #f5f7fb;
          color: #475569;
          font-family: system-ui;
        }

        .loading-logo { width: 55px; height: 55px; font-size: 19px; }

        .mobile-menu { display: none; }

        @media (max-width: 850px) {
          .sidebar {
            position: fixed;
            z-index: 30;
            left: -270px;
            top: 0;
            transition: left .25s ease;
            box-shadow: 15px 0 40px #00000015;
          }

          .sidebar.open { left: 0; }
          .mobile-menu { display: inline-grid; place-items: center; }
          .topbar { padding: 0 18px; height: 67px; }
          .content { padding: 22px 17px; }
          .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 560px) {
          .welcome { padding: 25px 21px; }
          .welcome:after { right: 8px; font-size: 115px; }
          .tools-grid { grid-template-columns: 1fr; }
          .stats-grid { gap: 10px; }
          .stat-card { padding: 15px; }
          .stat-number { font-size: 24px; }
          .content { padding: 18px 13px; }
          .top-title { font-size: 13px; }
          .top-subtitle { font-size: 10px; }
          .history-card { align-items: flex-start; }
          .setting-row { align-items: flex-start; flex-direction: column; }
        }
      `}</style>

      {menuOuvert && (
        <div
          onClick={() => setMenuOuvert(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "#0008",
            zIndex: 20
          }}
        />
      )}

      <aside className={`sidebar ${menuOuvert ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">DN</div>
          <div>
            <div className="brand-name">DN Med Study</div>
            <div className="brand-sub">Medical learning platform</div>
          </div>
        </div>

        <div className="nav-label">Espace de travail</div>

        {sections.map((item) => (
          <button
            key={item.id}
            className={`nav-button ${section === item.id ? "active" : ""}`}
            onClick={() => changerSection(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="profile-mini">
            <div className="avatar">
              {(nom || "E").charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="profile-name">{nom}</div>
              <div className="profile-role">Espace étudiant</div>
            </div>
          </div>

          <button className="nav-button" onClick={deconnexion}>
            <span className="nav-icon">↪</span>
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <button
              className="icon-button mobile-menu"
              onClick={() => setMenuOuvert(true)}
              aria-label="Ouvrir le menu"
            >
              ☰
            </button>
            <div>
              <div className="top-title">{titres[section]}</div>
              <div className="top-subtitle">Ton espace intelligent de médecine</div>
            </div>
          </div>

          <div className="top-actions">
            <button
              className="icon-button"
              onClick={() => setTheme(sombre ? "light" : "dark")}
              title="Changer le thème"
            >
              {sombre ? "☀" : "☾"}
            </button>
            <button
              className="icon-button"
              onClick={() => changerSection("settings")}
              title="Paramètres"
            >
              ⚙
            </button>
          </div>
        </header>

        <div className="content">
          {section === "dashboard" && (
            <>
              <section className="welcome">
                <div className="welcome-tag">DN Med Study · Ton espace personnel</div>
                <h1>Bienvenue, {nom} 👋</h1>
                <p>
                  Apprends, comprends et révise tes cours de médecine
                  avec ton assistant intelligent.
                </p>
              </section>

              <div className="section-heading">
                <div>
                  <h2>Ton activité</h2>
                  <p>Retrouve tes contenus générés.</p>
                </div>
              </div>

              <div className="stats-grid">
                {[
                  ["▧", compteurs.resume, "Résumés créés"],
                  ["☷", compteurs.qcm, "QCM générés"],
                  ["▣", compteurs.flashcards, "Flashcards créées"]
                ].map(([icon, number, label]) => (
                  <div className="stat-card" key={label}>
                    <div className="stat-top">
                      <span className="stat-icon">{icon}</span>
                    </div>
                    <div className="stat-number">{number}</div>
                    <div className="stat-label">{label}</div>
                  </div>
                ))}
              </div>

              <div className="section-heading">
                <div>
                  <h2>Outils d'apprentissage</h2>
                  <p>Choisis ce que tu souhaites travailler.</p>
                </div>
              </div>

              <div className="tools-grid">
                {[
                  ["▧", "Générer un résumé", "Comprends ton cours avec une synthèse structurée.", "resume"],
                  ["☷", "Créer des QCM", "Teste tes connaissances et consulte les corrections.", "qcm"],
                  ["▣", "Créer des flashcards", "Mémorise les notions essentielles du cours.", "flashcards"],
                  ["✧", "Assistant médical IA", "Pose tes questions et approfondis tes connaissances.", "chat"]
                ].map(([icon, title, description, destination]) => (
                  <div className="tool-card" key={destination}>
                    <span className="stat-icon">{icon}</span>
                    <h3>{title}</h3>
                    <p>{description}</p>
                    <button
                      className="primary-button"
                      onClick={() => changerSection(destination)}
                    >
                      Ouvrir l'outil →
                    </button>
                  </div>
                ))}
              </div>

              <div className="section-heading">
                <div>
                  <h2>Activité récente</h2>
                  <p>Tes dernières générations.</p>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => changerSection("courses")}
                >
                  Voir mes cours
                </button>
              </div>

              {historique.length === 0 ? (
                <div className="empty">
                  Tes premières créations apparaîtront ici.
                </div>
              ) : (
                <div className="history-list">
                  {historique.slice(0, 4).map((item) => (
                    <div
                      className="history-card"
                      key={item.id}
                      onClick={() => ouvrirResultat(item)}
                    >
                      <div>
                        <div className="history-title">{item.titre}</div>
                        <div className="history-meta">
                          {item.fichier} · {formatDate(item.createdAt || item.date)}
                        </div>
                      </div>
                      <span style={{ color: styles.primary }}>Ouvrir →</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {section === "courses" && (
            <>
              <div className="section-heading">
                <div>
                  <h2>Importer un cours</h2>
                  <p>Sélectionne un PDF pour travailler avec Gemini.</p>
                </div>
              </div>

              <div className="upload-box">
                <div style={{ fontSize: 34 }}>📄</div>
                <h3>Ajouter un document PDF</h3>
                <p style={{ color: styles.muted, fontSize: 12 }}>
                  Sélectionne un cours depuis ton appareil.
                </p>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => {
                    setFichier(e.target.files?.[0] || null);
                    setErreur("");
                  }}
                />
                {fichier && (
                  <p style={{ color: styles.primary, fontSize: 12 }}>
                    Document sélectionné : {fichier.name}
                  </p>
                )}
              </div>

              <div className="section-heading">
                <div>
                  <h2>Documents déjà utilisés</h2>
                  <p>Les documents associés à tes générations précédentes.</p>
                </div>
              </div>

              {historique.length === 0 ? (
                <div className="empty">Aucun document utilisé pour le moment.</div>
              ) : (
                <div className="history-list">
                  {[...new Set(historique.map((x) => x.fichier))]
                    .filter(Boolean)
                    .map((nomFichier) => (
                      <div className="history-card" key={nomFichier}>
                        <div>
                          <div className="history-title">📄 {nomFichier}</div>
                          <div className="history-meta">
                            {historique.filter((x) => x.fichier === nomFichier).length} génération(s) associée(s)
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}

          {["resume", "qcm", "flashcards"].includes(section) && (
            <>
              <div className="section-heading">
                <div>
                  <h2>
                    {section === "resume" && "Bibliothèque de résumés"}
                    {section === "qcm" && "Bibliothèque de QCM"}
                    {section === "flashcards" && "Bibliothèque de flashcards"}
                  </h2>
                  <p>
                    Tes anciennes créations restent disponibles ici.
                  </p>
                </div>
              </div>

              <div className="panel">
                <h3 style={{ marginTop: 0, fontSize: 15 }}>
                  Générer un nouveau contenu
                </h3>
                <p style={{ color: styles.muted, fontSize: 12 }}>
                  {fichier
                    ? `Document sélectionné : ${fichier.name}`
                    : "Choisis d'abord un document PDF dans Mes cours."}
                </p>

                <button
                  className="secondary-button"
                  onClick={() => changerSection("courses")}
                >
                  Choisir un cours PDF
                </button>

                <button
                  className="primary-button"
                  style={{ marginLeft: 10 }}
                  disabled={!!action}
                  onClick={() => analyser(section)}
                >
                  {action === section
                    ? "Génération en cours..."
                    : section === "resume"
                    ? "Générer un résumé"
                    : section === "qcm"
                    ? "Générer des QCM"
                    : "Créer des flashcards"}
                </button>
              </div>

              {resultatActuel?.type === section && (
                <div className="result-panel">
                  <div className="section-heading" style={{ marginTop: 0 }}>
                    <div>
                      <h2>{resultatActuel.titre}</h2>
                      <p>{resultatActuel.fichier}</p>
                    </div>
                    <button className="secondary-button" onClick={copierResultat}>
                      Copier
                    </button>
                  </div>
                  <div className="result-content">{resultatActuel.contenu}</div>
                </div>
              )}

              <div className="section-heading">
                <div>
                  <h2>Mes anciennes créations</h2>
                  <p>Ouvre un résultat pour le relire.</p>
                </div>
              </div>

              {chargementHistorique ? (
                <div className="empty">Chargement de tes contenus...</div>
              ) : contenusSection.length === 0 ? (
                <div className="empty">
                  Aucun contenu enregistré dans cette rubrique.
                </div>
              ) : (
                <div className="history-list">
                  {contenusSection.map((item) => (
                    <div
                      className="history-card"
                      key={item.id}
                      onClick={() => ouvrirResultat(item)}
                    >
                      <div>
                        <div className="history-title">{item.titre}</div>
                        <div className="history-meta">
                          {item.fichier} · {formatDate(item.createdAt || item.date)}
                        </div>
                      </div>
                      <span style={{ color: styles.primary }}>Consulter →</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {section === "chat" && (
            <>
              <div className="section-heading">
                <div>
                  <h2>Ton tuteur médical intelligent</h2>
                  <p>Pose une question à partir d'un cours PDF.</p>
                </div>
              </div>

              <div className="panel">
                <h3 style={{ fontSize: 14 }}>Document de référence</h3>
                <p style={{ fontSize: 12, color: styles.muted }}>
                  {fichier ? fichier.name : "Aucun PDF sélectionné"}
                </p>
                <button
                  className="secondary-button"
                  onClick={() => changerSection("courses")}
                >
                  Choisir un PDF
                </button>

                <h3 style={{ fontSize: 14, marginTop: 25 }}>Ta question</h3>
                <textarea
                  className="field"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Exemple : explique-moi le mécanisme de la respiration..."
                />

                <button
                  className="primary-button"
                  style={{ marginTop: 13 }}
                  disabled={!!action}
                  onClick={() => analyser("chat")}
                >
                  {action === "chat" ? "Réponse en cours..." : "Envoyer ma question"}
                </button>
              </div>

              {contenusSection.length > 0 && (
                <>
                  <div className="section-heading">
                    <div>
                      <h2>Anciennes réponses</h2>
                      <p>Retrouve tes précédentes conversations.</p>
                    </div>
                  </div>
                  <div className="history-list">
                    {contenusSection.map((item) => (
                      <div
                        className="history-card"
                        key={item.id}
                        onClick={() => ouvrirResultat(item)}
                      >
                        <div>
                          <div className="history-title">
                            {item.question || item.titre}
                          </div>
                          <div className="history-meta">
                            {item.fichier} · {formatDate(item.createdAt || item.date)}
                          </div>
                        </div>
                        <span style={{ color: styles.primary }}>Ouvrir →</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {resultatActuel?.type === "chat" && (
                <div className="result-panel">
                  <h2 style={{ fontSize: 16 }}>Réponse de l'assistant</h2>
                  <div className="result-content">{resultatActuel.contenu}</div>
                  <button className="secondary-button" onClick={copierResultat}>
                    Copier la réponse
                  </button>
                </div>
              )}
            </>
          )}

          {section === "settings" && (
            <>
              <div className="section-heading">
                <div>
                  <h2>Personnalise ton espace</h2>
                  <p>Adapte l'apparence de DN Med Study à tes préférences.</p>
                </div>
              </div>

              <div className="panel">
                <div className="setting-row">
                  <div>
                    <div className="setting-title">Thème de l'application</div>
                    <div className="setting-description">
                      Choisis entre le mode clair et le mode sombre.
                    </div>
                  </div>
                  <button
                    className="secondary-button"
                    onClick={() => setTheme(sombre ? "light" : "dark")}
                  >
                    {sombre ? "☀ Mode clair" : "☾ Mode sombre"}
                  </button>
                </div>

                <div className="setting-row">
                  <div>
                    <div className="setting-title">Couleur principale</div>
                    <div className="setting-description">
                      Personnalise la couleur de ton interface.
                    </div>
                  </div>
                  <div className="color-options">
                    {Object.entries(colors).map(([key, value]) => (
                      <button
                        key={key}
                        className="color-dot"
                        style={{ background: value }}
                        onClick={() => setCouleur(key)}
                        title={key}
                        aria-label={`Choisir la couleur ${key}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="setting-row">
                  <div>
                    <div className="setting-title">Compte connecté</div>
                    <div className="setting-description">
                      {user.email || "Compte étudiant"}
                    </div>
                  </div>
                  <button className="secondary-button" onClick={deconnexion}>
                    Déconnexion
                  </button>
                </div>
              </div>
            </>
          )}

          {action && (
            <div className="result-panel">
              <strong>Gemini travaille sur ton cours...</strong>
              <p style={{ color: styles.muted, fontSize: 12 }}>
                La génération peut prendre quelques instants.
              </p>
            </div>
          )}

          {erreur && <div className="error-box">Erreur : {erreur}</div>}

          <div style={{
            textAlign: "center",
            padding: "35px 10px 15px",
            color: styles.muted,
            fontSize: 10
          }}>
            DN Med Study · Apprendre, comprendre et progresser.
          </div>
        </div>
      </div>
    </main>
  );
      }
