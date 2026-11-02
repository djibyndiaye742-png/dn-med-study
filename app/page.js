"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Home, BookOpen, Brain, ClipboardList, Sparkles,
  GraduationCap, Layers, FileText, Search, Plus, X,
  Menu, ChevronRight, ArrowLeft, Upload, ExternalLink,
  Trash2, Clock, FolderOpen, FilePlus2, Settings,
  LogOut, UserRound, LoaderCircle, Download,
  BookMarked, RefreshCw, Stethoscope, ShieldCheck,
  History, Bookmark, FileCheck, Eye, CheckCircle2
} from "lucide-react";

import {
  collection, addDoc, getDocs, deleteDoc, doc,
  query, orderBy, serverTimestamp, getDoc
} from "firebase/firestore";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";

import {
  getStorage, ref, uploadBytesResumable, getDownloadURL
} from "firebase/storage";

const storage = getStorage(auth.app);
const ADMIN_EMAIL = "djibyndiaye742@gmail.com";

const NAVIGATION = [
  { id: "home", label: "Accueil", icon: Home },
  { id: "courses", label: "Mes cours", icon: BookOpen },
  { id: "revision", label: "Réviser", icon: Brain },
  { id: "exams", label: "Examens", icon: ClipboardList },
  { id: "ai", label: "Assistant IA", icon: Sparkles }
];

const TOOLS = [
  {
    id: "qcm",
    title: "Générer des QCM",
    description: "Teste tes connaissances et évalue ton niveau.",
    icon: ClipboardList,
    color: "#2563EB",
    background: "#EAF1FF"
  },
  {
    id: "flashcards",
    title: "Flashcards",
    description: "Mémorise les notions essentielles.",
    icon: Layers,
    color: "#7C3AED",
    background: "#F1EAFE"
  },
  {
    id: "resume",
    title: "Résumés",
    description: "Transforme tes cours en fiches de révision.",
    icon: FileText,
    color: "#0891B2",
    background: "#E4F7FB"
  }
];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getCourseUrl(item) {
  return item.url || item.pdfUrl || item.fichierUrl || item.lien || "";
}

