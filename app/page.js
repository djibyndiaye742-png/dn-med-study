"use client";

import { useEffect, useMemo, useState } from "react";
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
  serverTimestamp,
  deleteDoc
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const ADMIN_EMAIL = "djibyndiaye742@gmail.com";

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

  const [cours, setCours] = useState([]);
  const [chargementCours, setChargementCours] = useState(false);
  const [rechercheCours, setRechercheCours] = useState("");
  const [filtreUniversite, setFiltreUniversite] = useState("Toutes");
  const [filtreNiveau, setFiltreNiveau] = useState("Tous");
  const [filtreMatiere, setFiltreMatiere] = useState("Toutes");

  const [theme, setTheme] = useState("light");
  const [couleur, setCouleur] = useState("blue");

  // Formulaire d'administration
  const [nouveauCours, setNouveauCours] = useState({
    titre: "",
    universite: "UCAD",
    filiere: "Médecine",
    niveau: "2e année",
    matiere: "",
    url: ""
  });

  const [publicationCours, setPublicationCours] = useState(false);
  const [messageAdmin, setMessageAdmin] = useState("");

  const estAdmin =
    user?.email?.toLowerCase() === ADMIN_EMAIL;

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
    if (savedColor && colors[savedColor]) {
      setCouleur(savedColor);
    }
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
          setNom(
            profil.data().prenom ||
            u.displayName ||
            "Étudiant"
          );
        }

        await Promise.all([
          chargerHistorique(u.uid),
          chargerCours()
        ]);
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
      const ref = collection(
        db,
        "users",
        uid,
        "resultats"
      );

      const q = query(
        ref,
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);

      setHistorique(
        snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data()
        }))
      );
    } catch (e) {
      console.error("Erreur historique :", e);
    } finally {
      setChargementHistorique(false);
    }
  }

  async function chargerCours() {
    setChargementCours(true);

    try {
      const snapshot = await getDocs(
        collection(db, "cours")
      );

      const elements = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      setCours(elements);
      setErreur("");
    } catch (e) {
      console.error("Erreur bibliothèque :", e);
      setErreur(
        "Impossible de charger la bibliothèque. Vérifie les règles Firestore."
      );
    } finally {
      setChargementCours(false);
    }
  }

  // Publication d'un cours par l'administrateur
  async function publierCours(e) {
    e.preventDefault();
    setMessageAdmin("");

    if (!estAdmin) {
      setMessageAdmin(
        "Accès réservé à l'administrateur."
      );
      return;
    }

    const {
      titre,
      universite,
      filiere,
      niveau,
      matiere,
      url
    } = nouveauCours;

    if (
      !titre.trim() ||
      !matiere.trim() ||
      !url.trim()
    ) {
      setMessageAdmin(
        "Remplis le titre, la matière et le lien PDF."
      );
      return;
    }

    try {
      new URL(url);

      if (!url.startsWith("https://")) {
        throw new Error("Lien HTTPS obligatoire");
      }
    } catch {
      setMessageAdmin(
        "Entre un lien PDF valide commençant par https://"
      );
      return;
    }

    setPublicationCours(true);

    try {
      await addDoc(collection(db, "cours"), {
        titre: titre.trim(),
        universite,
        filiere,
        niveau,
        matiere: matiere.trim(),
        url: url.trim(),
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      setNouveauCours({
        titre: "",
        universite: "UCAD",
        filiere: "Médecine",
        niveau: "2e année",
        matiere: "",
        url: ""
      });

      setMessageAdmin(
        "Cours publié avec succès. Il est maintenant visible dans la bibliothèque."
      );

      await chargerCours();
    } catch (e) {
      console.error(e);

      setMessageAdmin(
        "Publication impossible. Vérifie les règles Firestore et le lien."
      );
    } finally {
      setPublicationCours(false);
    }
  }

  // Suppression d'un cours par l'administrateur
  async function supprimerCours(id) {
    if (
      !estAdmin ||
      !window.confirm(
        "Supprimer définitivement ce cours de la bibliothèque ?"
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, "cours", id));

      setCours((ancien) =>
        ancien.filter((c) => c.id !== id)
      );

      setMessageAdmin("Cours supprimé.");
    } catch (e) {
      console.error(e);

      setMessageAdmin(
        "Suppression impossible. Vérifie les règles Firestore."
      );
    }
  }

  async function deconnexion() {
    await signOut(auth);
    router.replace("/connexion");
  }

  async function analyser(type) {
    setErreur("");

    if (!fichier) {
      setErreur(
        "Sélectionne d'abord un cours au format PDF."
      );
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
        throw new Error(
          data.error || "Erreur pendant l'analyse."
        );
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

      const ref = collection(
        db,
        "users",
        user.uid,
        "resultats"
      );

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

      setSection(type);
    } catch (e) {
      console.error(e);
      setErreur(
        e.message || "Une erreur est survenue."
      );
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

    const d = date?.toDate
      ? date.toDate()
      : new Date(date);

    if (Number.isNaN(d.getTime())) {
      return "Date inconnue";
    }

    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  function changerSection(id) {
    setSection(id);
    setResultatActuel(null);
    setMenuOuvert(false);
    setErreur("");
  }

  function copierResultat() {
    if (!resultatActuel?.contenu) return;

    navigator.clipboard.writeText(
      resultatActuel.contenu
    );

    alert("Contenu copié !");
  }

  function selectionnerCoursBibliotheque(item) {
    const url =
      item.url ||
      item.pdfUrl ||
      item.fichierUrl ||
      item.lien;

    if (!url) {
      setErreur(
        "Ce cours ne possède pas encore de lien PDF."
      );
      return;
    }

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  const compteurs = {
    resume: historique.filter(
      (x) => x.type === "resume"
    ).length,

    qcm: historique.filter(
      (x) => x.type === "qcm"
    ).length,

    flashcards: historique.filter(
      (x) => x.type === "flashcards"
    ).length
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

  const contenusSection = historique.filter(
    (item) => item.type === section
  );

  const universites = useMemo(
    () => [
      ...new Set(
        cours
          .map((c) => c.universite || c.university)
          .filter(Boolean)
      )
    ],
    [cours]
  );

  const niveaux = useMemo(
    () => [
      ...new Set(
        cours
          .map((c) => c.niveau || c.level)
          .filter(Boolean)
      )
    ],
    [cours]
  );

  const matieres = useMemo(
    () => [
      ...new Set(
        cours
          .map((c) => c.matiere || c.subject)
          .filter(Boolean)
      )
    ],
    [cours]
  );

  const coursFiltres = useMemo(() => {
    return cours.filter((c) => {
      const titre = c.titre || c.title || "";
      const matiere = c.matiere || c.subject || "";
      const universite =
        c.universite || c.university || "";
      const niveau = c.niveau || c.level || "";

      const recherche =
        rechercheCours.toLowerCase();

      const correspondRecherche =
        titre.toLowerCase().includes(recherche) ||
        matiere.toLowerCase().includes(recherche) ||
        universite.toLowerCase().includes(recherche);

      const correspondUniversite =
        filtreUniversite === "Toutes" ||
        universite === filtreUniversite;

      const correspondNiveau =
        filtreNiveau === "Tous" ||
        niveau === filtreNiveau;

      const correspondMatiere =
        filtreMatiere === "Toutes" ||
        matiere === filtreMatiere;

      return (
        correspondRecherche &&
        correspondUniversite &&
        correspondNiveau &&
        correspondMatiere
      );
    });
  }, [
    cours,
    rechercheCours,
    filtreUniversite,
    filtreNiveau,
    filtreMatiere
  ]);

  if (chargement) {
    return (
      <main className="loading-screen">
        <div className="loading-logo">DN</div>
        <p>Préparation de ton espace médical...</p>
      </main>
    );
  }

  if (!user) return null;

  const fieldStyle = {
    width: "100%",
    padding: 12,
    border: `1px solid ${styles.border}`,
    borderRadius: 10,
    background: styles.surface,
    color: styles.text,
    marginBottom: 10
  };

  const panelStyle = {
    background: styles.surface,
    border: `1px solid ${styles.border}`,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20
  };

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
        button, input, textarea, select { font: inherit; }
        button { cursor: pointer; }

        .app-shell {
          min-height: 100vh;
          display: flex;
          background: var(--bg);
          color: var(--text);
          font-family: Inter, system-ui, sans-serif;
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
        }

        .brand-name { font-size: 16px; font-weight: 850; }
        .brand-sub { font-size: 11px; color: var(--muted); margin-top: 3px; }
        .nav-label {
          color: var(--muted);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.4px;
          padding: 12px;
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
        }

        .nav-button:hover {
          background: var(--bg);
          color: var(--text);
        }

        .nav-button.active {
          background: color-mix(in srgb, var(--primary), transparent 90%);
          color: var(--primary);
        }

        .nav-icon {
          width: 21px;
          text-align: center;
          font-size: 19px;
        }

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
        }

        .welcome-tag {
          font-size: 10px;
          letter-spacing: 1.7px;
          font-weight: 800;
          opacity: .8;
          text-transform: uppercase;
        }

        .welcome h1 {
          font-size: clamp(25px, 3vw, 35px);
          margin: 13px 0 8px;
        }

        .welcome p {
          font-size: 13px;
          opacity: .85;
          margin: 0;
          line-height: 1.7;
          max-width: 520px;
        }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 32px 0 16px;
        }

        .section-heading h2 { font-size: 17px; margin: 0; }
        .section-heading p { font-size: 12px; color: var(--muted); margin: 5px 0 0; }

        .stats-grid, .tools-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 15px;
        }

        .stat-card, .panel, .tool-card, .history-card, .course-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 17px;
          padding: 20px;
        }

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

        .tool-card:hover, .course-card:hover {
          transform: translateY(-2px);
          border-color: var(--primary);
        }

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
        }

        .primary-button:disabled { opacity: .5; cursor: not-allowed; }

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
        }

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

        .library-filters {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 10px;
          margin-bottom: 18px;
        }

        .course-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .course-card h3 { font-size: 14px; margin: 12px 0 8px; }
        .course-card p { font-size: 11px; color: var(--muted); margin: 5px 0; }
        .course-card .primary-button { margin-top: 14px; }

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
          .library-filters { grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 560px) {
          .welcome { padding: 25px 21px; }
          .tools-grid, .course-grid { grid-template-columns: 1fr; }
          .stats-grid { gap: 10px; }
          .stat-card { padding: 15px; }
          .stat-number { font-size: 24px; }
          .content { padding: 18px 13px; }
          .top-title { font-size: 13px; }
          .top-subtitle { font-size: 10px; }
          .history-card { align-items: flex-start; }
          .setting-row { align-items: flex-start; flex-direction: column; }
          .library-filters { grid-template-columns: 1fr; }
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
              <div className="profile-role">
                {estAdmin ? "Administrateur" : "Espace étudiant"}
              </div>
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
              <div className="top-subtitle">
                Ton espace intelligent de médecine
              </div>
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

          {/* TABLEAU DE BORD */}

          {section === "dashboard" && (
            <>
              <section className="welcome">
                <div className="welcome-tag">
                  DN Med Study · Ton espace personnel
                </div>

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
                    <span className="stat-icon">{icon}</span>
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

                      <span style={{ color: styles.primary }}>
                        Ouvrir →
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* BIBLIOTHÈQUE ET ADMINISTRATION */}

          {section === "courses" && (
            <>
              <div className="section-heading">
                <div>
                  <h2>Bibliothèque des cours</h2>
                  <p>
                    Retrouve les cours partagés par les étudiants.
                  </p>
                </div>

                <button
                  className="secondary-button"
                  onClick={chargerCours}
                  disabled={chargementCours}
                >
                  {chargementCours ? "Actualisation..." : "↻ Actualiser"}
                </button>
              </div>

              {/* FORMULAIRE ADMINISTRATEUR */}

              {estAdmin && (
                <section style={panelStyle}>
                  <h2 style={{ marginTop: 0, fontSize: 17 }}>
                    Administration · Ajouter un cours
                  </h2>

                  <p style={{ color: styles.muted, fontSize: 12 }}>
                    Ce formulaire publie une fiche et un lien PDF
                    dans la bibliothèque commune.
                  </p>

                  <form onSubmit={publierCours}>
                    <input
                      style={fieldStyle}
                      placeholder="Titre du cours"
                      value={nouveauCours.titre}
                      onChange={(e) =>
                        setNouveauCours({
                          ...nouveauCours,
                          titre: e.target.value
                        })
                      }
                      required
                    />

                    <div className="library-filters" style={{ marginBottom: 0 }}>
                      <select
                        style={fieldStyle}
                        value={nouveauCours.universite}
                        onChange={(e) =>
                          setNouveauCours({
                            ...nouveauCours,
                            universite: e.target.value
                          })
                        }
                      >
                        <option>UCAD</option>
                        <option>UGB</option>
                        <option>UASZ</option>
                        <option>UADB</option>
                        <option>Autre</option>
                      </select>

                      <select
                        style={fieldStyle}
                        value={nouveauCours.filiere}
                        onChange={(e) =>
                          setNouveauCours({
                            ...nouveauCours,
                            filiere: e.target.value
                          })
                        }
                      >
                        <option>Médecine</option>
                        <option>Pharmacie</option>
                        <option>Odontologie</option>
                        <option>Autre</option>
                      </select>

                      <select
                        style={fieldStyle}
                        value={nouveauCours.niveau}
                        onChange={(e) =>
                          setNouveauCours({
                            ...nouveauCours,
                            niveau: e.target.value
                          })
                        }
                      >
                        {[
                          "1re année",
                          "2e année",
                          "3e année",
                          "4e année",
                          "5e année",
                          "6e année",
                          "7e année",
                          "Autre"
                        ].map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>

                      <input
                        style={fieldStyle}
                        placeholder="Matière"
                        value={nouveauCours.matiere}
                        onChange={(e) =>
                          setNouveauCours({
                            ...nouveauCours,
                            matiere: e.target.value
                          })
                        }
                        required
                      />
                    </div>

                    <input
                      style={fieldStyle}
                      type="url"
                      placeholder="Lien PDF public (https://...)"
                      value={nouveauCours.url}
                      onChange={(e) =>
                        setNouveauCours({
                          ...nouveauCours,
                          url: e.target.value
                        })
                      }
                      required
                    />

                    <button
                      className="primary-button"
                      type="submit"
                      disabled={publicationCours}
                    >
                      {publicationCours
                        ? "Publication..."
                        : "Publier dans la bibliothèque"}
                    </button>
                  </form>

                  {messageAdmin && (
                    <p
                      role="status"
                      style={{
                        fontSize: 12,
                        marginBottom: 0,
                        color:
                          messageAdmin.includes("succès") ||
                          messageAdmin.includes("supprimé")
                            ? "#0c9b70"
                            : "#d97706"
                      }}
                    >
                      {messageAdmin}
                    </p>
                  )}
                </section>
              )}

              {/* FILTRES */}

              <div className="library-filters">
                <input
                  className="field"
                  placeholder="Rechercher un cours, une matière..."
                  value={rechercheCours}
                  onChange={(e) => setRechercheCours(e.target.value)}
                />

                <select
                  className="field"
                  value={filtreUniversite}
                  onChange={(e) => setFiltreUniversite(e.target.value)}
                >
                  <option value="Toutes">Toutes les universités</option>
                  {universites.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>

                <select
                  className="field"
                  value={filtreNiveau}
                  onChange={(e) => setFiltreNiveau(e.target.value)}
                >
                  <option value="Tous">Tous les niveaux</option>
                  {niveaux.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>

                <select
                  className="field"
                  value={filtreMatiere}
                  onChange={(e) => setFiltreMatiere(e.target.value)}
                >
                  <option value="Toutes">Toutes les matières</option>
                  {matieres.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>

              {chargementCours ? (
                <div className="empty">
                  Chargement de la bibliothèque...
                </div>
              ) : coursFiltres.length === 0 ? (
                <div className="empty">
                  <div style={{ fontSize: 30, marginBottom: 12 }}>
                    📚
                  </div>

                  <strong>Aucun cours trouvé.</strong>

                  <p>
                    La bibliothèque est vide ou aucun document
                    ne correspond à ta recherche.
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ color: styles.muted, fontSize: 12 }}>
                    {coursFiltres.length} cours disponible(s)
                  </p>

                  <div className="course-grid">
                    {coursFiltres.map((item) => (
                      <div className="course-card" key={item.id}>
                        <span className="stat-icon">📄</span>

                        <h3>
                          {item.titre || item.title || "Cours sans titre"}
                        </h3>

                        <p>
                          Université : {item.universite || item.university || "Non précisée"}
                        </p>

                        <p>
                          Filière : {item.filiere || item.track || "Non précisée"}
                        </p>

                        <p>
                          Niveau : {item.niveau || item.level || "Non précisé"}
                        </p>

                        <p>
                          Matière : {item.matiere || item.subject || "Non précisée"}
                        </p>

                        <button
                          className="primary-button"
                          onClick={() => selectionnerCoursBibliotheque(item)}
                        >
                          Ouvrir le PDF →
                        </button>

                        {estAdmin && (
                          <button
                            className="secondary-button"
                            style={{ marginLeft: 8 }}
                            onClick={() => supprimerCours(item.id)}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* IMPORTER UN PDF PERSONNEL */}

              <div className="section-heading">
                <div>
                  <h2>Importer mon propre cours</h2>
                  <p>
                    Sélectionne un PDF depuis ton appareil pour travailler
                    avec Gemini.
                  </p>
                </div>
              </div>

              <div className="upload-box">
                <div style={{ fontSize: 34 }}>📄</div>
                <h3>Ajouter un document PDF</h3>

                <p style={{ color: styles.muted, fontSize: 12 }}>
                  Ce document sera utilisé pour tes résumés, QCM,
                  flashcards et questions à l'IA.
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
                  <p>
                    Tes documents associés aux générations précédentes.
                  </p>
                </div>
              </div>

              {historique.length === 0 ? (
                <div className="empty">
                  Aucun document utilisé pour le moment.
                </div>
              ) : (
                <div className="history-list">
                  {[...new Set(historique.map((x) => x.fichier))]
                    .filter(Boolean)
                    .map((nomFichier) => (
                      <div className="history-card" key={nomFichier}>
                        <div>
                          <div className="history-title">
                            📄 {nomFichier}
                          </div>

                          <div className="history-meta">
                            {historique.filter(
                              (x) => x.fichier === nomFichier
                            ).length}
                            {" "}génération(s) associée(s)
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}

          {/* RÉSUMÉS, QCM ET FLASHCARDS */}

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
                  <div
                    className="section-heading"
                    style={{ marginTop: 0 }}
                  >
                    <div>
                      <h2>{resultatActuel.titre}</h2>
                      <p>{resultatActuel.fichier}</p>
                    </div>

                    <button
                      className="secondary-button"
                      onClick={copierResultat}
                    >
                      Copier
                    </button>
                  </div>

                  <div className="result-content">
                    {resultatActuel.contenu}
                  </div>
                </div>
              )}

              <div className="section-heading">
                <div>
                  <h2>Mes anciennes créations</h2>
                  <p>Ouvre un résultat pour le relire.</p>
                </div>
              </div>

              {chargementHistorique ? (
                <div className="empty">
                  Chargement de tes contenus...
                </div>
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
                        <div className="history-title">
                          {item.titre}
                        </div>

                        <div className="history-meta">
                          {item.fichier} · {formatDate(item.createdAt || item.date)}
                        </div>
                      </div>

                      <span style={{ color: styles.primary }}>
                        Consulter →
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ASSISTANT IA */}

          {section === "chat" && (
            <>
              <div className="section-heading">
                <div>
                  <h2>Ton tuteur médical intelligent</h2>
                  <p>
                    Pose une question à partir d'un cours PDF.
                  </p>
                </div>
              </div>

              <div className="panel">
                <h3 style={{ fontSize: 14 }}>
                  Document de référence
                </h3>

                <p style={{ fontSize: 12, color: styles.muted }}>
                  {fichier
                    ? fichier.name
                    : "Aucun PDF sélectionné"}
                </p>

                <button
                  className="secondary-button"
                  onClick={() => changerSection("courses")}
                >
                  Choisir un PDF
                </button>

                <h3 style={{ fontSize: 14, marginTop: 25 }}>
                  Ta question
                </h3>

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
                  {action === "chat"
                    ? "Réponse en cours..."
                    : "Envoyer ma question"}
                </button>
              </div>

              {contenusSection.length > 0 && (
                <>
                  <div className="section-heading">
                    <div>
                      <h2>Anciennes réponses</h2>
                      <p>
                        Retrouve tes précédentes conversations.
                      </p>
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

                        <span style={{ color: styles.primary }}>
                          Ouvrir →
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {resultatActuel?.type === "chat" && (
                <div className="result-panel">
                  <h2 style={{ fontSize: 16 }}>
                    Réponse de l'assistant
                  </h2>

                  <div className="result-content">
                    {resultatActuel.contenu}
                  </div>

                  <button
                    className="secondary-button"
                    onClick={copierResultat}
                  >
                    Copier la réponse
                  </button>
                </div>
              )}
            </>
          )}

          {/* PARAMÈTRES */}

          {section === "settings" && (
            <>
              <div className="section-heading">
                <div>
                  <h2>Personnalise ton espace</h2>
                  <p>
                    Adapte l'apparence de DN Med Study à tes préférences.
                  </p>
                </div>
              </div>

              <div className="panel">
                <div className="setting-row">
                  <div>
                    <div className="setting-title">
                      Thème de l'application
                    </div>

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
                    <div className="setting-title">
                      Couleur principale
                    </div>

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
                    <div className="setting-title">
                      Compte connecté
                    </div>

                    <div className="setting-description">
                      {user.email || "Compte étudiant"}
                    </div>
                  </div>

                  <button
                    className="secondary-button"
                    onClick={deconnexion}
                  >
                    Déconnexion
                  </button>
                </div>
              </div>
            </>
          )}

          {action && (
            <div className="result-panel">
              <strong>
                Gemini travaille sur ton cours...
              </strong>

              <p style={{ color: styles.muted, fontSize: 12 }}>
                La génération peut prendre quelques instants.
              </p>
            </div>
          )}

          {erreur && (
            <div className="error-box">
              Erreur : {erreur}
            </div>
          )}

          <div
            style={{
              textAlign: "center",
              padding: "35px 10px 15px",
              color: styles.muted,
              fontSize: 10
            }}
          >
            DN Med Study · La connaissance au service de la santé.
          </div>
        </div>
      </div>
    </main>
  );
    }
