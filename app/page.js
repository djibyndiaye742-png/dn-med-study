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
  { id: "courses", label: "Bibliothèque des cours", icon: "📚" },
  { id: "exams", label: "Anciens examens", icon: "📝" },
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

const niveauxDisponibles = [
  "1re année",
  "2e année",
  "3e année",
  "4e année",
  "5e année",
  "6e année",
  "7e année"
];

const formulaireVide = {
  universite: "UCAD",
  filiere: "Médecine",
  niveau: "2e année"
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
  const [matieres, setMatieres] = useState([]);
  const [examens, setExamens] = useState([]);

  const [chargementCours, setChargementCours] = useState(false);
  const [chargementExamens, setChargementExamens] = useState(false);

  const [rechercheCours, setRechercheCours] = useState("");
  const [filtreUniversite, setFiltreUniversite] = useState("Toutes");
  const [filtreNiveau, setFiltreNiveau] = useState("Tous");
  const [matiereSelectionnee, setMatiereSelectionnee] = useState("");

  const [rechercheExamen, setRechercheExamen] = useState("");
  const [filtreNiveauExamen, setFiltreNiveauExamen] = useState("Tous");

  const [theme, setTheme] = useState("light");
  const [couleur, setCouleur] = useState("blue");

  const [nouvelleMatiere, setNouvelleMatiere] = useState({
    ...formulaireVide,
    nom: ""
  });

  const [nouveauCours, setNouveauCours] = useState({
    ...formulaireVide,
    titre: "",
    matiere: "",
    url: ""
  });

  const [nouvelExamen, setNouvelExamen] = useState({
    ...formulaireVide,
    titre: "",
    matiere: "",
    annee: "",
    sujetUrl: "",
    correctionUrl: ""
  });

  const [publication, setPublication] = useState(false);
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
          setNom(
            profil.data().prenom ||
            u.displayName ||
            "Étudiant"
          );
        }

        await Promise.all([
          chargerHistorique(u.uid),
          chargerCours(),
          chargerMatieres(),
          chargerExamens()
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
      const ref = collection(db, "users", uid, "resultats");
      const q = query(ref, orderBy("createdAt", "desc"));
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
      const snapshot = await getDocs(collection(db, "cours"));

      setCours(
        snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data()
        }))
      );

      setErreur("");
    } catch (e) {
      console.error("Erreur cours :", e);
      setErreur("Impossible de charger les cours. Vérifie les règles Firestore.");
    } finally {
      setChargementCours(false);
    }
  }

  async function chargerMatieres() {
    try {
      const snapshot = await getDocs(collection(db, "matieres"));

      setMatieres(
        snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data()
        }))
      );
    } catch (e) {
      console.error("Erreur matières :", e);
    }
  }

  async function chargerExamens() {
    setChargementExamens(true);

    try {
      const snapshot = await getDocs(collection(db, "examens"));

      setExamens(
        snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data()
        }))
      );
    } catch (e) {
      console.error("Erreur examens :", e);
    } finally {
      setChargementExamens(false);
    }
  }

  function lienValide(lien) {
    try {
      return new URL(lien).protocol === "https:";
    } catch {
      return false;
    }
  }

  async function publierMatiere(e) {
    e.preventDefault();
    setMessageAdmin("");

    if (!estAdmin) return;

    if (!nouvelleMatiere.nom.trim()) {
      setMessageAdmin("Saisis le nom de la matière.");
      return;
    }

    setPublication(true);

    try {
      await addDoc(collection(db, "matieres"), {
        ...nouvelleMatiere,
        nom: nouvelleMatiere.nom.trim(),
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      setNouvelleMatiere({
        ...formulaireVide,
        nom: ""
      });

      setMessageAdmin("Matière ajoutée avec succès !");
      await chargerMatieres();
    } catch (e) {
      console.error(e);
      setMessageAdmin("Impossible d'ajouter cette matière. Vérifie les règles Firestore.");
    } finally {
      setPublication(false);
    }
  }

  async function publierCours(e) {
    e.preventDefault();
    setMessageAdmin("");

    if (!estAdmin) return;

    const { titre, matiere, url } = nouveauCours;

    if (!titre.trim() || !matiere.trim() || !url.trim()) {
      setMessageAdmin("Complète le titre, la matière et le lien PDF.");
      return;
    }

    if (!lienValide(url)) {
      setMessageAdmin("Le lien PDF doit être une adresse HTTPS valide.");
      return;
    }

    setPublication(true);

    try {
      await addDoc(collection(db, "cours"), {
        ...nouveauCours,
        titre: titre.trim(),
        matiere: matiere.trim(),
        url: url.trim(),
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      setNouveauCours({
        ...formulaireVide,
        titre: "",
        matiere: "",
        url: ""
      });

      setMessageAdmin("Cours publié avec succès !");
      await chargerCours();
    } catch (e) {
      console.error(e);
      setMessageAdmin("Publication impossible. Vérifie les règles Firestore.");
    } finally {
      setPublication(false);
    }
  }

  async function publierExamen(e) {
    e.preventDefault();
    setMessageAdmin("");

    if (!estAdmin) return;

    const {
      titre,
      matiere,
      annee,
      sujetUrl,
      correctionUrl
    } = nouvelExamen;

    if (!titre.trim() || !matiere.trim() || !annee || !sujetUrl.trim()) {
      setMessageAdmin("Complète le titre, la matière, l'année et le sujet.");
      return;
    }

    if (!lienValide(sujetUrl)) {
      setMessageAdmin("Le lien du sujet doit être une adresse HTTPS valide.");
      return;
    }

    if (correctionUrl && !lienValide(correctionUrl)) {
      setMessageAdmin("Le lien de correction doit être une adresse HTTPS valide.");
      return;
    }

    setPublication(true);

    try {
      await addDoc(collection(db, "examens"), {
        ...nouvelExamen,
        titre: titre.trim(),
        matiere: matiere.trim(),
        annee: String(annee),
        sujetUrl: sujetUrl.trim(),
        correctionUrl: correctionUrl.trim(),
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      setNouvelExamen({
        ...formulaireVide,
        titre: "",
        matiere: "",
        annee: "",
        sujetUrl: "",
        correctionUrl: ""
      });

      setMessageAdmin("Examen publié avec succès !");
      await chargerExamens();
    } catch (e) {
      console.error(e);
      setMessageAdmin("Publication impossible. Vérifie les règles Firestore.");
    } finally {
      setPublication(false);
    }
  }

  async function supprimerDocument(collectionName, id, message) {
    if (!estAdmin) return;

    if (!window.confirm(message)) return;

    try {
      await deleteDoc(doc(db, collectionName, id));

      if (collectionName === "cours") {
        setCours((ancien) => ancien.filter((x) => x.id !== id));
      }

      if (collectionName === "matieres") {
        setMatieres((ancien) => ancien.filter((x) => x.id !== id));
      }

      if (collectionName === "examens") {
        setExamens((ancien) => ancien.filter((x) => x.id !== id));
      }

      setMessageAdmin("Suppression effectuée.");
    } catch (e) {
      console.error(e);
      setMessageAdmin("Suppression impossible. Vérifie les règles Firestore.");
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
      setHistorique((ancien) => [resultatEnregistre, ...ancien]);
      setSection(type);
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

  function changerSection(id) {
    setSection(id);
    setResultatActuel(null);
    setMenuOuvert(false);
    setErreur("");
    setMessageAdmin("");
    setMatiereSelectionnee("");
  }

  function copierResultat() {
    if (!resultatActuel?.contenu) return;

    navigator.clipboard.writeText(resultatActuel.contenu);
    alert("Contenu copié !");
  }

  function ouvrirPDF(url) {
    if (!url) {
      setErreur("Aucun lien PDF disponible.");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  const compteurs = {
    resume: historique.filter((x) => x.type === "resume").length,
    qcm: historique.filter((x) => x.type === "qcm").length,
    flashcards: historique.filter((x) => x.type === "flashcards").length
  };

  const titres = {
    dashboard: "Tableau de bord",
    courses: "Bibliothèque des cours",
    exams: "Anciens examens",
    resume: "Mes résumés",
    qcm: "Mes QCM",
    flashcards: "Mes flashcards",
    chat: "Assistant médical IA",
    settings: "Paramètres"
  };

  const contenusSection = historique.filter((item) => item.type === section);

  const universites = useMemo(
    () => [...new Set(cours.map((c) => c.universite).filter(Boolean))],
    [cours]
  );

  const niveaux = useMemo(
    () => [...new Set(cours.map((c) => c.niveau).filter(Boolean))],
    [cours]
  );

  const coursFiltres = useMemo(() => {
    return cours.filter((c) => {
      const texte = `${c.titre || ""} ${c.matiere || ""} ${c.universite || ""}`.toLowerCase();

      return (
        texte.includes(rechercheCours.toLowerCase()) &&
        (filtreUniversite === "Toutes" || c.universite === filtreUniversite) &&
        (filtreNiveau === "Tous" || c.niveau === filtreNiveau) &&
        (!matiereSelectionnee || c.matiere === matiereSelectionnee)
      );
    });
  }, [cours, rechercheCours, filtreUniversite, filtreNiveau, matiereSelectionnee]);

  const examensFiltres = examens.filter((e) => {
    const texte = `${e.titre || ""} ${e.matiere || ""} ${e.universite || ""} ${e.annee || ""}`.toLowerCase();

    return (
      texte.includes(rechercheExamen.toLowerCase()) &&
      (filtreNiveauExamen === "Tous" || e.niveau === filtreNiveauExamen)
    );
  });

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

  if (chargement) {
    return (
      <main className="loading-screen">
        <div className="loading-logo">DN</div>
        <p>Préparation de ton espace médical...</p>
      </main>
    );
  }

  if (!user) return null;

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

        .nav-button:hover { background: var(--bg); color: var(--text); }
        .nav-button.active {
          background: color-mix(in srgb, var(--primary), transparent 90%);
          color: var(--primary);
        }

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

        .content { max-width: 1250px; margin: auto; padding: 35px; }

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

        .welcome h1 { font-size: clamp(25px, 3vw, 35px); margin: 13px 0 8px; }
        .welcome p { font-size: 13px; opacity: .85; margin: 0; line-height: 1.7; max-width: 600px; }

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
          grid-template-columns: 2fr 1fr 1fr;
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
        .course-card button { margin-top: 12px; }

        .subject-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 13px;
          margin: 15px 0 25px;
        }

        .subject-card {
          border: 1px solid var(--border);
          background: var(--surface);
          border-radius: 15px;
          padding: 17px;
          text-align: left;
          color: var(--text);
        }

        .subject-card.selected {
          border: 2px solid var(--primary);
          background: color-mix(in srgb, var(--primary), transparent 94%);
        }

        .subject-card strong { display: block; font-size: 13px; margin: 9px 0 5px; }
        .subject-card small { color: var(--muted); font-size: 11px; }

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
          .subject-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
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
          .library-filters, .subject-grid { grid-template-columns: 1fr; }
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
                  DN Med Study · Plateforme médicale
                </div>

                <h1>Bienvenue, {nom} 👋</h1>

                <p>
                  Tous tes cours de médecine, anciens examens et outils
                  intelligents réunis dans un seul espace.
                </p>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
                  <button
                    className="primary-button"
                    style={{ background: "white", color: "#2345a7" }}
                    onClick={() => changerSection("courses")}
                  >
                    Explorer les cours →
                  </button>

                  <button
                    className="secondary-button"
                    style={{ background: "transparent", color: "white", borderColor: "#ffffff80" }}
                    onClick={() => changerSection("exams")}
                  >
                    Anciens examens
                  </button>
                </div>
              </section>

              <div className="section-heading">
                <div>
                  <h2>La bibliothèque médicale</h2>
                  <p>Explore les ressources disponibles sur la plateforme.</p>
                </div>
              </div>

              <div className="stats-grid">
                {[
                  ["📚", cours.length, "Cours disponibles"],
                  ["📖", matieres.length, "Matières enregistrées"],
                  ["📝", examens.length, "Anciens examens"]
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
                  <h2>Tes outils d'apprentissage</h2>
                  <p>Travaille tes cours avec l'intelligence artificielle.</p>
                </div>
              </div>

              <div className="tools-grid">
                {[
                  ["▧", "Générer un résumé", "Obtiens une synthèse structurée de ton cours.", "resume"],
                  ["☷", "Créer des QCM", "Teste tes connaissances et révise.", "qcm"],
                  ["▣", "Créer des flashcards", "Mémorise les notions essentielles.", "flashcards"],
                  ["✧", "Assistant médical IA", "Pose tes questions sur tes cours.", "chat"]
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
                  <h2>Ton activité récente</h2>
                  <p>Tes dernières générations.</p>
                </div>
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

          {/* BIBLIOTHÈQUE DES COURS */}

          {section === "courses" && (
            <>
              <section className="welcome">
                <div className="welcome-tag">DN MED STUDY · RESSOURCES</div>
                <h1>Bibliothèque des cours</h1>
                <p>
                  Retrouve les supports de cours classés par matière,
                  université et niveau d'études.
                </p>
              </section>

              {estAdmin && (
                <>
                  <div className="section-heading">
                    <div>
                      <h2>Espace administrateur</h2>
                      <p>Organise les matières et publie les supports de cours.</p>
                    </div>
                  </div>

                  <section style={panelStyle}>
                    <h3 style={{ marginTop: 0 }}>1. Créer une matière</h3>

                    <form onSubmit={publierMatiere}>
                      <input
                        className="field"
                        placeholder="Nom de la matière : Anatomie, Physiologie..."
                        value={nouvelleMatiere.nom}
                        onChange={(e) =>
                          setNouvelleMatiere({ ...nouvelleMatiere, nom: e.target.value })
                        }
                        required
                      />

                      <div className="library-filters">
                        <select
                          className="field"
                          value={nouvelleMatiere.universite}
                          onChange={(e) =>
                            setNouvelleMatiere({ ...nouvelleMatiere, universite: e.target.value })
                          }
                        >
                          <option>UCAD</option>
                          <option>UGB</option>
                          <option>UASZ</option>
                          <option>UADB</option>
                          <option>Autre</option>
                        </select>

                        <select
                          className="field"
                          value={nouvelleMatiere.filiere}
                          onChange={(e) =>
                            setNouvelleMatiere({ ...nouvelleMatiere, filiere: e.target.value })
                          }
                        >
                          <option>Médecine</option>
                          <option>Pharmacie</option>
                          <option>Odontologie</option>
                          <option>Autre</option>
                        </select>

                        <select
                          className="field"
                          value={nouvelleMatiere.niveau}
                          onChange={(e) =>
                            setNouvelleMatiere({ ...nouvelleMatiere, niveau: e.target.value })
                          }
                        >
                          {niveauxDisponibles.map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                      </div>

                      <button className="primary-button" disabled={publication}>
                        {publication ? "Enregistrement..." : "+ Créer la matière"}
                      </button>
                    </form>

                    <h3 style={{ fontSize: 14, marginTop: 25 }}>
                      Matières enregistrées ({matieres.length})
                    </h3>

                    {matieres.length === 0 ? (
                      <p style={{ color: styles.muted, fontSize: 12 }}>
                        Tu n'as pas encore créé de matière.
                      </p>
                    ) : (
                      <div className="history-list">
                        {matieres.map((m) => (
                          <div className="history-card" key={m.id} style={{ cursor: "default" }}>
                            <div>
                              <div className="history-title">{m.nom}</div>
                              <div className="history-meta">
                                {m.universite} · {m.filiere} · {m.niveau}
                              </div>
                            </div>

                            <button
                              className="secondary-button"
                              onClick={() =>
                                supprimerDocument("matieres", m.id, "Supprimer cette matière ?")
                              }
                            >
                              Supprimer
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section style={panelStyle}>
                    <h3 style={{ marginTop: 0 }}>2. Ajouter un cours à une matière</h3>

                    <form onSubmit={publierCours}>
                      <input
                        className="field"
                        placeholder="Titre du cours"
                        value={nouveauCours.titre}
                        onChange={(e) =>
                          setNouveauCours({ ...nouveauCours, titre: e.target.value })
                        }
                        required
                      />

                      <input
                        className="field"
                        list="liste-matieres-cours"
                        placeholder="Matière : Anatomie, Physiologie..."
                        value={nouveauCours.matiere}
                        onChange={(e) =>
                          setNouveauCours({ ...nouveauCours, matiere: e.target.value })
                        }
                        required
                      />

                      <datalist id="liste-matieres-cours">
                        {matieres.map((m) => <option key={m.id} value={m.nom} />)}
                      </datalist>

                      <div className="library-filters">
                        <select
                          className="field"
                          value={nouveauCours.universite}
                          onChange={(e) =>
                            setNouveauCours({ ...nouveauCours, universite: e.target.value })
                          }
                        >
                          <option>UCAD</option>
                          <option>UGB</option>
                          <option>UASZ</option>
                          <option>UADB</option>
                          <option>Autre</option>
                        </select>

                        <select
                          className="field"
                          value={nouveauCours.filiere}
                          onChange={(e) =>
                            setNouveauCours({ ...nouveauCours, filiere: e.target.value })
                          }
                        >
                          <option>Médecine</option>
                          <option>Pharmacie</option>
                          <option>Odontologie</option>
                          <option>Autre</option>
                        </select>

                        <select
                          className="field"
                          value={nouveauCours.niveau}
                          onChange={(e) =>
                            setNouveauCours({ ...nouveauCours, niveau: e.target.value })
                          }
                        >
                          {niveauxDisponibles.map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                      </div>

                      <input
                        className="field"
                        type="url"
                        placeholder="Lien PDF public (https://...)"
                        value={nouveauCours.url}
                        onChange={(e) =>
                          setNouveauCours({ ...nouveauCours, url: e.target.value })
                        }
                        required
                      />

                      <button className="primary-button" disabled={publication}>
                        {publication ? "Publication..." : "Publier le cours"}
                      </button>
                    </form>
                  </section>

                  {messageAdmin && (
                    <div className="error-box" style={{
                      background: messageAdmin.includes("succès") || messageAdmin.includes("effectuée") ? "#dcfce7" : "#fee2e2",
                      color: messageAdmin.includes("succès") || messageAdmin.includes("effectuée") ? "#166534" : "#991b1b"
                    }}>
                      {messageAdmin}
                    </div>
                  )}
                </>
              )}

              <div className="section-heading">
                <div>
                  <h2>Explorer les matières</h2>
                  <p>Choisis une matière pour afficher ses cours.</p>
                </div>
              </div>

              <div className="library-filters">
                <select
                  className="field"
                  value={filtreUniversite}
                  onChange={(e) => setFiltreUniversite(e.target.value)}
                >
                  <option value="Toutes">Toutes les universités</option>
                  {universites.map((u) => <option key={u}>{u}</option>)}
                </select>

                <select
                  className="field"
                  value={filtreNiveau}
                  onChange={(e) => setFiltreNiveau(e.target.value)}
                >
                  <option value="Tous">Tous les niveaux</option>
                  {niveaux.map((n) => <option key={n}>{n}</option>)}
                </select>

                <input
                  className="field"
                  placeholder="Rechercher une matière ou un cours..."
                  value={rechercheCours}
                  onChange={(e) => setRechercheCours(e.target.value)}
                />
              </div>

              <div className="subject-grid">
                <button
                  className={`subject-card ${!matiereSelectionnee ? "selected" : ""}`}
                  onClick={() => setMatiereSelectionnee("")}
                >
                  <span className="stat-icon">📚</span>
                  <strong>Toutes les matières</strong>
                  <small>{cours.length} cours au total</small>
                </button>

                {matieres
                  .filter((m) =>
                    (filtreUniversite === "Toutes" || m.universite === filtreUniversite) &&
                    (filtreNiveau === "Tous" || m.niveau === filtreNiveau)
                  )
                  .map((m) => {
                    const nombre = cours.filter((c) =>
                      c.matiere === m.nom &&
                      (filtreUniversite === "Toutes" || c.universite === filtreUniversite) &&
                      (filtreNiveau === "Tous" || c.niveau === filtreNiveau)
                    ).length;

                    return (
                      <button
                        key={m.id}
                        className={`subject-card ${matiereSelectionnee === m.nom ? "selected" : ""}`}
                        onClick={() => setMatiereSelectionnee(m.nom)}
                      >
                        <span className="stat-icon">📖</span>
                        <strong>{m.nom}</strong>
                        <small>{m.niveau} · {nombre} cours</small>
                      </button>
                    );
                  })}
              </div>

              <div className="section-heading">
                <div>
                  <h2>
                    {matiereSelectionnee ? `Cours : ${matiereSelectionnee}` : "Tous les cours"}
                  </h2>
                  <p>{coursFiltres.length} document(s) disponible(s).</p>
                </div>

                <button
                  className="secondary-button"
                  onClick={() => {
                    chargerCours();
                    chargerMatieres();
                  }}
                >
                  ↻ Actualiser
                </button>
              </div>

              {chargementCours ? (
                <div className="empty">Chargement des cours...</div>
              ) : coursFiltres.length === 0 ? (
                <div className="empty">
                  <div style={{ fontSize: 35 }}>📚</div>
                  <h3>Aucun cours disponible dans cette sélection.</h3>
                  <p>Les documents ajoutés par l'administrateur apparaîtront ici.</p>
                </div>
              ) : (
                <div className="course-grid">
                  {coursFiltres.map((item) => (
                    <div className="course-card" key={item.id}>
                      <span className="stat-icon">📄</span>
                      <h3>{item.titre || "Cours sans titre"}</h3>
                      <p>Matière : {item.matiere || "Non précisée"}</p>
                      <p>Université : {item.universite || "Non précisée"}</p>
                      <p>Filière : {item.filiere || "Non précisée"}</p>
                      <p>Niveau : {item.niveau || "Non précisé"}</p>

                      <button
                        className="primary-button"
                        onClick={() => ouvrirPDF(item.url || item.pdfUrl || item.lien)}
                      >
                        Consulter le cours →
                      </button>

                      {estAdmin && (
                        <button
                          className="secondary-button"
                          style={{ marginLeft: 8 }}
                          onClick={() =>
                            supprimerDocument("cours", item.id, "Supprimer définitivement ce cours ?")
                          }
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="section-heading">
                <div>
                  <h2>Importer mon propre cours</h2>
                  <p>Choisis un PDF depuis ton appareil pour travailler avec l'IA.</p>
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
                  <p>Tes documents associés aux générations précédentes.</p>
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
                            {historique.filter((x) => x.fichier === nomFichier).length}
                            {" "}génération(s) associée(s)
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}

          {/* ANCIENS EXAMENS */}

          {section === "exams" && (
            <>
              <section className="welcome">
                <div className="welcome-tag">DN MED STUDY · PRÉPARATION</div>
                <h1>Anciens examens et corrections</h1>
                <p>
                  Entraîne-toi avec les anciens sujets et consulte
                  leurs corrections pour préparer tes évaluations.
                </p>
              </section>

              {estAdmin && (
                <section style={{ ...panelStyle, marginTop: 22 }}>
                  <h2 style={{ marginTop: 0 }}>Administration · Ajouter un examen</h2>
                  <p style={{ color: styles.muted, fontSize: 12 }}>
                    Ajoute le sujet PDF et, si disponible, sa correction.
                  </p>

                  <form onSubmit={publierExamen}>
                    <input
                      className="field"
                      placeholder="Titre de l'examen"
                      value={nouvelExamen.titre}
                      onChange={(e) =>
                        setNouvelExamen({ ...nouvelExamen, titre: e.target.value })
                      }
                      required
                    />

                    <input
                      className="field"
                      list="liste-matieres-examens"
                      placeholder="Matière"
                      value={nouvelExamen.matiere}
                      onChange={(e) =>
                        setNouvelExamen({ ...nouvelExamen, matiere: e.target.value })
                      }
                      required
                    />

                    <datalist id="liste-matieres-examens">
                      {matieres.map((m) => <option key={m.id} value={m.nom} />)}
                    </datalist>

                    <div className="library-filters">
                      <select
                        className="field"
                        value={nouvelExamen.universite}
                        onChange={(e) =>
                          setNouvelExamen({ ...nouvelExamen, universite: e.target.value })
                        }
                      >
                        <option>UCAD</option>
                        <option>UGB</option>
                        <option>UASZ</option>
                        <option>UADB</option>
                        <option>Autre</option>
                      </select>

                      <select
                        className="field"
                        value={nouvelExamen.filiere}
                        onChange={(e) =>
                          setNouvelExamen({ ...nouvelExamen, filiere: e.target.value })
                        }
                      >
                        <option>Médecine</option>
                        <option>Pharmacie</option>
                        <option>Odontologie</option>
                        <option>Autre</option>
                      </select>

                      <select
                        className="field"
                        value={nouvelExamen.niveau}
                        onChange={(e) =>
                          setNouvelExamen({ ...nouvelExamen, niveau: e.target.value })
                        }
                      >
                        {niveauxDisponibles.map((n) => <option key={n}>{n}</option>)}
                      </select>
                    </div>

                    <input
                      className="field"
                      type="number"
                      placeholder="Année de l'examen (ex. 2025)"
                      value={nouvelExamen.annee}
                      onChange={(e) =>
                        setNouvelExamen({ ...nouvelExamen, annee: e.target.value })
                      }
                      required
                    />

                    <input
                      className="field"
                      type="url"
                      placeholder="Lien HTTPS du sujet PDF"
                      value={nouvelExamen.sujetUrl}
                      onChange={(e) =>
                        setNouvelExamen({ ...nouvelExamen, sujetUrl: e.target.value })
                      }
                      required
                    />

                    <input
                      className="field"
                      type="url"
                      placeholder="Lien HTTPS de la correction PDF (facultatif)"
                      value={nouvelExamen.correctionUrl}
                      onChange={(e) =>
                        setNouvelExamen({ ...nouvelExamen, correctionUrl: e.target.value })
                      }
                    />

                    <button className="primary-button" disabled={publication}>
                      {publication ? "Publication..." : "Publier l'examen"}
                    </button>
                  </form>

                  {messageAdmin && (
                    <p style={{ color: styles.primary, fontSize: 12 }}>
                      {messageAdmin}
                    </p>
                  )}
                </section>
              )}

              <div className="section-heading">
                <div>
                  <h2>Consulter les examens</h2>
                  <p>{examensFiltres.length} examen(s) disponible(s).</p>
                </div>

                <button className="secondary-button" onClick={chargerExamens}>
                  ↻ Actualiser
                </button>
              </div>

              <div className="library-filters">
                <input
                  className="field"
                  placeholder="Rechercher une matière, une année..."
                  value={rechercheExamen}
                  onChange={(e) => setRechercheExamen(e.target.value)}
                />

                <select
                  className="field"
                  value={filtreNiveauExamen}
                  onChange={(e) => setFiltreNiveauExamen(e.target.value)}
                >
                  <option value="Tous">Tous les niveaux</option>
                  {niveauxDisponibles.map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>

              {chargementExamens ? (
                <div className="empty">Chargement des examens...</div>
              ) : examensFiltres.length === 0 ? (
                <div className="empty">
                  <div style={{ fontSize: 35 }}>📝</div>
                  <h3>Aucun ancien examen disponible</h3>
                  <p>Les sujets et corrections ajoutés apparaîtront ici.</p>
                </div>
              ) : (
                <div className="course-grid">
                  {examensFiltres.map((examen) => (
                    <div className="course-card" key={examen.id}>
                      <span className="stat-icon">📝</span>
                      <h3>{examen.titre}</h3>
                      <p>Matière : {examen.matiere}</p>
                      <p>Université : {examen.universite}</p>
                      <p>Filière : {examen.filiere}</p>
                      <p>Niveau : {examen.niveau}</p>
                      <p>Année : {examen.annee}</p>

                      <button
                        className="primary-button"
                        onClick={() => ouvrirPDF(examen.sujetUrl)}
                      >
                        Consulter le sujet →
                      </button>

                      {examen.correctionUrl ? (
                        <button
                          className="secondary-button"
                          style={{ marginLeft: 8 }}
                          onClick={() => ouvrirPDF(examen.correctionUrl)}
                        >
                          Voir la correction
                        </button>
                      ) : (
                        <p style={{ marginTop: 12 }}>Correction non disponible.</p>
                      )}

                      {estAdmin && (
                        <button
                          className="secondary-button"
                          onClick={() =>
                            supprimerDocument("examens", examen.id, "Supprimer cet examen ?")
                          }
                        >
                          Supprimer
                        </button>
                      )}
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
                  <p>Tes anciennes créations restent disponibles ici.</p>
                </div>
              </div>

              <div className="panel">
                <h3 style={{ marginTop: 0, fontSize: 15 }}>
                  Générer un nouveau contenu
                </h3>

                <p style={{ color: styles.muted, fontSize: 12 }}>
                  {fichier
                    ? `Document sélectionné : ${fichier.name}`
                    : "Choisis d'abord un document PDF dans la bibliothèque."}
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

          {/* ASSISTANT IA */}

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

          {/* PARAMÈTRES */}

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