function formatDate(value) {
  if (!value) return "Date inconnue";

  const date = value?.toDate ? value.toDate() : new Date(value);

  if (Number.isNaN(date.getTime())) return "Date inconnue";

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

/* COMPOSANTS HORS DE HOMEPAGE
   Leur position évite de recréer les champs à chaque frappe
   et de faire disparaître le clavier du téléphone. */

function IconTile({ icon: Icon, color, background, size = 27 }) {
  return (
    <div className="icon-tile" style={{ color, background }}>
      <Icon size={size} strokeWidth={1.8} />
    </div>
  );
}

function SectionTitle({ eyebrow, title, description, action }) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={35} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || ""}
        required={required}
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Sélectionner</option>
        {options.map((option, index) => {
          const optionValue =
            typeof option === "string" ? option : option.value;

          const optionLabel =
            typeof option === "string" ? option : option.label;

          return (
            <option key={index} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* =====================================================
   APPLICATION DN MED STUDY
===================================================== */

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);

  const [active, setActive] = useState("home");
  const [mobileMenu, setMobileMenu] = useState(false);

  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [history, setHistory] = useState([]);

  const [search, setSearch] = useState("");
  const [filterUniversity, setFilterUniversity] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [modal, setModal] = useState("");
  const [busy, setBusy] = useState(false);
  const [dark, setDark] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [subjectForm, setSubjectForm] = useState({
    universite: "",
    filiere: "",
    niveau: "",
    semestre: "",
    nom: ""
  });

  const [courseForm, setCourseForm] = useState({
    titre: "",
    matiereId: "",
    url: "",
    description: ""
  });

  const [lessonFile, setLessonFile] = useState(null);

  const [examForm, setExamForm] = useState({
    titre: "",
    universite: "",
    filiere: "",
    niveau: "",
    semestre: "",
    matiere: "",
    annee: "",
    url: "",
    correctionUrl: ""
  });

  const [aiFile, setAiFile] = useState(null);
  const [aiResult, setAiResult] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAction, setAiAction] = useState("resume");

  const isAdmin =
    normalize(user?.email) === ADMIN_EMAIL.toLowerCase();

  const displayName =
    profile.prenom ||
    profile.firstName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Étudiant";

  const semesters = [
    "Premier semestre",
    "Deuxième semestre"
  ];

  /* AUTHENTIFICATION */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async currentUser => {
        if (!currentUser) {
          window.location.href = "/connexion";
          return;
        }

        setUser(currentUser);

        try {
          const profileSnap = await getDoc(
            doc(db, "users", currentUser.uid)
          );

          if (profileSnap.exists()) {
            setProfile(profileSnap.data());
          }
        } catch (error) {
          console.error("Erreur profil :", error);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  /* CHARGEMENT DES DONNÉES */

  async function chargerDonnees() {
    try {
      const [courseSnap, subjectSnap, examSnap] =
        await Promise.all([
          getDocs(collection(db, "cours")),
          getDocs(collection(db, "matieres")),
          getDocs(collection(db, "examens"))
        ]);

      setCourses(
        courseSnap.docs.map(item => ({
          id: item.id,
          ...item.data()
        }))
      );

      setSubjects(
        subjectSnap.docs.map(item => ({
          id: item.id,
          ...item.data()
        }))
      );

      setExams(
        examSnap.docs.map(item => ({
          id: item.id,
          ...item.data()
        }))
      );

      if (user?.uid) {
        const historyQuery = query(
          collection(db, "users", user.uid, "resultats"),
          orderBy("createdAt", "desc")
        );

        const historySnap = await getDocs(historyQuery);

        setHistory(
          historySnap.docs.map(item => ({
            id: item.id,
            ...item.data()
          }))
        );
      }
    } catch (error) {
      console.error("Chargement Firebase :", error);

      alert(
        "Impossible de charger certaines données : " +
        (error.message || "Erreur Firebase")
      );
    }
  }

  useEffect(() => {
    if (user?.uid) {
      chargerDonnees();
    }
  }, [user?.uid]);

  /* FILTRES */

  const universities = useMemo(() => {
    return [...new Set([
      ...courses.map(c => c.universite || c.university),
      ...subjects.map(s => s.universite)
    ].filter(Boolean))].sort();
  }, [courses, subjects]);

  const levels = useMemo(() => {
    return [...new Set([
      ...courses.map(c => c.niveau || c.level),
      ...subjects.map(s => s.niveau)
    ].filter(Boolean))].sort();
  }, [courses, subjects]);

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const text = normalize(search);

      const matchesSearch =
        !text ||
        normalize(course.titre || course.title).includes(text) ||
        normalize(course.matiere || course.subject).includes(text);

      const matchesUniversity =
        !filterUniversity ||
        (course.universite || course.university) === filterUniversity;

      const matchesLevel =
        !filterLevel ||
        (course.niveau || course.level) === filterLevel;

      const matchesSemester =
        !filterSemester ||
        course.semestre === filterSemester;

      return (
        matchesSearch &&
        matchesUniversity &&
        matchesLevel &&
        matchesSemester
      );
    });
  }, [
    courses,
    search,
    filterUniversity,
    filterLevel,
    filterSemester
  ]);

  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const text = normalize(search);

      return (
        (!text ||
          normalize(exam.titre).includes(text) ||
          normalize(exam.matiere).includes(text)) &&
        (!filterUniversity ||
          exam.universite === filterUniversity) &&
        (!filterLevel ||
          exam.niveau === filterLevel) &&
        (!filterSemester ||
          exam.semestre === filterSemester)
      );
    });
  }, [
    exams,
    search,
    filterUniversity,
    filterLevel,
    filterSemester
  ]);

  /* NAVIGATION */

  function navigate(id) {
    setActive(id);
    setMobileMenu(false);
    setSelectedSubject(null);
    setSearch("");
  }

  /* AJOUTER UNE MATIÈRE */

  async function ajouterMatiere(e) {
    e.preventDefault();

    if (!isAdmin) return;

    const universite = subjectForm.universite.trim();
    const filiere = subjectForm.filiere.trim();
    const niveau = subjectForm.niveau.trim();
    const semestre = subjectForm.semestre.trim();
    const nom = subjectForm.nom.trim();

    if (!universite || !filiere || !niveau || !semestre || !nom) {
      return alert("Complète tous les champs.");
    }

    setBusy(true);

    try {
      await addDoc(collection(db, "matieres"), {
        universite,
        filiere,
        niveau,
        semestre,
        nom,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      setSubjectForm({
        universite: "",
        filiere: "",
        niveau: "",
        semestre: "",
        nom: ""
      });

      setModal("");

      await chargerDonnees();

      alert("Matière enregistrée avec succès.");
    } catch (error) {
      console.error("Erreur ajout matière :", error);

      alert(
        `Enregistrement refusé : ${error.code || "erreur"} — ${
          error.message || "Vérifie les règles Firestore."
        }`
      );
    } finally {
      setBusy(false);
    }
  }

  /* ENVOI PDF AVEC PROGRESSION */

  function envoyerPDF(file, fileRef) {
    return new Promise((resolve, reject) => {
      setUploading(true);
      setUploadProgress(0);

      const uploadTask = uploadBytesResumable(
        fileRef,
        file,
        { contentType: "application/pdf" }
      );

      uploadTask.on(
        "state_changed",
        snapshot => {
          if (snapshot.totalBytes > 0) {
            const progress = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );

            setUploadProgress(progress);
          }
        },
        error => {
          setUploading(false);
          reject(error);
        },
        async () => {
          try {
            const url = await getDownloadURL(
              uploadTask.snapshot.ref
            );

            setUploadProgress(100);
            setUploading(false);
            resolve(url);
          } catch (error) {
            setUploading(false);
            reject(error);
          }
        }
      );
    });
  }

  /* PUBLIER UNE LEÇON */

  async function ajouterLecon(e) {
    e.preventDefault();

    if (!isAdmin) return;

    const subject = subjects.find(
      s => s.id === courseForm.matiereId
    );

    if (!subject) {
      return alert("Sélectionne une matière.");
    }

    const titre = courseForm.titre.trim();
    const lienExterne = courseForm.url.trim();

    if (!titre) {
      return alert("Ajoute le titre de la leçon.");
    }

    if (!lessonFile && !lienExterne) {
      return alert("Choisis un PDF ou ajoute un lien PDF.");
    }

    if (lessonFile) {
      const isPdf =
        lessonFile.type === "application/pdf" ||
        lessonFile.name.toLowerCase().endsWith(".pdf");

      if (!isPdf) {
        return alert("Le fichier doit être au format PDF.");
      }

      const maxSize = 50 * 1024 * 1024;

      if (lessonFile.size > maxSize) {
        return alert("Le PDF ne doit pas dépasser 50 Mo.");
      }
    }

    setBusy(true);
    setUploadProgress(0);

    try {
      let pdfUrl = lienExterne;

      if (lessonFile) {
        const safeName = lessonFile.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

        const fileRef = ref(
          storage,
          `cours/${user.uid}/${Date.now()}_${safeName}`
        );

        pdfUrl = await envoyerPDF(lessonFile, fileRef);
      }

      const payload = {
        titre,
        matiere: subject.nom,
        matiereId: subject.id,
        universite: subject.universite || "",
        filiere: subject.filiere || "",
        niveau: subject.niveau || "",
        semestre: subject.semestre || "",
        description: courseForm.description.trim(),
        url: pdfUrl,
        pdfUrl,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      };

      await addDoc(collection(db, "cours"), payload);

      setCourseForm({
        titre: "",
        matiereId: "",
        url: "",
        description: ""
      });

      setLessonFile(null);
      setUploadProgress(0);
      setModal("");

      await chargerDonnees();

      alert("Leçon publiée avec succès.");
    } catch (error) {
      console.error("Erreur publication PDF :", error);

      alert(
        `Publication refusée : ${error.code || "erreur"} — ${
          error.message || "Vérifie Firebase Storage et les règles."
        }`
      );
    } finally {
      setBusy(false);
      setUploading(false);
    }
  }

  /* AJOUTER UN EXAMEN */

  async function ajouterExamen(e) {
    e.preventDefault();

    if (!isAdmin) return;

    const titre = examForm.titre.trim();
    const matiere = examForm.matiere.trim();
    const url = examForm.url.trim();
    const correctionUrl = examForm.correctionUrl.trim();

    if (!titre || !matiere || !url) {
      return alert(
        "Le titre, la matière et le lien du sujet sont obligatoires."
      );
    }

    if (!url.startsWith("https://")) {
      return alert("Le lien du sujet doit commencer par https://");
    }

    if (
      correctionUrl &&
      !correctionUrl.startsWith("https://")
    ) {
      return alert(
        "Le lien de correction doit commencer par https://"
      );
    }

    setBusy(true);

    try {
      await addDoc(collection(db, "examens"), {
        ...examForm,
        titre,
        matiere,
        url,
        correctionUrl,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      setExamForm({
        titre: "",
        universite: "",
        filiere: "",
        niveau: "",
        semestre: "",
        matiere: "",
        annee: "",
        url: "",
        correctionUrl: ""
      });

      setModal("");

      await chargerDonnees();

      alert("Examen publié avec succès.");
    } catch (error) {
      console.error("Erreur ajout examen :", error);

      alert(
        `Enregistrement refusé : ${error.code || "erreur"} — ${
          error.message || "Vérifie les règles Firebase."
        }`
      );
    } finally {
      setBusy(false);
    }
  }

  /* SUPPRESSION */

  async function supprimerElement(collectionName, id) {
    if (!isAdmin) return;

    if (!confirm("Confirmer la suppression ?")) return;

    try {
      await deleteDoc(doc(db, collectionName, id));
      await chargerDonnees();
    } catch (error) {
      console.error("Erreur suppression :", error);
      alert(
        "Suppression impossible. Vérifie les règles Firebase."
      );
    }
  }

  /* OUVRIR UN COURS */

  function ouvrirCours(course) {
    const url = getCourseUrl(course);

    if (!url) {
      return alert("Aucun document disponible.");
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  /* ASSISTANT IA */

  async function lancerIA(e) {
    e.preventDefault();

    if (!aiFile) {
      return alert("Sélectionne un fichier PDF.");
    }

    setBusy(true);
    setAiResult("");

    try {
      const formData = new FormData();

      formData.append("fichier", aiFile);
      formData.append("action", aiAction);

      if (aiQuestion.trim()) {
        formData.append("question", aiQuestion.trim());
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

      const result =
        data.resultat ||
        data.result ||
        data.reponse ||
        data.text ||
        data.contenu ||
        JSON.stringify(data);

      setAiResult(result);

      if (user?.uid) {
        await addDoc(
          collection(db, "users", user.uid, "resultats"),
          {
            titre: aiFile.name,
            type: aiAction,
            resultat: result,
            createdAt: serverTimestamp()
          }
        );

        await chargerDonnees();
      }
    } catch (error) {
      console.error("Erreur assistant IA :", error);
      alert(
        error.message ||
        "Erreur pendant la préparation du contenu."
      );
    } finally {
      setBusy(false);
    }
  }

  /* HISTORIQUE ET COPIE */

  function ouvrirResultat(item) {
    setAiResult(item.resultat || item.contenu || "");
    setActive("ai");
  }

  async function copierResultat() {
    try {
      await navigator.clipboard.writeText(aiResult);
      alert("Résultat copié.");
    } catch {
      alert("Impossible de copier le résultat.");
    }
  }

  /* DÉCONNEXION */

  async function deconnexion() {
    try {
      await signOut(auth);
      window.location.href = "/connexion";
    } catch (error) {
      console.error("Erreur déconnexion :", error);
      alert("La déconnexion a échoué.");
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="brand-mark">DN</div>
        <LoaderCircle className="spin" size={28} />
        <p>Préparation de ton espace d'études...</p>
      </div>
    );
  }

  const actionLabels = {
    resume: "Préparation du résumé...",
    qcm: "Préparation des QCM...",
    flashcards: "Création des flashcards...",
    chat: "Recherche de la réponse..."
  };

  const availableSubjects = subjects.filter(subject =>
    (!filterUniversity ||
      subject.universite === filterUniversity) &&
    (!filterLevel ||
      subject.niveau === filterLevel) &&
    (!filterSemester ||
      subject.semestre === filterSemester)
  );

  const visibleCourses = selectedSubject
    ? filteredCourses.filter(course =>
        course.matiereId === selectedSubject.id ||
        (course.matiere || course.subject) === selectedSubject.nom
      )
    : filteredCourses;

  const pageTitle =
    NAVIGATION.find(item => item.id === active)?.label ||
    (active === "admin" ? "Administration" : "Paramètres");
    return (
    <main className={dark ? "app dark-mode" : "app"}>
      {/* BARRE LATÉRALE DESKTOP */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">DN</div>
          <div>
            <strong>DN MED STUDY</strong>
            <small>Plateforme médicale</small>
          </div>
        </div>

        <div className="sidebar-section-label">MENU PRINCIPAL</div>

        <nav className="sidebar-nav">
          {NAVIGATION.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                className={active === item.id ? "nav-item active" : "nav-item"}
                onClick={() => navigate(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {active === item.id && <ChevronRight size={17} />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-section-label">OUTILS DE RÉVISION</div>

        <div className="sidebar-tools">
          {TOOLS.map(tool => {
            const Icon = tool.icon;

            return (
              <button
                key={tool.id}
                type="button"
                className={active === tool.id ? "tool-nav active" : "tool-nav"}
                onClick={() => {
                  setActive("ai");
                  setAiAction(tool.id);
                }}
              >
                <Icon size={18} />
                <span>{tool.title}</span>
              </button>
            );
          })}
        </div>

        <div className="sidebar-bottom">
          {isAdmin && (
            <button
              type="button"
              className="nav-item"
              onClick={() => navigate("admin")}
            >
              <ShieldCheck size={19} />
              <span>Administration</span>
            </button>
          )}

          <button
            type="button"
            className={active === "settings" ? "nav-item active" : "nav-item"}
            onClick={() => navigate("settings")}
          >
            <Settings size={19} />
            <span>Paramètres</span>
          </button>

          <div className="user-card">
            <div className="user-avatar">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="user-info">
              <strong>{displayName}</strong>
              <small>{isAdmin ? "Administrateur" : "Étudiant"}</small>
            </div>
            <button
              type="button"
              className="logout-button"
              title="Déconnexion"
              onClick={deconnexion}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <section className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label="Ouvrir le menu"
            >
              {mobileMenu ? <X size={23} /> : <Menu size={23} />}
            </button>

            <div className="breadcrumb">
              <span>DN MED STUDY</span>
              <ChevronRight size={15} />
              <strong>{pageTitle}</strong>
            </div>
          </div>

          <div className="topbar-right">
            <span className="topbar-user">{displayName}</span>
            <div className="topbar-avatar">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        {/* MENU MOBILE */}
        {mobileMenu && (
          <>
            <div
              className="mobile-menu-backdrop"
              onClick={() => setMobileMenu(false)}
            />

            <div className="mobile-dropdown">
              <div className="mobile-dropdown-title">
                <div className="brand-mark">DN</div>
                <div>
                  <strong>DN MED STUDY</strong>
                  <small>Navigation</small>
                </div>
              </div>

              {NAVIGATION.map(item => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={active === item.id ? "mobile-nav-item active" : "mobile-nav-item"}
                    onClick={() => navigate(item.id)}
                  >
                    <Icon size={19} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="mobile-menu-divider" />

              <div className="mobile-menu-label">OUTILS</div>

              {TOOLS.map(tool => {
                const Icon = tool.icon;

                return (
                  <button
                    key={tool.id}
                    type="button"
                    className="mobile-nav-item"
                    onClick={() => {
                      setAiAction(tool.id);
                      navigate("ai");
                    }}
                  >
                    <Icon size={19} />
                    <span>{tool.title}</span>
                  </button>
                );
              })}

              <div className="mobile-menu-divider" />

              {isAdmin && (
                <button
                  type="button"
                  className="mobile-nav-item"
                  onClick={() => navigate("admin")}
                >
                  <ShieldCheck size={19} />
                  <span>Administration</span>
                </button>
              )}

              {/* PARAMÈTRES DANS LE MENU TROIS TIRETS */}
              <button
                type="button"
                className={active === "settings" ? "mobile-nav-item active" : "mobile-nav-item"}
                onClick={() => navigate("settings")}
              >
                <Settings size={19} />
                <span>Paramètres</span>
              </button>

              <button
                type="button"
                className="mobile-nav-item mobile-logout"
                onClick={deconnexion}
              >
                <LogOut size={19} />
                <span>Déconnexion</span>
              </button>
            </div>
          </>
        )}

        <div className="page-content">

          {/* ACCUEIL */}
          {active === "home" && (
            <>
              <div className="welcome-banner">
                <div className="welcome-content">
                  <span className="welcome-tag">
                    <Stethoscope size={15} /> ESPACE ÉTUDIANT EN MÉDECINE
                  </span>
                  <h1>Bienvenue, {displayName} 👋</h1>
                  <p>
                    Organise tes cours, prépare tes examens et progresse
                    dans tes études médicales.
                  </p>
                  <button
                    type="button"
                    className="welcome-button"
                    onClick={() => navigate("courses")}
                  >
                    Explorer mes cours <ChevronRight size={17} />
                  </button>
                </div>
                <div className="welcome-decoration">
                  <GraduationCap size={100} strokeWidth={1} />
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon blue"><BookOpen size={22} /></div>
                  <div>
                    <strong>{courses.length}</strong>
                    <span>Cours disponibles</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon purple"><Layers size={22} /></div>
                  <div>
                    <strong>{subjects.length}</strong>
                    <span>Matières</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon orange"><ClipboardList size={22} /></div>
                  <div>
                    <strong>{exams.length}</strong>
                    <span>Examens</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon green"><History size={22} /></div>
                  <div>
                    <strong>{history.length}</strong>
                    <span>Révisions effectuées</span>
                  </div>
                </div>
              </div>

              <SectionTitle
                eyebrow="APPRENTISSAGE"
                title="Tes outils de révision"
                description="Choisis un outil pour travailler efficacement."
              />

              <div className="tools-grid">
                {TOOLS.map(tool => {
                  const Icon = tool.icon;

                  return (
                    <button
                      type="button"
                      key={tool.id}
                      className="tool-card"
                      onClick={() => {
                        setAiAction(tool.id);
                        navigate("ai");
                      }}
                    >
                      <IconTile
                        icon={Icon}
                        color={tool.color}
                        background={tool.background}
                      />
                      <h3>{tool.title}</h3>
                      <p>{tool.description}</p>
                      <span className="tool-card-link">
                        Commencer <ChevronRight size={16} />
                      </span>
                    </button>
                  );
                })}
              </div>

              <SectionTitle
                eyebrow="RÉCEMMENT AJOUTÉS"
                title="Derniers cours"
                description="Retrouve rapidement les derniers documents publiés."
                action={
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => navigate("courses")}
                  >
                    Voir tout <ChevronRight size={16} />
                  </button>
                }
              />

              {courses.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="Aucun cours disponible"
                  description="Les cours publiés apparaîtront ici."
                />
              ) : (
                <div className="course-grid">
                  {courses.slice(0, 4).map(course => (
                    <article className="course-card" key={course.id}>
                      <div className="course-card-top">
                        <div className="course-file-icon">
                          <FileText size={23} />
                        </div>
                        <span className="course-type">PDF / COURS</span>
                      </div>
                      <h3>{course.titre || course.title || "Cours sans titre"}</h3>
                      <p>{course.matiere || "Matière non précisée"}</p>
                      <div className="course-card-bottom">
                        <small>{formatDate(course.createdAt)}</small>
                        <button
                          type="button"
                          onClick={() => ouvrirCours(course)}
                        >
                          Ouvrir <ExternalLink size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {/* MES COURS */}
          {active === "courses" && (
            <>
              <SectionTitle
                eyebrow="BIBLIOTHÈQUE"
                title="Mes cours"
                description="Retrouve les supports de cours par matière, niveau et semestre."
                action={
                  isAdmin && (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => setModal("course")}
                    >
                      <Plus size={18} /> Ajouter un cours
                    </button>
                  )
                }
              />

              <div className="filter-panel">
                <div className="search-box">
                  <Search size={18} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher un cours ou une matière..."
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <select
                  value={filterUniversity}
                  onChange={e => setFilterUniversity(e.target.value)}
                >
                  <option value="">Toutes les universités</option>
                  {universities.map(value => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>

                <select
                  value={filterLevel}
                  onChange={e => setFilterLevel(e.target.value)}
                >
                  <option value="">Tous les niveaux</option>
                  {levels.map(value => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>

                <select
                  value={filterSemester}
                  onChange={e => setFilterSemester(e.target.value)}
                >
                  <option value="">Tous les semestres</option>
                  {semesters.map(value => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>

                <button
                  type="button"
                  className="reset-filter"
                  onClick={() => {
                    setSearch("");
                    setFilterUniversity("");
                    setFilterLevel("");
                    setFilterSemester("");
                    setSelectedSubject(null);
                  }}
                >
                  <RefreshCw size={15} /> Réinitialiser
                </button>
              </div>

              <div className="subject-list">
                <button
                  type="button"
                  className={!selectedSubject ? "subject-chip active" : "subject-chip"}
                  onClick={() => setSelectedSubject(null)}
                >
                  Toutes les matières
                </button>

                {availableSubjects.map(subject => (
                  <button
                    type="button"
                    key={subject.id}
                    className={
                      selectedSubject?.id === subject.id
                        ? "subject-chip active"
                        : "subject-chip"
                    }
                    onClick={() => setSelectedSubject(subject)}
                  >
                    {subject.nom}
                  </button>
                ))}
              </div>

              {visibleCourses.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="Aucun cours trouvé"
                  description="Essaie de modifier les filtres ou d'ajouter un cours."
                />
              ) : (
                <div className="course-grid">
                  {visibleCourses.map(course => (
                    <article className="course-card" key={course.id}>
                      <div className="course-card-top">
                        <div className="course-file-icon">
                          <FileText size={23} />
                        </div>
                        <span className="course-type">SUPPORT DE COURS</span>
                      </div>

                      <h3>{course.titre || course.title || "Cours sans titre"}</h3>
                      <p>{course.matiere || "Matière non précisée"}</p>

                      <div className="course-meta">
                        {course.niveau && <span>{course.niveau}</span>}
                        {course.semestre && <span>{course.semestre}</span>}
                      </div>

                      <div className="course-card-bottom">
                        <small>{formatDate(course.createdAt)}</small>
                        <div className="course-actions">
                          <button
                            type="button"
                            onClick={() => ouvrirCours(course)}
                          >
                            Ouvrir <ExternalLink size={15} />
                          </button>

                          {isAdmin && (
                            <button
                              type="button"
                              className="delete-button"
                              onClick={() => supprimerElement("cours", course.id)}
                              aria-label="Supprimer le cours"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {/* RÉVISER */}
          {active === "revision" && (
            <>
              <SectionTitle
                eyebrow="ENTRAÎNEMENT"
                title="Espace de révision"
                description="Travaille tes connaissances avec les outils de révision."
              />

              <div className="revision-intro">
                <div className="revision-intro-icon">
                  <Brain size={42} />
                </div>
                <div>
                  <h2>Apprends à ton rythme</h2>
                  <p>
                    Utilise tes supports de cours pour créer des exercices,
                    des cartes de mémorisation et des résumés.
                  </p>
                </div>
              </div>

              <div className="tools-grid">
                {TOOLS.map(tool => {
                  const Icon = tool.icon;

                  return (
                    <button
                      type="button"
                      key={tool.id}
                      className="tool-card"
                      onClick={() => {
                        setAiAction(tool.id);
                        navigate("ai");
                      }}
                    >
                      <IconTile
                        icon={Icon}
                        color={tool.color}
                        background={tool.background}
                      />
                      <h3>{tool.title}</h3>
                      <p>{tool.description}</p>
                      <span className="tool-card-link">
                        Utiliser <ChevronRight size={16} />
                      </span>
                    </button>
                  );
                })}
              </div>

              <SectionTitle
                eyebrow="ACTIVITÉ"
                title="Historique de révision"
                description="Consulte les dernières activités réalisées."
              />

              {history.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="Aucune activité pour le moment"
                  description="Tes résultats de révision apparaîtront ici."
                />
              ) : (
                <div className="history-list">
                  {history.slice(0, 8).map(item => (
                    <button
                      type="button"
                      className="history-item"
                      key={item.id}
                      onClick={() => ouvrirResultat(item)}
                    >
                      <div className="history-icon">
                        <FileCheck size={20} />
                      </div>
                      <div className="history-info">
                        <strong>{item.titre || "Révision"}</strong>
                        <small>
                          {item.type || "Activité"} · {formatDate(item.createdAt)}
                        </small>
                      </div>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* EXAMENS */}
          {active === "exams" && (
            <>
              <SectionTitle
                eyebrow="ANNALES"
                title="Examens"
                description="Prépare-toi avec les sujets et corrections disponibles."
                action={
                  isAdmin && (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => setModal("exam")}
                    >
                      <Plus size={18} /> Ajouter un examen
                    </button>
                  )
                }
              />

              <div className="filter-panel">
                <div className="search-box">
                  <Search size={18} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher un examen..."
                  />
                </div>

                <select
                  value={filterUniversity}
                  onChange={e => setFilterUniversity(e.target.value)}
                >
                  <option value="">Toutes les universités</option>
                  {universities.map(value => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>

                <select
                  value={filterLevel}
                  onChange={e => setFilterLevel(e.target.value)}
                >
                  <option value="">Tous les niveaux</option>
                  {levels.map(value => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>

                <select
                  value={filterSemester}
                  onChange={e => setFilterSemester(e.target.value)}
                >
                  <option value="">Tous les semestres</option>
                  {semesters.map(value => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>

              {filteredExams.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Aucun examen disponible"
                  description="Les sujets d'examen apparaîtront ici après publication."
                />
              ) : (
                <div className="exam-grid">
                  {filteredExams.map(exam => (
                    <article className="exam-card" key={exam.id}>
                      <div className="exam-card-icon">
                        <ClipboardList size={25} />
                      </div>

                      <div className="exam-card-content">
                        <h3>{exam.titre}</h3>
                        <p>{exam.matiere}</p>

                        <div className="exam-meta">
                          {exam.universite && <span>{exam.universite}</span>}
                          {exam.niveau && <span>{exam.niveau}</span>}
                          {exam.semestre && <span>{exam.semestre}</span>}
                          {exam.annee && <span>{exam.annee}</span>}
                        </div>

                        <div className="exam-actions">
                          <a
                            href={exam.url}
                            target="_blank"
                            rel="noreferrer"
                            className="primary-button small"
                          >
                            Sujet <ExternalLink size={14} />
                          </a>

                          {exam.correctionUrl && (
                            <a
                              href={exam.correctionUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="secondary-button small"
                            >
                              Correction <FileCheck size={14} />
                            </a>
                          )}

                          {isAdmin && (
                            <button
                              type="button"
                              className="delete-button"
                              onClick={() => supprimerElement("examens", exam.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ASSISTANT IA */}
          {active === "ai" && (
            <>
              <SectionTitle
                eyebrow="ASSISTANT D'ÉTUDES"
                title="Assistant IA"
                description="Dépose un cours PDF et choisis le travail à réaliser."
              />

              <div className="ai-layout">
                <div className="ai-main-card">
                  <div className="ai-card-heading">
                    <div className="ai-heading-icon">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <h2>Que souhaites-tu préparer ?</h2>
                      <p>Choisis une fonctionnalité et ajoute ton document.</p>
                    </div>
                  </div>

                  <div className="ai-tool-options">
                    {TOOLS.map(tool => {
                      const Icon = tool.icon;

                      return (
                        <button
                          type="button"
                          key={tool.id}
                          className={
                            aiAction === tool.id
                              ? "ai-tool-option selected"
                              : "ai-tool-option"
                          }
                          onClick={() => setAiAction(tool.id)}
                        >
                          <Icon size={20} />
                          <span>{tool.title}</span>
                          {aiAction === tool.id && (
                            <CheckCircle2 size={17} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <form onSubmit={lancerIA}>
                    <label className="upload-zone">
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={e => setAiFile(e.target.files?.[0] || null)}
                      />
                      <div className="upload-zone-icon">
                        <Upload size={28} />
                      </div>
                      <strong>
                        {aiFile ? aiFile.name : "Importer ton cours PDF"}
                      </strong>
                      <span>
                        Appuie ici pour sélectionner un document depuis ton téléphone.
                      </span>
                      <small>Format PDF uniquement</small>
                    </label>

                    {aiAction === "chat" && (
                      <label className="field">
                        <span>Ta question</span>
                        <textarea
                          value={aiQuestion}
                          onChange={e => setAiQuestion(e.target.value)}
                          placeholder="Pose ta question sur le cours..."
                          rows={4}
                        />
                      </label>
                    )}

                    <button
                      type="submit"
                      className="primary-button ai-submit"
                      disabled={busy || !aiFile}
                    >
                      {busy ? (
                        <>
                          <LoaderCircle className="spin" size={18} />
                          {actionLabels[aiAction] || "Préparation de votre réponse..."}
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} />
                          Lancer la préparation
                        </>
                      )}
                    </button>
                  </form>

                  {aiResult && (
                    <div className="ai-result">
                      <div className="ai-result-header">
                        <h3>Résultat</h3>
                        <button
                          type="button"
                          className="secondary-button small"
                          onClick={copierResultat}
                        >
                          Copier <FileText size={15} />
                        </button>
                      </div>
                      <div className="ai-result-content">
                        {aiResult}
                      </div>
                    </div>
                  )}
                </div>

                <aside className="ai-side-card">
                  <div className="ai-side-icon">
                    <BookMarked size={25} />
                  </div>
                  <h3>Conseil de révision</h3>
                  <p>
                    Pour de meilleurs résultats, utilise un PDF lisible,
                    avec des pages bien orientées et un texte suffisamment net.
                  </p>

                  <div className="ai-side-divider" />

                  <h4>Historique récent</h4>

                  {history.length === 0 ? (
                    <p className="muted-text">Aucune révision enregistrée.</p>
                  ) : (
                    history.slice(0, 4).map(item => (
                      <button
                        type="button"
                        className="mini-history-item"
                        key={item.id}
                        onClick={() => ouvrirResultat(item)}
                      >
                        <FileText size={16} />
                        <span>{item.titre || "Révision"}</span>
                      </button>
                    ))
                  )}
                </aside>
              </div>
            </>
          )}
          {/* PARAMÈTRES */}
          {active === "settings" && (
            <>
              <SectionTitle
                eyebrow="PERSONNALISATION"
                title="Paramètres"
                description="Gère les préférences de ton espace DN MED STUDY."
              />

              <div className="settings-card">
                <div className="settings-heading">
                  <div className="settings-icon"><UserRound size={24} /></div>
                  <div>
                    <h3>Mon compte</h3>
                    <p>Informations de ton compte étudiant.</p>
                  </div>
                </div>

                <div className="settings-row">
                  <span>Nom affiché</span>
                  <strong>{displayName}</strong>
                </div>

                <div className="settings-row">
                  <span>Adresse e-mail</span>
                  <strong>{user?.email || "Non renseignée"}</strong>
                </div>

                <div className="settings-row">
                  <span>Type de compte</span>
                  <strong>{isAdmin ? "Administrateur" : "Étudiant"}</strong>
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-heading">
                  <div className="settings-icon"><Settings size={24} /></div>
                  <div>
                    <h3>Apparence</h3>
                    <p>Personnalise l'affichage de la plateforme.</p>
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <strong>Mode sombre</strong>
                    <small>Modifier l'apparence de l'application.</small>
                  </div>

                  <button
                    type="button"
                    className={dark ? "toggle-switch enabled" : "toggle-switch"}
                    onClick={() => setDark(!dark)}
                    aria-label="Activer ou désactiver le mode sombre"
                  >
                    <span />
                  </button>
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-heading">
                  <div className="settings-icon"><ShieldCheck size={24} /></div>
                  <div>
                    <h3>Sécurité</h3>
                    <p>Gère la session de ton compte.</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="secondary-button settings-logout"
                  onClick={deconnexion}
                >
                  <LogOut size={17} /> Se déconnecter
                </button>
              </div>
            </>
          )}

          {/* ADMINISTRATION */}
          {active === "admin" && isAdmin && (
            <>
              <SectionTitle
                eyebrow="GESTION DE LA PLATEFORME"
                title="Administration"
                description="Ajoute et organise les ressources pédagogiques."
              />

              <div className="admin-actions-grid">
                <button
                  type="button"
                  className="admin-action-card"
                  onClick={() => setModal("subject")}
                >
                  <div className="admin-action-icon purple">
                    <BookMarked size={25} />
                  </div>
                  <h3>Ajouter une matière</h3>
                  <p>Créer une matière et définir son niveau et son semestre.</p>
                  <span>Ajouter <ChevronRight size={16} /></span>
                </button>

                <button
                  type="button"
                  className="admin-action-card"
                  onClick={() => setModal("course")}
                >
                  <div className="admin-action-icon blue">
                    <Upload size={25} />
                  </div>
                  <h3>Publier un cours</h3>
                  <p>Ajouter un document PDF depuis ton appareil ou un lien.</p>
                  <span>Publier <ChevronRight size={16} /></span>
                </button>

                <button
                  type="button"
                  className="admin-action-card"
                  onClick={() => setModal("exam")}
                >
                  <div className="admin-action-icon orange">
                    <ClipboardList size={25} />
                  </div>
                  <h3>Ajouter un examen</h3>
                  <p>Publier un sujet et éventuellement sa correction.</p>
                  <span>Ajouter <ChevronRight size={16} /></span>
                </button>
              </div>

              <div className="admin-summary">
                <div>
                  <strong>{subjects.length}</strong>
                  <span>Matières</span>
                </div>
                <div>
                  <strong>{courses.length}</strong>
                  <span>Cours</span>
                </div>
                <div>
                  <strong>{exams.length}</strong>
                  <span>Examens</span>
                </div>
              </div>
            </>
          )}

          {/* MODALE MATIÈRE */}
          {modal === "subject" && (
            <Modal
              title="Ajouter une matière"
              onClose={() => setModal("")}
            >
              <form className="modal-form" onSubmit={ajouterMatiere}>
                <Field
                  label="Université"
                  value={subjectForm.universite}
                  onChange={value =>
                    setSubjectForm(prev => ({ ...prev, universite: value }))
                  }
                  placeholder="Ex. UCAD"
                  required
                />

                <Field
                  label="Filière"
                  value={subjectForm.filiere}
                  onChange={value =>
                    setSubjectForm(prev => ({ ...prev, filiere: value }))
                  }
                  placeholder="Ex. Médecine"
                  required
                />

                <Field
                  label="Année universitaire"
                  value={subjectForm.annee || ""}
                  onChange={value =>
                    setSubjectForm(prev => ({ ...prev, annee: value }))
                  }
                  placeholder="Ex. 2026-2027"
                />

                <Field
                  label="Niveau"
                  value={subjectForm.niveau}
                  onChange={value =>
                    setSubjectForm(prev => ({ ...prev, niveau: value }))
                  }
                  placeholder="Ex. Deuxième année"
                  required
                />

                <SelectField
                  label="Semestre"
                  value={subjectForm.semestre}
                  onChange={value =>
                    setSubjectForm(prev => ({ ...prev, semestre: value }))
                  }
                  options={semesters}
                />

                <Field
                  label="Nom de la matière"
                  value={subjectForm.nom}
                  onChange={value =>
                    setSubjectForm(prev => ({ ...prev, nom: value }))
                  }
                  placeholder="Ex. Anatomie"
                  required
                />

                <button
                  type="submit"
                  className="primary-button full-button"
                  disabled={busy}
                >
                  {busy ? "Enregistrement..." : "Enregistrer la matière"}
                </button>
              </form>
            </Modal>
          )}

          {/* MODALE COURS */}
          {modal === "course" && (
            <Modal
              title="Publier un cours"
              onClose={() => {
                if (!busy) {
                  setModal("");
                  setLessonFile(null);
                }
              }}
            >
              <form className="modal-form" onSubmit={ajouterLecon}>
                <Field
                  label="Titre du cours"
                  value={courseForm.titre}
                  onChange={value =>
                    setCourseForm(prev => ({ ...prev, titre: value }))
                  }
                  placeholder="Ex. Cours d'anatomie générale"
                  required
                />

                <SelectField
                  label="Matière"
                  value={courseForm.matiereId}
                  onChange={value =>
                    setCourseForm(prev => ({ ...prev, matiereId: value }))
                  }
                  options={subjects.map(subject => ({
                    value: subject.id,
                    label: `${subject.nom} — ${subject.niveau || ""} ${
                      subject.semestre || ""
                    }`
                  }))}
                />

                <label className="field">
                  <span>Document PDF depuis ton téléphone</span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={e =>
                      setLessonFile(e.target.files?.[0] || null)
                    }
                  />
                  {lessonFile && (
                    <small className="file-selected">
                      <FileCheck size={15} />
                      {lessonFile.name}
                    </small>
                  )}
                </label>

                <div className="form-separator">
                  <span>OU</span>
                </div>

                <Field
                  label="Lien PDF externe"
                  value={courseForm.url}
                  onChange={value =>
                    setCourseForm(prev => ({ ...prev, url: value }))
                  }
                  placeholder="https://..."
                />

                <label className="field">
                  <span>Description (facultatif)</span>
                  <textarea
                    rows={3}
                    value={courseForm.description}
                    onChange={e =>
                      setCourseForm(prev => ({
                        ...prev,
                        description: e.target.value
                      }))
                    }
                    placeholder="Quelques informations sur ce cours..."
                  />
                </label>

                {uploading && (
                  <div className="upload-progress">
                    <div className="progress-label">
                      <span>Envoi du PDF</span>
                      <strong>{uploadProgress}%</strong>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="primary-button full-button"
                  disabled={busy || uploading}
                >
                  {busy ? (
                    <>
                      <LoaderCircle className="spin" size={17} />
                      Publication en cours...
                    </>
                  ) : (
                    <>
                      <Upload size={17} />
                      Publier le cours
                    </>
                  )}
                </button>
              </form>
            </Modal>
          )}

          {/* MODALE EXAMEN */}
          {modal === "exam" && (
            <Modal
              title="Ajouter un examen"
              onClose={() => setModal("")}
            >
              <form className="modal-form" onSubmit={ajouterExamen}>
                <Field
                  label="Titre de l'examen"
                  value={examForm.titre}
                  onChange={value =>
                    setExamForm(prev => ({ ...prev, titre: value }))
                  }
                  placeholder="Ex. Examen d'anatomie"
                  required
                />

                <Field
                  label="Université"
                  value={examForm.universite}
                  onChange={value =>
                    setExamForm(prev => ({ ...prev, universite: value }))
                  }
                  placeholder="Ex. UCAD"
                />

                <Field
                  label="Filière"
                  value={examForm.filiere}
                  onChange={value =>
                    setExamForm(prev => ({ ...prev, filiere: value }))
                  }
                  placeholder="Ex. Médecine"
                />

                <Field
                  label="Année universitaire"
                  value={examForm.annee}
                  onChange={value =>
                    setExamForm(prev => ({ ...prev, annee: value }))
                  }
                  placeholder="Ex. 2026-2027"
                />

                <Field
                  label="Niveau"
                  value={examForm.niveau}
                  onChange={value =>
                    setExamForm(prev => ({ ...prev, niveau: value }))
                  }
                  placeholder="Ex. Deuxième année"
                />

                <SelectField
                  label="Semestre"
                  value={examForm.semestre}
                  onChange={value =>
                    setExamForm(prev => ({ ...prev, semestre: value }))
                  }
                  options={semesters}
                />

                <Field
                  label="Matière"
                  value={examForm.matiere}
                  onChange={value =>
                    setExamForm(prev => ({ ...prev, matiere: value }))
                  }
                  placeholder="Ex. Physiologie"
                  required
                />

                <Field
                  label="Lien du sujet"
                  value={examForm.url}
                  onChange={value =>
                    setExamForm(prev => ({ ...prev, url: value }))
                  }
                  placeholder="https://..."
                  required
                />

                <Field
                  label="Lien de correction (facultatif)"
                  value={examForm.correctionUrl}
                  onChange={value =>
                    setExamForm(prev => ({
                      ...prev,
                      correctionUrl: value
                    }))
                  }
                  placeholder="https://..."
                />

                <button
                  type="submit"
                  className="primary-button full-button"
                  disabled={busy}
                >
                  {busy ? "Enregistrement..." : "Publier l'examen"}
                </button>
              </form>
            </Modal>
          )}
        </div>
      </section>

      {/* NAVIGATION MOBILE EN BAS */}
      <nav className="mobile-bottom-nav">
        {NAVIGATION.slice(0, 4).map(item => {
          const Icon = item.icon;

          return (
            <button
              type="button"
              key={item.id}
              className={active === item.id ? "bottom-nav-item active" : "bottom-nav-item"}
              onClick={() => navigate(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </main>
  );
}

/* =====================================================
   STYLES DE DN MED STUDY
===================================================== */

const styles = `
:root {
  --primary: #2457d6;
  --primary-dark: #1743ad;
  --text: #172033;
  --muted: #748096;
  --border: #e8edf4;
  --background: #f6f8fc;
  --surface: #ffffff;
  --sidebar: #ffffff;
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  font-family: Inter, Arial, sans-serif;
  background: var(--background);
  color: var(--text);
}

button, input, select, textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

.app {
  min-height: 100vh;
  background: var(--background);
  color: var(--text);
}

.sidebar {
  width: 255px;
  position: fixed;
  inset: 0 auto 0 0;
  background: var(--sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 25px 17px 17px;
  z-index: 20;
}

.brand, .mobile-dropdown-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 38px;
}

.brand strong, .mobile-dropdown-title strong {
  display: block;
  font-size: 14px;
  letter-spacing: .5px;
}

.brand small, .mobile-dropdown-title small {
  display: block;
  color: var(--muted);
  margin-top: 4px;
  font-size: 11px;
}

.brand-mark {
  width: 43px;
  height: 43px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  color: white;
  font-size: 16px;
  font-weight: 900;
  background: linear-gradient(135deg, #2762e8, #123a9c);
  box-shadow: 0 5px 15px #2457d633;
}

.sidebar-section-label, .mobile-menu-label {
  font-size: 10px;
  letter-spacing: 1.2px;
  color: #98a2b3;
  font-weight: 800;
  margin: 0 0 12px 9px;
}

.sidebar-nav, .sidebar-tools {
  display: grid;
  gap: 5px;
  margin-bottom: 30px;
}

.nav-item, .tool-nav, .mobile-nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  background: transparent;
  color: #647087;
  text-align: left;
  padding: 12px 13px;
  border-radius: 10px;
  font-size: 13px;
  transition: .2s;
}

.nav-item:hover, .tool-nav:hover, .mobile-nav-item:hover {
  background: #f0f4fc;
  color: var(--primary);
}

.nav-item.active, .tool-nav.active, .mobile-nav-item.active {
  background: #eaf0ff;
  color: var(--primary);
  font-weight: 700;
}

.nav-item span, .tool-nav span, .mobile-nav-item span {
  flex: 1;
}

.sidebar-bottom {
  margin-top: auto;
  display: grid;
  gap: 7px;
}

.user-card {
  border-top: 1px solid var(--border);
  padding: 17px 4px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.user-avatar, .topbar-avatar {
  width: 37px;
  height: 37px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #eaf0ff;
  color: var(--primary);
  font-weight: 800;
}

.user-info {
  min-width: 0;
  flex: 1;
}

.user-info strong, .user-info small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-info strong {
  font-size: 12px;
}

.user-info small {
  color: var(--muted);
  margin-top: 4px;
  font-size: 10px;
}

.logout-button, .icon-button {
  border: 0;
  background: transparent;
  color: #8490a3;
  padding: 8px;
  border-radius: 9px;
}

.logout-button:hover, .icon-button:hover {
  color: #dc3545;
  background: #fff0f1;
}

.main-area {
  margin-left: 255px;
  min-height: 100vh;
}

.topbar {
  height: 70px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 35px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.topbar-left, .topbar-right, .breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
}

.breadcrumb {
  color: #9aa4b5;
  font-size: 12px;
}

.breadcrumb strong {
  color: var(--text);
}

.topbar-user {
  color: #6e7a90;
  font-size: 12px;
}

.mobile-menu-button {
  display: none;
  border: 0;
  background: transparent;
  color: var(--text);
}

.page-content {
  max-width: 1450px;
  margin: 0 auto;
  padding: 32px 35px 60px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin: 35px 0 20px;
}

.section-title h1 {
  font-size: 27px;
  margin: 5px 0 8px;
  letter-spacing: -.7px;
}

.section-title p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.eyebrow {
  color: var(--primary);
  font-size: 10px;
  letter-spacing: 1.4px;
  font-weight: 800;
}

.welcome-banner {
  min-height: 230px;
  padding: 35px 40px;
  border-radius: 19px;
  background: linear-gradient(115deg, #123a9c, #2865e8);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  position: relative;
}

.welcome-content {
  max-width: 600px;
  position: relative;
  z-index: 1;
}

.welcome-tag {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
  letter-spacing: 1px;
  opacity: .85;
  font-weight: 700;
}

.welcome-banner h1 {
  font-size: 30px;
  margin: 18px 0 10px;
}

.welcome-banner p {
  max-width: 520px;
  line-height: 1.7;
  font-size: 13px;
  opacity: .85;
}

.welcome-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 16px;
  border: 0;
  border-radius: 9px;
  background: white;
  color: #1b4bb7;
  font-weight: 700;
  font-size: 12px;
  margin-top: 12px;
}

.welcome-decoration {
  opacity: .18;
  margin-right: 50px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin: 25px 0 38px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--surface);
  padding: 19px;
  border: 1px solid var(--border);
  border-radius: 13px;
}

.stat-icon, .icon-tile {
  display: grid;
  place-items: center;
  border-radius: 11px;
  flex-shrink: 0;
}

.stat-icon {
  width: 44px;
  height: 44px;
}

.stat-icon.blue { color: #2563eb; background: #eaf1ff; }
.stat-icon.purple { color: #7c3aed; background: #f1eafe; }
.stat-icon.orange { color: #ea8a18; background: #fff3df; }
.stat-icon.green { color: #059669; background: #e3f8ef; }

.stat-card strong, .stat-card span {
  display: block;
}

.stat-card strong {
  font-size: 23px;
  margin-bottom: 4px;
}

.stat-card span {
  color: var(--muted);
  font-size: 11px;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 17px;
  margin-bottom: 35px;
}

.tool-card {
  text-align: left;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 22px;
  background: var(--surface);
  transition: .2s;
}

.tool-card:hover, .course-card:hover, .admin-action-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 25px #1d35570c;
}

.icon-tile {
  width: 48px;
  height: 48px;
}

.tool-card h3 {
  font-size: 15px;
  margin: 17px 0 7px;
}

.tool-card p {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
  min-height: 38px;
}

.tool-card-link {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--primary);
  font-size: 11px;
  font-weight: 700;
  margin-top: 18px;
}

.course-grid, .exam-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.course-card, .exam-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 13px;
  padding: 19px;
  transition: .2s;
  min-width: 0;
}

.course-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.course-file-icon, .exam-card-icon {
  display: grid;
  place-items: center;
  color: #2563eb;
  background: #eaf1ff;
  border-radius: 10px;
}

.course-file-icon {
  width: 43px;
  height: 43px;
}

.course-type {
  font-size: 9px;
  color: #8793a7;
  letter-spacing: .8px;
  font-weight: 800;
}

.course-card h3 {
  font-size: 14px;
  margin: 17px 0 6px;
}

.course-card p {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
}

.course-meta, .exam-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.course-meta span, .exam-meta span {
  font-size: 10px;
  background: #f0f3f9;
  color: #66738a;
  padding: 5px 8px;
  border-radius: 6px;
}

.course-card-bottom {
  border-top: 1px solid var(--border);
  margin-top: 17px;
  padding-top: 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.course-card-bottom small {
  color: #98a2b3;
  font-size: 10px;
}

.course-card-bottom button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: var(--primary);
  font-size: 11px;
  font-weight: 700;
}

.course-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.primary-button, .secondary-button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  border-radius: 9px;
  padding: 11px 15px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  border: 1px solid transparent;
}

.primary-button {
  color: white;
  background: var(--primary);
}

.primary-button:hover {
  background: var(--primary-dark);
}

.primary-button:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.secondary-button {
  background: var(--surface);
  color: var(--text);
  border-color: var(--border);
}

.primary-button.small, .secondary-button.small {
  padding: 8px 11px;
  font-size: 10px;
}

.text-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
}

.filter-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 13px;
  padding: 14px;
  margin: 22px 0 17px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 220px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: #929daf;
}

.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
  padding: 11px 0;
  background: transparent;
  color: var(--text);
  font-size: 12px;
}

.search-box button {
  border: 0;
  background: transparent;
  color: var(--muted);
}

.filter-panel select {
  min-width: 145px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
  color: #647087;
  background: var(--surface);
  font-size: 11px;
}

.reset-filter {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 11px;
}

.subject-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 15px 0 20px;
}

.subject-chip {
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 8px 13px;
  background: var(--surface);
  color: #69758b;
  font-size: 11px;
}

.subject-chip.active {
  background: #eaf0ff;
  border-color: #cbd9ff;
  color: var(--primary);
  font-weight: 700;
}

.empty-state {
  background: var(--surface);
  border: 1px dashed #d9e0eb;
  border-radius: 14px;
  padding: 45px 20px;
  text-align: center;
  margin: 20px 0;
}

.empty-icon {
  color: #9aa8bd;
  margin-bottom: 13px;
}

.empty-state h3 {
  margin: 0 0 8px;
  font-size: 15px;
}

.empty-state p {
  color: var(--muted);
  font-size: 12px;
  margin: 0;
}

.revision-intro {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: #edf2ff;
  border-radius: 14px;
  margin: 25px 0;
}

.revision-intro-icon {
  color: var(--primary);
}

.revision-intro h2 {
  margin: 0 0 7px;
  font-size: 18px;
}

.revision-intro p {
  margin: 0;
  color: #65738b;
  font-size: 12px;
  line-height: 1.6;
}

.history-list {
  display: grid;
  gap: 9px;
}

.history-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 11px;
  text-align: left;
  color: var(--text);
}

.history-icon {
  width: 39px;
  height: 39px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: #2563eb;
  background: #eaf1ff;
}

.history-info {
  flex: 1;
}

.history-info strong, .history-info small {
  display: block;
}

.history-info strong {
  font-size: 12px;
}

.history-info small {
  font-size: 10px;
  color: var(--muted);
  margin-top: 5px;
}

.exam-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.exam-card-icon {
  width: 45px;
  height: 45px;
  flex-shrink: 0;
}

.exam-card-content {
  min-width: 0;
  flex: 1;
}

.exam-card h3 {
  margin: 3px 0 6px;
  font-size: 14px;
}

.exam-card p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}

.exam-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 16px;
}

.ai-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 18px;
  margin-top: 25px;
  align-items: start;
}

.ai-main-card, .ai-side-card, .settings-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 23px;
}

.ai-card-heading {
  display: flex;
  align-items: center;
  gap: 13px;
}

.ai-heading-icon, .ai-side-icon {
  width: 45px;
  height: 45px;
  display: grid;
  place-items: center;
  color: #7c3aed;
  background: #f1eafe;
  border-radius: 12px;
}

.ai-card-heading h2 {
  font-size: 16px;
  margin: 0 0 6px;
}

.ai-card-heading p {
  margin: 0;
  color: var(--muted);
  font-size: 11px;
}

.ai-tool-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
  margin: 25px 0;
}

.ai-tool-option {
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 9px;
  padding: 12px 9px;
  color: #66738a;
  font-size: 10px;
}

.ai-tool-option span {
  flex: 1;
}

.ai-tool-option.selected {
  border-color: #9db7ff;
  background: #eef3ff;
  color: var(--primary);
  font-weight: 700;
}

.upload-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 2px dashed #cbd6e7;
  border-radius: 13px;
  padding: 30px 15px;
  text-align: center;
  cursor: pointer;
  background: #fafcff;
}

.upload-zone input {
  display: none;
}

.upload-zone-icon {
  color: var(--primary);
  background: #eaf1ff;
  border-radius: 13px;
  padding: 13px;
}

.upload-zone strong {
  font-size: 13px;
  overflow-wrap: anywhere;
}

.upload-zone span, .upload-zone small {
  color: var(--muted);
  font-size: 11px;
}

.ai-submit {
  width: 100%;
  margin-top: 17px;
}

.ai-side-card h3 {
  font-size: 15px;
  margin: 15px 0 8px;
}

.ai-side-card p {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.7;
}

.ai-side-divider {
  border-top: 1px solid var(--border);
  margin: 20px 0;
}

.ai-side-card h4 {
  font-size: 12px;
}

.mini-history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 9px 0;
  color: #65738b;
  font-size: 10px;
  text-align: left;
}

.mini-history-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-result {
  margin-top: 23px;
  border: 1px solid var(--border);
  border-radius: 11px;
  overflow: hidden;
}

.ai-result-header {
  padding: 13px 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8faff;
  border-bottom: 1px solid var(--border);
}

.ai-result-header h3 {
  font-size: 13px;
  margin: 0;
}

.ai-result-content {
  padding: 17px;
  font-size: 12px;
  line-height: 1.8;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.settings-card {
  margin: 18px 0;
}

.settings-heading {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 18px;
}

.settings-icon {
  width: 43px;
  height: 43px;
  display: grid;
  place-items: center;
  background: #eaf1ff;
  color: var(--primary);
  border-radius: 11px;
}

.settings-heading h3 {
  margin: 0 0 5px;
  font-size: 14px;
}

.settings-heading p {
  margin: 0;
  color: var(--muted);
  font-size: 11px;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 14px 0;
  border-top: 1px solid var(--border);
  font-size: 12px;
}

.settings-row > span {
  color: var(--muted);
}

.settings-row strong {
  text-align: right;
  overflow-wrap: anywhere;
}

.settings-row small {
  display: block;
  margin-top: 5px;
  color: var(--muted);
}

.toggle-switch {
  width: 45px;
  height: 25px;
  border: 0;
  border-radius: 20px;
  padding: 3px;
  background: #cbd3df;
}

.toggle-switch span {
  display: block;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: white;
  transition: .2s;
}

.toggle-switch.enabled {
  background: var(--primary);
}

.toggle-switch.enabled span {
  transform: translateX(20px);
}

.settings-logout {
  margin-top: 4px;
}

.admin-actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin: 25px 0;
}

.admin-action-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 21px;
  text-align: left;
  transition: .2s;
}

.admin-action-icon {
  width: 45px;
  height: 45px;
  display: grid;
  place-items: center;
  border-radius: 11px;
}

.admin-action-icon.purple { color: #7c3aed; background: #f1eafe; }
.admin-action-icon.blue { color: #2563eb; background: #eaf1ff; }
.admin-action-icon.orange { color: #ea8a18; background: #fff3df; }

.admin-action-card h3 {
  font-size: 14px;
  margin: 17px 0 7px;
}

.admin-action-card p {
  font-size: 11px;
  line-height: 1.6;
  color: var(--muted);
  min-height: 38px;
}

.admin-action-card span {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--primary);
  font-size: 11px;
  font-weight: 700;
}

.admin-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 13px;
}

.admin-summary > div {
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 18px;
  border-radius: 11px;
}

.admin-summary strong, .admin-summary span {
  display: block;
}

.admin-summary strong {
  font-size: 23px;
}

.admin-summary span {
  color: var(--muted);
  font-size: 11px;
  margin-top: 4px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #10182899;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  overflow-y: auto;
}

.modal-card {
  width: min(100%, 540px);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--surface);
  border-radius: 15px;
  padding: 22px;
  box-shadow: 0 20px 60px #0003;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
}

.modal-form {
  display: grid;
  gap: 15px;
}

.field {
  display: grid;
  gap: 7px;
  color: var(--text);
  font-size: 11px;
  font-weight: 700;
}

.field input, .field select, .field textarea {
  width: 100%;
  min-width: 0;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  padding: 12px;
  outline: none;
  font-size: 12px;
}

.field input:focus, .field select:focus, .field textarea:focus {
  border-color: #7da0f4;
  box-shadow: 0 0 0 3px #2457d615;
}

.field textarea {
  resize: vertical;
}

.full-button {
  width: 100%;
  margin-top: 5px;
}

.file-selected {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #059669;
  overflow-wrap: anywhere;
}

.form-separator {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #9aa4b5;
  font-size: 10px;
  font-weight: 800;
}

.form-separator::before, .form-separator::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--border);
}

.upload-progress {
  display: grid;
  gap: 8px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 11px;
}

.progress-track {
  height: 8px;
  background: #e9eef6;
  border-radius: 20px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 20px;
  background: var(--primary);
  transition: width .2s;
}

.loading-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
  background: var(--background);
  color: var(--muted);
  font-size: 12px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.mobile-bottom-nav, .mobile-dropdown, .mobile-menu-backdrop {
  display: none;
}

.dark-mode {
  --text: #edf2ff;
  --muted: #a5b0c4;
  --border: #29364c;
  --background: #101827;
  --surface: #182337;
  --sidebar: #182337;
}

.dark-mode .topbar,
.dark-mode .sidebar,
.dark-mode .course-card,
.dark-mode .tool-card,
.dark-mode .stat-card,
.dark-mode .settings-card,
.dark-mode .ai-main-card,
.dark-mode .ai-side-card,
.dark-mode .modal-card,
.dark-mode .admin-action-card,
.dark-mode .admin-summary > div {
  background: var(--surface);
}

.dark-mode .search-box input,
.dark-mode .filter-panel select,
.dark-mode .field input,
.dark-mode .field select,
.dark-mode .field textarea {
  color: var(--text);
  background: var(--surface);
}

.dark-mode .revision-intro {
  background: #1b2e50;
}

.dark-mode .revision-intro p {
  color: #bac7df;
}

.dark-mode .ai-result-header {
  background: #1b2b43;
}

.dark-mode .upload-zone {
  background: #1a2940;
}

.dark-mode .subject-chip,
.dark-mode .secondary-button {
  background: var(--surface);
  color: var(--text);
  border-color: var(--border);
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .course-grid, .exam-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .ai-layout {
    grid-template-columns: 1fr;
  }

  .ai-side-card {
    display: none;
  }
}

@media (max-width: 760px) {
  .sidebar {
    display: none;
  }

  .main-area {
    margin-left: 0;
    padding-bottom: 75px;
  }

  .topbar {
    height: 61px;
    padding: 0 15px;
  }

  .mobile-menu-button {
    display: grid;
    place-items: center;
    padding: 7px;
  }

  .breadcrumb {
    font-size: 10px;
    gap: 5px;
  }

  .topbar-user {
    display: none;
  }

  .topbar-avatar {
    width: 33px;
    height: 33px;
  }

  .page-content {
    padding: 22px 15px 35px;
  }

  .welcome-banner {
    min-height: 220px;
    padding: 25px 20px;
    border-radius: 15px;
  }

  .welcome-banner h1 {
    font-size: 24px;
  }

  .welcome-banner p {
    font-size: 12px;
  }

  .welcome-decoration {
    position: absolute;
    right: -45px;
    bottom: 15px;
    margin: 0;
  }

  .welcome-decoration svg {
    width: 125px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 9px;
    margin: 17px 0 28px;
  }

  .stat-card {
    padding: 12px 9px;
    gap: 9px;
  }

  .stat-icon {
    width: 36px;
    height: 36px;
  }

  .stat-icon svg {
    width: 18px;
  }

  .stat-card strong {
    font-size: 18px;
  }

  .stat-card span {
    font-size: 9px;
  }

  .section-title {
    align-items: flex-start;
    margin: 27px 0 15px;
  }

  .section-title h1 {
    font-size: 22px;
  }

  .section-title p {
    font-size: 11px;
  }

  .section-title > .primary-button {
    padding: 9px;
    font-size: 10px;
    white-space: nowrap;
  }

  .tools-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .tool-card {
    padding: 16px;
  }

  .tool-card h3 {
    margin-top: 11px;
  }

  .tool-card p {
    min-height: 0;
  }

  .course-grid, .exam-grid {
    grid-template-columns: 1fr;
  }

  .filter-panel {
    padding: 10px;
  }

  .search-box {
    min-width: 100%;
  }

  .filter-panel select {
    flex: 1;
    min-width: calc(50% - 6px);
  }

  .reset-filter {
    padding: 7px;
  }

  .revision-intro {
    padding: 17px;
    gap: 12px;
  }

  .revision-intro h2 {
    font-size: 15px;
  }

  .revision-intro p {
    font-size: 11px;
  }

  .ai-main-card, .ai-side-card, .settings-card {
    padding: 16px;
  }

  .ai-tool-options {
    grid-template-columns: 1fr;
    gap: 7px;
    margin: 18px 0;
  }

  .ai-tool-option {
    padding: 12px;
    font-size: 11px;
  }

  .admin-actions-grid {
    grid-template-columns: 1fr;
  }

  .admin-summary {
    gap: 7px;
  }

  .admin-summary > div {
    padding: 12px 9px;
  }

  .admin-summary strong {
    font-size: 19px;
  }

  .admin-summary span {
    font-size: 9px;
  }

  .modal-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .modal-card {
    width: 100%;
    max-height: 92vh;
    border-radius: 18px 18px 0 0;
    padding: 20px 16px 30px;
  }

  .mobile-menu-backdrop {
    display: block;
    position: fixed;
    inset: 61px 0 0;
    z-index: 29;
    background: #10182866;
  }

  .mobile-dropdown {
    display: block;
    position: fixed;
    top: 61px;
    left: 0;
    width: min(85vw, 330px);
    max-height: calc(100vh - 61px);
    overflow-y: auto;
    background: var(--surface);
    padding: 20px 15px 25px;
    z-index: 30;
    box-shadow: 10px 15px 35px #10182825;
    border-radius: 0 0 15px 0;
  }

  .mobile-dropdown-title {
    margin-bottom: 20px;
  }

  .mobile-nav-item {
    padding: 13px 11px;
    font-size: 12px;
  }

  .mobile-menu-divider {
    height: 1px;
    background: var(--border);
    margin: 13px 0;
  }

  .mobile-menu-label {
    margin-top: 10px;
  }

  .mobile-logout {
    color: #dc3545;
  }

  .mobile-bottom-nav {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 65px;
    background: var(--surface);
    border-top: 1px solid var(--border);
    z-index: 25;
    padding-bottom: env(safe-area-inset-bottom);
  }

  .bottom-nav-item {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 5px;
    border: 0;
    background: transparent;
    color: #8490a3;
    font-size: 9px;
  }

  .bottom-nav-item.active {
    color: var(--primary);
    font-weight: 800;
  }
}

@media (max-width: 380px) {
  .welcome-banner h1 {
    font-size: 21px;
  }

  .stat-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .section-title > .primary-button {
    max-width: 120px;
    white-space: normal;
  }
}
`;

if (typeof document !== "undefined") {
  const styleId = "dn-med-study-global-styles";

  let styleElement = document.getElementById(styleId);

  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }

  styleElement.textContent = styles;
                    }
