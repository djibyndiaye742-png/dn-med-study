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

import { supabase } from "../lib/supabase";

const ADMIN_EMAIL = "djibyndiaye742@gmail.com";
const STORAGE_BUCKET = "cours-pdf";

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
  return String(value ?? "").trim().toLowerCase();
}

function getCourseUrl(item) {
  return (
    item?.url ||
    item?.pdf_url ||
    item?.pdfUrl ||
    item?.fichierUrl ||
    item?.fichier_url ||
    item?.lien ||
    ""
  );
}

function formatDate(value) {
  if (!value) return "Date inconnue";

  const date = value?.toDate
    ? value.toDate()
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

/* COMPOSANTS */

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
      <div className="empty-icon">
        <Icon size={35} />
      </div>
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
            typeof option === "string"
              ? option
              : option.value;

          const optionLabel =
            typeof option === "string"
              ? option
              : option.label;

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
    user?.user_metadata?.prenom ||
    user?.user_metadata?.firstName ||
    user?.email?.split("@")[0] ||
    "Étudiant";

  const semesters = [
    "Premier semestre",
    "Deuxième semestre"
  ];

  /* AUTHENTIFICATION SUPABASE */

  useEffect(() => {
    let mounted = true;

    async function verifierSession() {
      try {
        const {
          data: { session },
          error
        } = await supabase.auth.getSession();

        if (error) throw error;

        if (!mounted) return;

        if (!session?.user) {
          window.location.href = "/connexion";
          return;
        }

        setUser(session.user);

        const {
          data: profileData,
          error: profileError
        } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Erreur profil :", profileError);
        }

        if (!mounted) return;

        if (profileData) {
          setProfile(profileData);
        }

        setLoading(false);

      } catch (error) {
        console.error("Erreur authentification :", error);

        if (mounted) {
          setLoading(false);
          alert(
            error.message ||
            "Impossible de vérifier ta session."
          );
        }
      }
    }

    verifierSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_OUT" || !session?.user) {
          window.location.href = "/connexion";
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* CHARGEMENT DES DONNÉES */

  async function chargerDonnees() {
    try {
      const [
        courseResponse,
        subjectResponse,
        examResponse
      ] = await Promise.all([
        supabase
          .from("cours")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("matieres")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("examens")
          .select("*")
          .order("created_at", { ascending: false })
      ]);

      if (courseResponse.error) throw courseResponse.error;
      if (subjectResponse.error) throw subjectResponse.error;
      if (examResponse.error) throw examResponse.error;

      setCourses(
        (courseResponse.data || []).map(item => ({
          ...item,
          createdAt: item.created_at
        }))
      );

      setSubjects(subjectResponse.data || []);

      setExams(
        (examResponse.data || []).map(item => ({
          ...item,
          createdAt: item.created_at
        }))
      );

      if (user?.id) {
        const {
          data: historyData,
          error: historyError
        } = await supabase
          .from("resultats")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (historyError) throw historyError;

        setHistory(
          (historyData || []).map(item => ({
            ...item,
            createdAt: item.created_at
          }))
        );
      }

    } catch (error) {
      console.error("Chargement Supabase :", error);

      alert(
        "Impossible de charger certaines données : " +
        (error.message || "Erreur Supabase")
      );
    }
  }

  useEffect(() => {
    if (user?.id) {
      chargerDonnees();
    }
  }, [user?.id]);

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

      return matchesSearch &&
        matchesUniversity &&
        matchesLevel &&
        matchesSemester;
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
        (!filterUniversity || exam.universite === filterUniversity) &&
        (!filterLevel || exam.niveau === filterLevel) &&
        (!filterSemester || exam.semestre === filterSemester)
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

    if (
      !subjectForm.universite ||
      !subjectForm.filiere ||
      !subjectForm.niveau ||
      !subjectForm.semestre ||
      !subjectForm.nom.trim()
    ) {
      return alert("Complète tous les champs.");
    }

    setBusy(true);

    try {
      const { error } = await supabase
        .from("matieres")
        .insert({
          ...subjectForm,
          nom: subjectForm.nom.trim(),
          created_by: user.id
        });

      if (error) throw error;

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
      console.error(error);

      alert(
        `Enregistrement refusé : ${
          error.message || "Erreur Supabase"
        }`
      );

    } finally {
      setBusy(false);
    }
  }

  /* ENVOI PDF VERS SUPABASE STORAGE */

  async function envoyerPDF(file) {
    if (!file || !user?.id) {
      throw new Error("Fichier ou utilisateur manquant.");
    }

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      throw new Error("Le fichier doit être au format PDF.");
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const safeName = file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      const filePath =
        `${user.id}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          contentType: "application/pdf",
          upsert: false
        });

      if (uploadError) throw uploadError;

      setUploadProgress(100);

      const { data } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error("Impossible de récupérer le lien PDF.");
      }

      return data.publicUrl;

    } finally {
      setUploading(false);
    }
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

    if (!courseForm.titre.trim()) {
      return alert("Ajoute le titre de la leçon.");
    }

    if (!lessonFile && !courseForm.url.trim()) {
      return alert("Choisis un PDF ou ajoute un lien PDF.");
    }

    if (lessonFile) {
      const isPdf =
        lessonFile.type === "application/pdf" ||
        lessonFile.name.toLowerCase().endsWith(".pdf");

      if (!isPdf) {
        return alert("Le fichier doit être au format PDF.");
      }
    }

    setBusy(true);
    setUploadProgress(0);

    try {
      let pdfUrl = courseForm.url.trim();

      if (lessonFile) {
        pdfUrl = await envoyerPDF(lessonFile);
      }

      const payload = {
        titre: courseForm.titre.trim(),
        matiere: subject.nom,
        matiere_id: subject.id,
        universite: subject.universite,
        filiere: subject.filiere,
        niveau: subject.niveau,
        semestre: subject.semestre,
        description: courseForm.description.trim(),
        url: pdfUrl,
        pdf_url: pdfUrl,
        created_by: user.id
      };

      const { error } = await supabase
        .from("cours")
        .insert(payload);

      if (error) throw error;

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
        `Publication refusée : ${
          error.message ||
          "Vérifie Supabase Storage et les politiques RLS."
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

    if (!examForm.titre || !examForm.matiere || !examForm.url) {
      return alert(
        "Le titre, la matière et le lien du sujet sont obligatoires."
      );
    }

    if (!examForm.url.startsWith("https://")) {
      return alert("Le lien du sujet doit commencer par https://");
    }

    if (
      examForm.correctionUrl &&
      !examForm.correctionUrl.startsWith("https://")
    ) {
      return alert(
        "Le lien de correction doit commencer par https://"
      );
    }

    setBusy(true);

    try {
      const { error } = await supabase
        .from("examens")
        .insert({
          titre: examForm.titre,
          universite: examForm.universite,
          filiere: examForm.filiere,
          niveau: examForm.niveau,
          semestre: examForm.semestre,
          matiere: examForm.matiere,
          annee: examForm.annee,
          url: examForm.url,
          correction_url: examForm.correctionUrl,
          created_by: user.id
        });

      if (error) throw error;

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
      console.error(error);

      alert(
        `Enregistrement refusé : ${
          error.message || "Erreur Supabase"
        }`
      );

    } finally {
      setBusy(false);
    }
  }

  /* SUPPRESSION */

  async function supprimerElement(table, id) {
    if (!isAdmin) return;

    const tablesAutorisees = [
      "cours",
      "matieres",
      "examens"
    ];

    if (!tablesAutorisees.includes(table)) {
      return alert("Table non autorisée.");
    }

    if (!confirm("Confirmer la suppression ?")) return;

    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", id);

      if (error) throw error;

      await chargerDonnees();

    } catch (error) {
      console.error(error);

      alert(
        "Suppression impossible. Vérifie les politiques Supabase."
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

      if (user?.id) {
        const { error } = await supabase
          .from("resultats")
          .insert({
            user_id: user.id,
            titre: aiFile.name,
            type: aiAction,
            resultat: result
          });

        if (error) throw error;

        await chargerDonnees();
      }

    } catch (error) {
      console.error(error);

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
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erreur déconnexion :", error);
      alert("Impossible de se déconnecter.");
      return;
    }

    window.location.href = "/connexion";
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
  /* =====================================================
     PRÉPARATION DE L'INTERFACE
  ===================================================== */

  const actionLabels = {
    resume: "Résumé du cours",
    qcm: "QCM",
    flashcards: "Flashcards",
    question: "Réponse à une question"
  };

  const availableSubjects = subjects.filter(subject => {
    return (
      (!filterUniversity || subject.universite === filterUniversity) &&
      (!filterLevel || subject.niveau === filterLevel) &&
      (!filterSemester || subject.semestre === filterSemester)
    );
  });

  const visibleCourses = selectedSubject
    ? filteredCourses.filter(course =>
        course.matiere_id === selectedSubject.id ||
        course.matiereId === selectedSubject.id
      )
    : filteredCourses;

  const pageTitle = {
    home: "Tableau de bord",
    courses: "Mes cours",
    revision: "Révisions",
    exams: "Examens",
    ai: "Assistant IA",
    admin: "Administration",
    settings: "Paramètres"
  };

  const navItems = [
    ...NAVIGATION,
    ...(isAdmin
      ? [{ id: "admin", label: "Administration", icon: ShieldCheck }]
      : []),
    { id: "settings", label: "Paramètres", icon: Settings }
  ];

  /* =====================================================
     AFFICHAGE
  ===================================================== */

  return (
    <main className={`app-shell ${dark ? "dark-mode" : ""}`}>

      {/* SIDEBAR DESKTOP */}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">DN</div>

          <div>
            <strong>DN MED STUDY</strong>
            <span>Ton espace de réussite</span>
          </div>
        </div>

        <div className="sidebar-label">MENU PRINCIPAL</div>

        <nav className="side-navigation">
          {navItems.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={`nav-item ${active === item.id ? "active" : ""}`}
                onClick={() => navigate(item.id)}
              >
                <Icon size={19} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-profile">
            <div className="avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{displayName}</strong>
              <span>{isAdmin ? "Administrateur" : "Étudiant"}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}

      <div className="main-area">

        {/* TOPBAR */}

        <header className="topbar">

          <button
            className="mobile-menu-button"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="topbar-title">
            <span>DN MED STUDY / ESPACE ÉTUDIANT</span>
            <strong>{pageTitle[active] || "DN MED STUDY"}</strong>
          </div>

          <div className="topbar-right">
            <button
              className="icon-button"
              onClick={() => setDark(!dark)}
              title="Changer le thème"
            >
              {dark ? <Eye size={18} /> : <RefreshCw size={18} />}
            </button>

            <div className="topbar-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>

        </header>

        {/* MENU MOBILE */}

        {mobileMenu && (
          <div className="mobile-dropdown">
            {navItems.map(item => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="page-wrapper">
          <div className="page-content">

            {/* =========================================
                ACCUEIL
            ========================================= */}

            {active === "home" && (
              <>
                <div className="welcome-card">
                  <div>
                    <div className="welcome-label">
                      BIENVENUE SUR TON ESPACE
                    </div>

                    <h2>Bonjour, {displayName} 👋</h2>

                    <p>
                      Organise tes cours, prépare tes examens
                      et progresse chaque jour avec DN MED STUDY.
                    </p>

                    <button onClick={() => navigate("courses")}>
                      <BookOpen size={16} />
                      Explorer mes cours
                    </button>
                  </div>

                  <div className="welcome-icon">
                    <Stethoscope size={100} />
                  </div>
                </div>

                <div className="stats-grid">

                  <div className="stat-card">
                    <IconTile
                      icon={BookOpen}
                      color="#2563EB"
                      background="#EAF1FF"
                    />

                    <div>
                      <strong>{courses.length}</strong>
                      <span>Cours disponibles</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <IconTile
                      icon={Layers}
                      color="#7C3AED"
                      background="#F1EAFE"
                    />

                    <div>
                      <strong>{subjects.length}</strong>
                      <span>Matières</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <IconTile
                      icon={ClipboardList}
                      color="#0891B2"
                      background="#E4F7FB"
                    />

                    <div>
                      <strong>{exams.length}</strong>
                      <span>Examens disponibles</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <IconTile
                      icon={History}
                      color="#059669"
                      background="#E7F8EF"
                    />

                    <div>
                      <strong>{history.length}</strong>
                      <span>Révisions effectuées</span>
                    </div>
                  </div>

                </div>

                <section className="content-section">
                  <div className="section-heading">
                    <div>
                      <h2>Outils d'apprentissage</h2>
                      <p>
                        Les outils pour améliorer tes révisions.
                      </p>
                    </div>
                  </div>

                  <div className="tools-grid">
                    {TOOLS.map(tool => {
                      const Icon = tool.icon;

                      return (
                        <button
                          className="tool-card"
                          key={tool.id}
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

                          <span className="tool-arrow">
                            Commencer
                            <ChevronRight size={15} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="content-section">
                  <div className="section-heading">
                    <div>
                      <h2>Activités récentes</h2>
                      <p>Retrouve tes dernières révisions.</p>
                    </div>

                    <button
                      className="text-button"
                      onClick={() => navigate("revision")}
                    >
                      Tout voir
                      <ChevronRight size={15} />
                    </button>
                  </div>

                  {history.length === 0 ? (
                    <EmptyState
                      icon={History}
                      title="Aucune activité récente"
                      description="Tes révisions apparaîtront ici."
                    />
                  ) : (
                    <div className="history-list">
                      {history.slice(0, 4).map(item => (
                        <div className="history-item" key={item.id}>
                          <IconTile
                            icon={FileCheck}
                            color="#059669"
                            background="#E7F8EF"
                            size={21}
                          />

                          <div className="history-info">
                            <strong>{item.titre}</strong>
                            <span>
                              {actionLabels[item.type] || item.type}
                            </span>
                          </div>

                          <span className="history-date">
                            {formatDate(item.createdAt)}
                          </span>

                          <button
                            className="icon-button"
                            onClick={() => ouvrirResultat(item)}
                          >
                            <Eye size={17} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {/* =========================================
                MES COURS
            ========================================= */}

            {active === "courses" && (
              <>
                <SectionTitle
                  eyebrow="BIBLIOTHÈQUE"
                  title="Mes cours"
                  description="Retrouve les cours et supports de formation."
                  action={
                    isAdmin && (
                      <button
                        className="primary-button"
                        onClick={() => setModal("course")}
                      >
                        <Plus size={17} />
                        Publier un cours
                      </button>
                    )
                  }
                />

                {selectedSubject && (
                  <button
                    className="back-button"
                    onClick={() => setSelectedSubject(null)}
                  >
                    <ArrowLeft size={16} />
                    Retour aux matières
                  </button>
                )}

                <div className="filter-panel">

                  <div className="search-box">
                    <Search size={18} />

                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Rechercher un cours ou une matière..."
                    />
                  </div>

                  <div className="filters-row">

                    <select
                      value={filterUniversity}
                      onChange={e => setFilterUniversity(e.target.value)}
                    >
                      <option value="">Toutes les universités</option>

                      {universities.map(value => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filterLevel}
                      onChange={e => setFilterLevel(e.target.value)}
                    >
                      <option value="">Tous les niveaux</option>

                      {levels.map(value => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filterSemester}
                      onChange={e => setFilterSemester(e.target.value)}
                    >
                      <option value="">Tous les semestres</option>

                      {semesters.map(value => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>

                  </div>
                </div>

                {!selectedSubject && (
                  <section className="content-section">
                    <div className="section-heading">
                      <div>
                        <h2>Matières disponibles</h2>
                        <p>
                          Sélectionne une matière pour voir ses cours.
                        </p>
                      </div>
                    </div>

                    {availableSubjects.length === 0 ? (
                      <EmptyState
                        icon={Layers}
                        title="Aucune matière disponible"
                        description="Les matières apparaîtront ici."
                      />
                    ) : (
                      <div className="subjects-grid">
                        {availableSubjects.map(subject => {
                          const count = courses.filter(course =>
                            course.matiere_id === subject.id ||
                            course.matiereId === subject.id
                          ).length;

                          return (
                            <div
                              className="subject-card"
                              key={subject.id}
                            >
                              <button
                                className="subject-main"
                                onClick={() => setSelectedSubject(subject)}
                              >
                                <IconTile
                                  icon={BookMarked}
                                  color="#2563EB"
                                  background="#EAF1FF"
                                />

                                <h3>{subject.nom}</h3>

                                <p>
                                  {subject.universite} · {subject.niveau}
                                </p>

                                <span>{subject.semestre}</span>
                              </button>

                              <div className="subject-footer">
                                <span>
                                  {count} cours
                                </span>

                                <ChevronRight size={17} />
                              </div>

                              {isAdmin && (
                                <button
                                  className="delete-subject"
                                  title="Supprimer la matière"
                                  onClick={() =>
                                    supprimerElement("matieres", subject.id)
                                  }
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                )}

                <section className="content-section">
                  <div className="section-heading">
                    <div>
                      <h2>
                        {selectedSubject
                          ? `Cours : ${selectedSubject.nom}`
                          : "Tous les cours"}
                      </h2>

                      <p>
                        {visibleCourses.length} document(s) disponible(s).
                      </p>
                    </div>
                  </div>

                  {visibleCourses.length === 0 ? (
                    <EmptyState
                      icon={FileText}
                      title="Aucun cours trouvé"
                      description="Aucun document ne correspond à ta recherche."
                    />
                  ) : (
                    <div className="lesson-list">
                      {visibleCourses.map(course => (
                        <div className="lesson-card" key={course.id}>
                          <IconTile
                            icon={FileText}
                            color="#DC2626"
                            background="#FEECEC"
                            size={23}
                          />

                          <div className="lesson-info">
                            <h3>{course.titre}</h3>

                            <p>
                              {course.matiere} · {course.niveau}
                              {course.semestre
                                ? ` · ${course.semestre}`
                                : ""}
                            </p>

                            {course.description && (
                              <p>{course.description}</p>
                            )}
                          </div>

                          <button
                            className="primary-button"
                            onClick={() => ouvrirCours(course)}
                          >
                            <ExternalLink size={15} />
                            Ouvrir
                          </button>

                          {isAdmin && (
                            <button
                              className="icon-button danger"
                              onClick={() =>
                                supprimerElement("cours", course.id)
                              }
                            >
                              <Trash2 size={17} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {/* =========================================
                EXAMENS
            ========================================= */}

            {active === "exams" && (
              <>
                <SectionTitle
                  eyebrow="ENTRAÎNEMENT"
                  title="Examens"
                  description="Prépare-toi avec les sujets des années précédentes."
                  action={
                    isAdmin && (
                      <button
                        className="primary-button"
                        onClick={() => setModal("exam")}
                      >
                        <Plus size={17} />
                        Ajouter un examen
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

                  <div className="filters-row">
                    <select
                      value={filterUniversity}
                      onChange={e => setFilterUniversity(e.target.value)}
                    >
                      <option value="">Toutes les universités</option>

                      {universities.map(value => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filterLevel}
                      onChange={e => setFilterLevel(e.target.value)}
                    >
                      <option value="">Tous les niveaux</option>

                      {levels.map(value => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filterSemester}
                      onChange={e => setFilterSemester(e.target.value)}
                    >
                      <option value="">Tous les semestres</option>

                      {semesters.map(value => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredExams.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    title="Aucun examen disponible"
                    description="Les sujets publiés apparaîtront ici."
                  />
                ) : (
                  <div className="exams-grid">
                    {filteredExams.map(exam => (
                      <div className="exam-card" key={exam.id}>
                        <div className="exam-top">
                          <IconTile
                            icon={FileCheck}
                            color="#2563EB"
                            background="#EAF1FF"
                          />

                          <span className="exam-year">
                            {exam.annee || "Année non précisée"}
                          </span>
                        </div>

                        <h3>{exam.titre}</h3>
                        <p>{exam.matiere}</p>

                        <div className="exam-details">
                          <span>{exam.niveau}</span>
                          <span>{exam.semestre}</span>
                        </div>

                        <div className="exam-actions">
                          <a
                            className="primary-button"
                            href={exam.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileText size={15} />
                            Voir le sujet
                          </a>

                          {exam.correction_url || exam.correctionUrl ? (
                            <a
                              className="outline-button"
                              href={exam.correction_url || exam.correctionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <CheckCircle2 size={15} />
                              Voir la correction
                            </a>
                          ) : (
                            <span className="no-correction">
                              Correction non disponible
                            </span>
                          )}
                        </div>

                        {isAdmin && (
                          <button
                            className="delete-exam"
                            onClick={() =>
                              supprimerElement("examens", exam.id)
                            }
                          >
                            <Trash2 size={15} />
                            Supprimer
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* =========================================
                RÉVISIONS ET HISTORIQUE
            ========================================= */}

            {active === "revision" && (
              <>
                <SectionTitle
                  eyebrow="PROGRESSION"
                  title="Mes révisions"
                  description="Retrouve les contenus générés par ton assistant IA."
                />

                {history.length === 0 ? (
                  <EmptyState
                    icon={Brain}
                    title="Aucune révision enregistrée"
                    description="Utilise l'assistant IA pour commencer."
                  />
                ) : (
                  <div className="history-list">
                    {history.map(item => (
                      <div className="history-item" key={item.id}>
                        <IconTile
                          icon={FileCheck}
                          color="#059669"
                          background="#E7F8EF"
                          size={21}
                        />

                        <div className="history-info">
                          <strong>{item.titre}</strong>

                          <span>
                            {actionLabels[item.type] || item.type}
                          </span>
                        </div>

                        <span className="history-date">
                          {formatDate(item.createdAt)}
                        </span>

                        <button
                          className="outline-button"
                          onClick={() => ouvrirResultat(item)}
                        >
                          <Eye size={15} />
                          Consulter
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* =========================================
                ASSISTANT IA
            ========================================= */}

            {active === "ai" && (
              <>
                <SectionTitle
                  eyebrow="INTELLIGENCE ARTIFICIELLE"
                  title="Assistant IA"
                  description="Transforme tes documents en outils de révision."
                />

                <div className="ai-container">

                  <div className="ai-intro">
                    <div className="ai-logo">
                      <Sparkles size={28} />
                    </div>

                    <div>
                      <h2>Ton assistant d'apprentissage</h2>

                      <p>
                        Importe un cours PDF et choisis ce que tu souhaites générer.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={lancerIA}>

                    <label className="upload-area">
                      <Upload size={30} />

                      <strong>
                        {aiFile
                          ? aiFile.name
                          : "Importer ton cours PDF"}
                      </strong>

                      <span>
                        Clique ici pour sélectionner un fichier.
                      </span>

                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        hidden
                        onChange={e => {
                          setAiFile(e.target.files?.[0] || null);
                          setAiResult("");
                        }}
                      />
                    </label>

                    <div className="ai-actions">
                      {[
                        {
                          id: "resume",
                          label: "Résumé",
                          icon: FileText
                        },
                        {
                          id: "qcm",
                          label: "QCM",
                          icon: ClipboardList
                        },
                        {
                          id: "flashcards",
                          label: "Flashcards",
                          icon: Layers
                        },
                        {
                          id: "question",
                          label: "Poser une question",
                          icon: Brain
                        }
                      ].map(action => {
                        const Icon = action.icon;

                        return (
                          <button
                            type="button"
                            key={action.id}
                            className={`ai-action ${
                              aiAction === action.id ? "selected" : ""
                            }`}
                            onClick={() => setAiAction(action.id)}
                          >
                            <Icon size={16} />
                            {action.label}
                          </button>
                        );
                      })}
                    </div>

                    {aiAction === "question" && (
                      <label className="field">
                        <span>Ta question</span>

                        <textarea
                          value={aiQuestion}
                          onChange={e => setAiQuestion(e.target.value)}
                          placeholder="Écris ta question sur le cours..."
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
                          Analyse en cours...
                        </>
                      ) : (
                        <>
                          <Sparkles size={17} />
                          Générer maintenant
                        </>
                      )}
                    </button>

                  </form>

                  {aiResult && (
                    <div className="ai-result">
                      <div className="result-header">
                        <h2>Résultat</h2>

                        <button
                          className="outline-button"
                          onClick={copierResultat}
                        >
                          <Download size={15} />
                          Copier
                        </button>
                      </div>

                      <div className="result-content">
                        {aiResult}
                      </div>
                    </div>
                  )}

                </div>
              </>
            )}

            {/* =========================================
                ADMINISTRATION
            ========================================= */}

            {active === "admin" && isAdmin && (
              <>
                <SectionTitle
                  eyebrow="GESTION DE LA PLATEFORME"
                  title="Administration"
                  description="Gère les contenus pédagogiques de DN MED STUDY."
                />

                <div className="stats-grid">
                  <div className="stat-card">
                    <IconTile
                      icon={BookOpen}
                      color="#2563EB"
                      background="#EAF1FF"
                    />

                    <div>
                      <strong>{courses.length}</strong>
                      <span>Cours publiés</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <IconTile
                      icon={Layers}
                      color="#7C3AED"
                      background="#F1EAFE"
                    />

                    <div>
                      <strong>{subjects.length}</strong>
                      <span>Matières créées</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <IconTile
                      icon={ClipboardList}
                      color="#0891B2"
                      background="#E4F7FB"
                    />

                    <div>
                      <strong>{exams.length}</strong>
                      <span>Examens publiés</span>
                    </div>
                  </div>
                </div>

                <div className="admin-grid">

                  <button
                    className="admin-card"
                    onClick={() => setModal("subject")}
                  >
                    <IconTile
                      icon={Plus}
                      color="#2563EB"
                      background="#EAF1FF"
                    />

                    <h3>Créer une matière</h3>

                    <p>
                      Ajouter une matière à la bibliothèque.
                    </p>

                    <ChevronRight size={20} />
                  </button>

                  <button
                    className="admin-card"
                    onClick={() => setModal("course")}
                  >
                    <IconTile
                      icon={Upload}
                      color="#059669"
                      background="#E7F8EF"
                    />

                    <h3>Publier un cours</h3>

                    <p>
                      Ajouter un document PDF aux matières.
                    </p>

                    <ChevronRight size={20} />
                  </button>

                  <button
                    className="admin-card"
                    onClick={() => setModal("exam")}
                  >
                    <IconTile
                      icon={FileCheck}
                      color="#7C3AED"
                      background="#F1EAFE"
                    />

                    <h3>Ajouter un examen</h3>

                    <p>
                      Publier un sujet et sa correction.
                    </p>

                    <ChevronRight size={20} />
                  </button>

                </div>
              </>
            )}

            {/* =========================================
                PARAMÈTRES
            ========================================= */}

            {active === "settings" && (
              <>
                <SectionTitle
                  eyebrow="PERSONNALISATION"
                  title="Paramètres"
                  description="Gère ton compte et tes préférences."
                />

                <div className="settings-card">

                  <div className="settings-row">
                    <IconTile
                      icon={UserRound}
                      color="#2563EB"
                      background="#EAF1FF"
                    />

                    <div>
                      <strong>Mon compte</strong>

                      <p>{user?.email}</p>
                    </div>
                  </div>

                  <div className="settings-row">
                    <IconTile
                      icon={ShieldCheck}
                      color="#059669"
                      background="#E7F8EF"
                    />

                    <div>
                      <strong>Statut du compte</strong>

                      <p>
                        {isAdmin ? "Administrateur" : "Étudiant"}
                      </p>
                    </div>
                  </div>

                  <div className="settings-row">
                    <IconTile
                      icon={Eye}
                      color="#7C3AED"
                      background="#F1EAFE"
                    />

                    <div>
                      <strong>Apparence</strong>

                      <p>
                        {dark ? "Mode sombre" : "Mode clair"}
                      </p>
                    </div>

                    <button
                      className="outline-button"
                      onClick={() => setDark(!dark)}
                    >
                      Changer
                    </button>
                  </div>

                  <div className="settings-row">
                    <IconTile
                      icon={LogOut}
                      color="#DC2626"
                      background="#FEECEC"
                    />

                    <div>
                      <strong>Déconnexion</strong>

                      <p>
                        Quitter ton espace personnel.
                      </p>
                    </div>

                    <button
                      className="outline-button danger"
                      onClick={deconnexion}
                    >
                      <LogOut size={15} />
                      Déconnexion
                    </button>
                  </div>

                </div>
              </>
            )}

          </div>
        </div>

        {/* NAVIGATION MOBILE */}

        <nav className="mobile-bottom-nav">
          {[
            { id: "home", label: "Accueil", icon: Home },
            { id: "courses", label: "Cours", icon: BookOpen },
            { id: "ai", label: "Assistant", icon: Sparkles },
            { id: "exams", label: "Examens", icon: ClipboardList },
            { id: "settings", label: "Compte", icon: UserRound }
          ].map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={active === item.id ? "active" : ""}
                onClick={() => navigate(item.id)}
              >
                <Icon size={19} />
                {item.label}
              </button>
            );
          })}
        </nav>

      </div>

      {/* =========================================
          MODALE : CRÉER UNE MATIÈRE
      ========================================= */}

      {modal === "subject" && (
        <Modal
          title="Créer une matière"
          onClose={() => setModal("")}
        >
          <form className="modal-form" onSubmit={ajouterMatiere}>

            <Field
              label="Université"
              value={subjectForm.universite}
              onChange={value =>
                setSubjectForm({ ...subjectForm, universite: value })
              }
              placeholder="Ex : UCAD"
              required
            />

            <Field
              label="Filière"
              value={subjectForm.filiere}
              onChange={value =>
                setSubjectForm({ ...subjectForm, filiere: value })
              }
              placeholder="Ex : Médecine"
              required
            />

            <Field
              label="Niveau"
              value={subjectForm.niveau}
              onChange={value =>
                setSubjectForm({ ...subjectForm, niveau: value })
              }
              placeholder="Ex : Deuxième année"
              required
            />

            <SelectField
              label="Semestre"
              value={subjectForm.semestre}
              onChange={value =>
                setSubjectForm({ ...subjectForm, semestre: value })
              }
              options={semesters}
            />

            <Field
              label="Nom de la matière"
              value={subjectForm.nom}
              onChange={value =>
                setSubjectForm({ ...subjectForm, nom: value })
              }
              placeholder="Ex : Anatomie"
              required
            />

            <button
              className="primary-button full-button"
              type="submit"
              disabled={busy}
            >
              {busy ? "Enregistrement..." : "Créer la matière"}
            </button>

          </form>
        </Modal>
      )}

      {/* =========================================
          MODALE : PUBLIER UN COURS
      ========================================= */}

      {modal === "course" && (
        <Modal
          title="Publier un cours"
          onClose={() => setModal("")}
        >
          <form className="modal-form" onSubmit={ajouterLecon}>

            <Field
              label="Titre du cours"
              value={courseForm.titre}
              onChange={value =>
                setCourseForm({ ...courseForm, titre: value })
              }
              placeholder="Ex : Introduction à l'anatomie"
              required
            />

            <SelectField
              label="Matière"
              value={courseForm.matiereId}
              onChange={value =>
                setCourseForm({ ...courseForm, matiereId: value })
              }
              options={subjects.map(subject => ({
                value: subject.id,
                label: subject.nom
              }))}
            />

            <label className="field">
              <span>Fichier PDF</span>

              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={e =>
                  setLessonFile(e.target.files?.[0] || null)
                }
              />
            </label>

            {lessonFile && (
              <div className="file-selected">
                <FileCheck size={16} />
                {lessonFile.name}
              </div>
            )}

            <div className="separator-text">
              OU UTILISER UN LIEN PDF
            </div>

            <Field
              label="Lien du PDF"
              value={courseForm.url}
              onChange={value =>
                setCourseForm({ ...courseForm, url: value })
              }
              placeholder="https://..."
            />

            <label className="field">
              <span>Description</span>

              <textarea
                value={courseForm.description}
                onChange={e =>
                  setCourseForm({
                    ...courseForm,
                    description: e.target.value
                  })
                }
                placeholder="Description facultative du cours..."
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
              className="primary-button full-button"
              type="submit"
              disabled={busy}
            >
              {busy ? "Publication..." : "Publier le cours"}
            </button>

          </form>
        </Modal>
      )}

      {/* =========================================
          MODALE : AJOUTER UN EXAMEN
      ========================================= */}

      {modal === "exam" && (
        <Modal
          title="Ajouter un examen"
          onClose={() => setModal("")}
        >
          <form className="modal-form" onSubmit={ajouterExamen}>

            <Field
              label="Titre du sujet"
              value={examForm.titre}
              onChange={value =>
                setExamForm({ ...examForm, titre: value })
              }
              placeholder="Ex : Examen d'anatomie"
              required
            />

            <Field
              label="Université"
              value={examForm.universite}
              onChange={value =>
                setExamForm({ ...examForm, universite: value })
              }
              placeholder="Ex : UCAD"
            />

            <Field
              label="Filière"
              value={examForm.filiere}
              onChange={value =>
                setExamForm({ ...examForm, filiere: value })
              }
              placeholder="Ex : Médecine"
            />

            <Field
              label="Niveau"
              value={examForm.niveau}
              onChange={value =>
                setExamForm({ ...examForm, niveau: value })
              }
              placeholder="Ex : Deuxième année"
            />

            <SelectField
              label="Semestre"
              value={examForm.semestre}
              onChange={value =>
                setExamForm({ ...examForm, semestre: value })
              }
              options={semesters}
            />

            <Field
              label="Matière"
              value={examForm.matiere}
              onChange={value =>
                setExamForm({ ...examForm, matiere: value })
              }
              placeholder="Ex : Physiologie"
              required
            />

            <Field
              label="Année"
              value={examForm.annee}
              onChange={value =>
                setExamForm({ ...examForm, annee: value })
              }
              placeholder="Ex : 2025"
            />

            <Field
              label="Lien du sujet"
              value={examForm.url}
              onChange={value =>
                setExamForm({ ...examForm, url: value })
              }
              placeholder="https://..."
              required
            />

            <Field
              label="Lien de correction (facultatif)"
              value={examForm.correctionUrl}
              onChange={value =>
                setExamForm({
                  ...examForm,
                  correctionUrl: value
                })
              }
              placeholder="https://..."
            />

            <button
              className="primary-button full-button"
              type="submit"
              disabled={busy}
            >
              {busy ? "Enregistrement..." : "Publier l'examen"}
            </button>

          </form>
        </Modal>
      )}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; }

        body {
          margin: 0;
          font-family: 'DM Sans', sans-serif;
          background: #F5F7FB;
          color: #172B43;
        }

        button, input, select, textarea { font: inherit; }
        button { cursor: pointer; }
        button:disabled { opacity: .6; cursor: not-allowed; }

        .app-shell {
          min-height: 100vh;
          display: flex;
          background: #F5F7FB;
          color: #172B43;
        }

        .sidebar {
          width: 255px;
          background: #10243A;
          color: white;
          padding: 26px 17px;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          min-height: 100vh;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 8px 38px;
        }

        .brand-mark {
          width: 43px;
          height: 43px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: white;
          background: linear-gradient(135deg, #2563EB, #06B6D4);
          font-size: 19px;
          font-weight: 800;
        }

        .brand strong {
          display: block;
          font-size: 14px;
          letter-spacing: .5px;
        }

        .brand span {
          display: block;
          margin-top: 4px;
          font-size: 11px;
          color: #AAB8C8;
        }

        .sidebar-label {
          padding: 0 11px;
          color: #91A4B8;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.3px;
          margin-bottom: 14px;
        }

        .side-navigation { display: grid; gap: 7px; }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 13px;
          width: 100%;
          padding: 13px 12px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: #BDCAD8;
          text-align: left;
          font-size: 13px;
          font-weight: 600;
        }

        .nav-item:hover, .nav-item.active {
          color: white;
          background: #243D59;
        }

        .nav-item.active { box-shadow: inset 3px 0 #3B82F6; }

        .sidebar-bottom { margin-top: auto; }

        .sidebar-profile {
          display: flex;
          align-items: center;
          gap: 11px;
          border-top: 1px solid #31475D;
          margin-top: 20px;
          padding: 20px 5px 0;
        }

        .avatar, .topbar-avatar {
          width: 37px;
          height: 37px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #2563EB;
          color: white;
          font-weight: 800;
        }

        .sidebar-profile strong {
          display: block;
          font-size: 12px;
        }

        .sidebar-profile span {
          display: block;
          color: #AAB8C8;
          font-size: 10px;
          margin-top: 4px;
        }

        .main-area { flex: 1; min-width: 0; }

        .topbar {
          height: 75px;
          background: white;
          border-bottom: 1px solid #E8EDF3;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 35px;
        }

        .topbar-title span {
          display: block;
          font-size: 10px;
          color: #8494A7;
          letter-spacing: 1px;
          font-weight: 700;
        }

        .topbar-title strong {
          display: block;
          margin-top: 3px;
          font-size: 16px;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .page-wrapper {
          max-width: 1450px;
          margin: auto;
          padding: 35px;
        }

        .page-content { display: grid; gap: 27px; }

        .section-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .eyebrow {
          color: #2563EB;
          font-size: 10px;
          letter-spacing: 1.5px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .section-title h1 {
          font-size: 29px;
          margin: 0;
          font-weight: 800;
          letter-spacing: -.7px;
        }

        .section-title p {
          color: #7B8A9B;
          font-size: 13px;
          margin: 8px 0 0;
        }

        .welcome-card {
          min-height: 225px;
          border-radius: 19px;
          background: linear-gradient(110deg, #10243A, #1D4770);
          color: white;
          padding: 34px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          overflow: hidden;
        }

        .welcome-label {
          font-size: 10px;
          letter-spacing: 2px;
          color: #8BC8FF;
          font-weight: 800;
        }

        .welcome-card h2 { font-size: 29px; margin: 13px 0 8px; }

        .welcome-card p {
          max-width: 480px;
          color: #C1D2E4;
          font-size: 13px;
          line-height: 1.7;
        }

        .welcome-card button {
          margin-top: 12px;
          padding: 11px 16px;
          border: 0;
          border-radius: 9px;
          background: white;
          color: #10243A;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 12px;
        }

        .welcome-icon { color: #8BC8FF; opacity: .65; padding: 20px; }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
        }

        .stat-card {
          min-height: 100px;
          background: white;
          border: 1px solid #E9EEF4;
          border-radius: 14px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .stat-card strong { display: block; font-size: 23px; font-weight: 800; }
        .stat-card span { display: block; font-size: 11px; color: #8391A2; margin-top: 5px; }

        .icon-tile {
          width: 45px;
          height: 45px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .content-section { display: grid; gap: 17px; }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .section-heading h2 { font-size: 18px; margin: 0; }
        .section-heading p { color: #8391A2; font-size: 12px; margin: 5px 0 0; }

        .tools-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .tool-card {
          background: white;
          border: 1px solid #E9EEF4;
          border-radius: 15px;
          text-align: left;
          padding: 21px;
          transition: .2s;
        }

        .tool-card:hover, .subject-card:hover, .admin-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 25px #172B4310;
        }

        .tool-card h3 { font-size: 15px; margin: 17px 0 7px; }

        .tool-card p {
          font-size: 12px;
          color: #8391A2;
          line-height: 1.6;
          min-height: 38px;
        }

        .tool-arrow {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 17px;
          color: #2563EB;
          font-size: 12px;
          font-weight: 700;
        }

        .text-button {
          display: flex;
          align-items: center;
          gap: 5px;
          border: 0;
          background: transparent;
          color: #2563EB;
          font-size: 12px;
          font-weight: 700;
        }

        .history-list, .lesson-list { display: grid; gap: 10px; }

        .history-item, .lesson-card {
          background: white;
          border: 1px solid #E9EEF4;
          border-radius: 12px;
          padding: 13px 16px;
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .history-info, .lesson-info { flex: 1; min-width: 0; }

        .history-info strong, .lesson-info h3 {
          display: block;
          font-size: 13px;
          margin: 0;
        }

        .history-info span, .lesson-info p {
          display: block;
          font-size: 11px;
          color: #8391A2;
          margin: 5px 0 0;
        }

        .history-date { color: #8391A2; font-size: 11px; }

        .filter-panel {
          background: white;
          border: 1px solid #E9EEF4;
          border-radius: 14px;
          padding: 17px;
          display: grid;
          gap: 13px;
        }

        .search-box {
          height: 43px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #E4EAF1;
          border-radius: 9px;
          padding: 0 12px;
          color: #8391A2;
        }

        .search-box input {
          width: 100%;
          border: 0;
          outline: none;
          color: #172B43;
          background: transparent;
          font-size: 12px;
        }

        .filters-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .filters-row select, .field input, .field select,
        .field textarea {
          width: 100%;
          min-height: 42px;
          border: 1px solid #E2E8F0;
          border-radius: 9px;
          padding: 10px 12px;
          background: white;
          color: #172B43;
          outline: none;
          font-size: 12px;
        }

        .subjects-grid, .exams-grid, .admin-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }

        .subject-card, .exam-card, .admin-card {
          position: relative;
          background: white;
          border: 1px solid #E9EEF4;
          border-radius: 14px;
          padding: 19px;
          transition: .2s;
        }

        .subject-main {
          display: block;
          width: 100%;
          border: 0;
          background: transparent;
          text-align: left;
          padding: 0;
          color: inherit;
        }

        .subject-main h3, .exam-card h3, .admin-card h3 {
          font-size: 15px;
          margin: 14px 0 6px;
        }

        .subject-main p, .exam-card p, .admin-card p {
          font-size: 11px;
          color: #8391A2;
          margin: 0 0 10px;
        }

        .subject-main > span {
          font-size: 10px;
          color: #2563EB;
          font-weight: 700;
        }

        .subject-footer {
          border-top: 1px solid #EDF1F5;
          padding-top: 12px;
          margin-top: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #2563EB;
          font-size: 11px;
          font-weight: 700;
        }

        .delete-subject, .delete-exam {
          border: 0;
          background: #FEECEC;
          color: #DC2626;
          border-radius: 8px;
          padding: 8px;
        }

        .delete-subject { position: absolute; top: 17px; right: 17px; }

        .primary-button, .outline-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 9px;
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
        }

        .primary-button {
          border: 1px solid #2563EB;
          background: #2563EB;
          color: white;
        }

        .primary-button:hover { background: #1D4ED8; }

        .outline-button {
          border: 1px solid #DCE5EF;
          background: white;
          color: #2563EB;
        }

        .outline-button:hover { background: #EFF6FF; }

        .icon-button {
          width: 37px;
          height: 37px;
          display: inline-grid;
          place-items: center;
          border: 1px solid #E7EDF4;
          border-radius: 9px;
          background: white;
          color: #526579;
        }

        .danger { color: #DC2626; }

        .exam-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .exam-year { font-size: 10px; color: #8391A2; }

        .exam-details { display: flex; gap: 7px; margin: 14px 0; }

        .exam-details span {
          padding: 6px 9px;
          background: #F1F5F9;
          border-radius: 6px;
          font-size: 10px;
          color: #526579;
        }

        .exam-actions { display: grid; gap: 9px; }

        .no-correction {
          font-size: 11px;
          color: #8391A2;
          text-align: center;
        }

        .delete-exam {
          margin-top: 13px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .back-button {
          border: 0;
          background: transparent;
          color: #2563EB;
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 700;
        }

        .empty-state {
          background: white;
          border: 1px dashed #DCE5EF;
          border-radius: 14px;
          padding: 45px 20px;
          text-align: center;
        }

        .empty-icon { color: #94A3B8; margin-bottom: 12px; }
        .empty-state h3 { margin: 0; font-size: 15px; }
        .empty-state p { font-size: 12px; color: #8391A2; }

        .ai-container, .settings-card {
          background: white;
          border: 1px solid #E9EEF4;
          border-radius: 16px;
          padding: 25px;
        }

        .ai-intro {
          display: flex;
          gap: 15px;
          align-items: center;
          margin-bottom: 23px;
        }

        .ai-logo {
          width: 55px;
          height: 55px;
          display: grid;
          place-items: center;
          background: #EAF1FF;
          color: #2563EB;
          border-radius: 15px;
        }

        .ai-intro h2 { font-size: 17px; margin: 0 0 6px; }
        .ai-intro p { color: #8391A2; font-size: 12px; margin: 0; }

        .upload-area {
          min-height: 150px;
          border: 2px dashed #CBD8E7;
          border-radius: 13px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: #2563EB;
          background: #F8FAFC;
          cursor: pointer;
        }

        .upload-area strong { font-size: 13px; color: #172B43; }
        .upload-area span { font-size: 11px; color: #8391A2; }

        .ai-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin: 18px 0;
        }

        .ai-action {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 13px;
          border: 1px solid #E2E8F0;
          border-radius: 9px;
          background: white;
          color: #526579;
          font-size: 11px;
          font-weight: 700;
        }

        .ai-action.selected {
          background: #EFF6FF;
          color: #2563EB;
          border-color: #93C5FD;
        }

        .field { display: grid; gap: 7px; margin-bottom: 15px; }

        .field > span {
          color: #526579;
          font-size: 11px;
          font-weight: 700;
        }

        .field textarea { resize: vertical; min-height: 90px; }

        .ai-submit { width: 100%; min-height: 46px; }

        .ai-result {
          margin-top: 25px;
          border-top: 1px solid #E9EEF4;
          padding-top: 23px;
        }

        .result-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .result-header h2 { font-size: 18px; margin: 0; }

        .result-content {
          white-space: pre-wrap;
          line-height: 1.8;
          font-size: 13px;
          color: #334155;
          background: #F8FAFC;
          padding: 20px;
          border-radius: 11px;
          margin-top: 15px;
          overflow-wrap: anywhere;
        }

        .admin-card { text-align: left; color: inherit; cursor: pointer; }

        .admin-card > svg {
          position: absolute;
          right: 18px;
          bottom: 20px;
          color: #2563EB;
        }

        .settings-card { display: grid; }

        .settings-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 17px 0;
          border-bottom: 1px solid #EDF1F5;
        }

        .settings-row:last-child { border-bottom: 0; }
        .settings-row > div:nth-child(2) { flex: 1; }
        .settings-row strong { font-size: 13px; }
        .settings-row p { font-size: 11px; color: #8391A2; margin: 5px 0 0; }

        .upload-progress { margin: 12px 0 18px; }

        .progress-label {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #526579;
          margin-bottom: 8px;
        }

        .progress-track {
          width: 100%;
          height: 9px;
          background: #E5EAF1;
          border-radius: 20px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #2563EB, #06B6D4);
          border-radius: 20px;
          transition: width .2s ease;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: #0F172A99;
          overflow-y: auto;
        }

        .modal-card {
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          background: white;
          border-radius: 16px;
          padding: 23px;
          box-shadow: 0 25px 80px #0003;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
        }

        .modal-header h2 { font-size: 18px; margin: 0; }
        .modal-form { display: grid; gap: 2px; }
        .full-button { width: 100%; margin-top: 9px; }

        .file-selected {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #059669;
          overflow-wrap: anywhere;
        }

        .separator-text {
          text-align: center;
          font-size: 10px;
          font-weight: 800;
          color: #94A3B8;
          margin: 5px 0 13px;
        }

        .loading-screen {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 15px;
          background: #F5F7FB;
        }

        .loading-screen p { color: #8391A2; font-size: 12px; }

        .spin { animation: spin 1s linear infinite; }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .mobile-menu-button, .mobile-dropdown, .mobile-bottom-nav {
          display: none;
        }

        .dark-mode {
          background: #101D2C;
          color: #E5EDF7;
        }

        .dark-mode .main-area,
        .dark-mode .page-wrapper { background: #101D2C; }

        .dark-mode .topbar,
        .dark-mode .stat-card,
        .dark-mode .tool-card,
        .dark-mode .subject-card,
        .dark-mode .exam-card,
        .dark-mode .admin-card,
        .dark-mode .history-item,
        .dark-mode .lesson-card,
        .dark-mode .filter-panel,
        .dark-mode .ai-container,
        .dark-mode .settings-card,
        .dark-mode .empty-state {
          background: #192A3C;
          border-color: #2C4055;
          color: #E5EDF7;
        }

        .dark-mode .section-title p,
        .dark-mode .section-heading p,
        .dark-mode .tool-card p,
        .dark-mode .subject-main p,
        .dark-mode .exam-card p,
        .dark-mode .admin-card p,
        .dark-mode .history-info span,
        .dark-mode .lesson-info p {
          color: #A9B8C8;
        }

        .dark-mode .search-box,
        .dark-mode .filters-row select,
        .dark-mode .field input,
        .dark-mode .field select,
        .dark-mode .field textarea,
        .dark-mode .outline-button,
        .dark-mode .icon-button {
          background: #192A3C;
          color: #E5EDF7;
          border-color: #354A60;
        }

        .dark-mode .search-box input { color: white; }

        .dark-mode .result-content {
          background: #10243A;
          color: #E5EDF7;
        }

        @media (max-width: 1050px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }

          .subjects-grid, .exams-grid, .admin-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .page-wrapper { padding: 25px; }
        }

        @media (max-width: 700px) {
          .sidebar { display: none; }

          .topbar {
            height: 65px;
            padding: 0 15px;
          }

          .mobile-menu-button {
            display: grid;
            place-items: center;
            width: 38px;
            height: 38px;
            border: 0;
            border-radius: 9px;
            background: #EFF6FF;
            color: #2563EB;
          }

          .topbar-title { flex: 1; margin-left: 12px; }
          .topbar-title span { font-size: 9px; }
          .topbar-title strong { font-size: 13px; }
          .topbar-right { gap: 8px; }

          .topbar-avatar {
            width: 32px;
            height: 32px;
          }

          .page-wrapper { padding: 22px 15px 100px; }

          .section-title {
            align-items: flex-start;
            flex-direction: column;
          }

          .section-title h1 { font-size: 24px; }

          .welcome-card {
            padding: 23px;
            min-height: 190px;
          }

          .welcome-card h2 { font-size: 23px; }
          .welcome-icon { display: none; }

          .stats-grid { gap: 10px; }

          .stat-card {
            padding: 13px;
            min-height: 83px;
            gap: 9px;
          }

          .stat-card .icon-tile {
            width: 37px;
            height: 37px;
          }

          .stat-card strong { font-size: 19px; }
          .stat-card span { font-size: 10px; }

          .tools-grid, .subjects-grid, .exams-grid, .admin-grid {
            grid-template-columns: 1fr;
          }

          .filters-row { grid-template-columns: 1fr; }

          .history-item, .lesson-card { flex-wrap: wrap; }
          .history-date { margin-left: auto; }
          .lesson-info { min-width: 55%; }

          .ai-container { padding: 17px; }

          .ai-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .mobile-dropdown {
            display: grid;
            position: absolute;
            z-index: 50;
            top: 60px;
            left: 12px;
            width: min(260px, calc(100vw - 24px));
            background: white;
            border: 1px solid #E5EAF0;
            border-radius: 12px;
            padding: 8px;
            box-shadow: 0 15px 35px #0002;
          }

          .mobile-dropdown button {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            border: 0;
            border-radius: 8px;
            background: transparent;
            color: #172B43;
            text-align: left;
            font-size: 12px;
          }

          .mobile-dropdown button:hover {
            background: #EFF6FF;
            color: #2563EB;
          }

          .mobile-bottom-nav {
            position: fixed;
            z-index: 40;
            bottom: 0;
            left: 0;
            right: 0;
            height: 67px;
            display: flex;
            justify-content: space-around;
            align-items: center;
            background: white;
            border-top: 1px solid #E8EDF3;
            padding-bottom: env(safe-area-inset-bottom);
          }

          .mobile-bottom-nav button {
            border: 0;
            background: transparent;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            color: #8391A2;
            font-size: 9px;
          }

          .mobile-bottom-nav button.active {
            color: #2563EB;
            font-weight: 800;
          }

          .dark-mode .mobile-bottom-nav,
          .dark-mode .mobile-dropdown {
            background: #192A3C;
            border-color: #354A60;
          }

          .dark-mode .mobile-dropdown button { color: #E5EDF7; }

          .modal-card { padding: 18px; }
        }

        input, textarea, select {
          font-size: 16px;
          max-width: 100%;
        }

        .field input:focus,
        .field textarea:focus,
        .field select:focus,
        .search-box:focus-within {
          border-color: #60A5FA;
          box-shadow: 0 0 0 3px #2563EB18;
        }

        .modal-card {
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        .field input, .field textarea {
          scroll-margin-bottom: 120px;
        }
      `}</style>
    </main>
  );
        }


