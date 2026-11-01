"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Home, BookOpen, Brain, ClipboardList, Sparkles,
  GraduationCap, CalendarDays, Layers, FileText,
  Search, Plus, X, Menu, ChevronRight, ArrowLeft,
  Upload, ExternalLink, Trash2, Pencil, Clock,
  ChartNoAxesCombined, FolderOpen, University,
  NotebookText, FilePlus2, Settings, LogOut,
  UserRound, CheckCircle2, LoaderCircle, Download,
  MessageCircle, Send, BookMarked, Filter, RefreshCw,
  Stethoscope, ShieldCheck, History, Bookmark,
  FileCheck, Eye
} from "lucide-react";

import {
  collection, addDoc, getDocs, deleteDoc, doc,
  query, orderBy, serverTimestamp, setDoc, getDoc
} from "firebase/firestore";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";

/* =====================================================
   DN MED STUDY — PREMIUM V2
===================================================== */

const ADMIN_EMAIL = "djibyndiaye742@gmail.com";

const COLORS = {
  navy: "#10243A",
  blue: "#2563EB",
  cyan: "#06B6D4",
  green: "#10B981",
  background: "#F5F7FB"
};

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

/* =====================================================
   COMPOSANTS VISUELS
===================================================== */

function IconTile({ icon: Icon, color, background, size = 27 }) {
  return (
    <div
      className="icon-tile"
      style={{ color, background }}
    >
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

function EmptyState({ icon: Icon = FolderOpen, title, description }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={35} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required = false }) {
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
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Sélectionner</option>
        {options.map((option, index) => (
          <option key={index} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

/* =====================================================
   APPLICATION
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

  const isAdmin = normalize(user?.email) === ADMIN_EMAIL.toLowerCase();

  /* AUTHENTIFICATION */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      if (!currentUser) {
        window.location.href = "/connexion";
        return;
      }

      setUser(currentUser);

      try {
        const profileSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (profileSnap.exists()) setProfile(profileSnap.data());
      } catch (error) {
        console.error("Profil :", error);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /* CHARGEMENT FIREBASE */

  async function chargerDonnees() {
    setBusy(true);

    try {
      const [courseSnap, subjectSnap, examSnap] = await Promise.all([
        getDocs(collection(db, "cours")),
        getDocs(collection(db, "matieres")),
        getDocs(collection(db, "examens"))
      ]);

      setCourses(courseSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSubjects(subjectSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setExams(examSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      if (user) {
        try {
          const historyQuery = query(
            collection(db, "users", user.uid, "resultats"),
            orderBy("createdAt", "desc")
          );

          const historySnap = await getDocs(historyQuery);
          setHistory(historySnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch {
          setHistory([]);
        }
      }
    } catch (error) {
      console.error(error);
      alert("Impossible de charger les données. Vérifie les règles Firebase.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (user) chargerDonnees();
  }, [user]);

  /* DONNÉES DE FILTRAGE */

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

  const semesters = ["Premier semestre", "Deuxième semestre"];

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

      return matchesSearch && matchesUniversity && matchesLevel && matchesSemester;
    });
  }, [courses, search, filterUniversity, filterLevel, filterSemester]);

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
  }, [exams, search, filterUniversity, filterLevel, filterSemester]);

  const groupedCourses = useMemo(() => {
    return filteredCourses.reduce((groups, course) => {
      const subject = course.matiere || course.subject || "Autres cours";
      if (!groups[subject]) groups[subject] = [];
      groups[subject].push(course);
      return groups;
    }, {});
  }, [filteredCourses]);

  /* AJOUTER UNE MATIÈRE */

  async function ajouterMatiere(e) {
    e.preventDefault();

    if (!isAdmin) return;

    if (
      !subjectForm.universite ||
      !subjectForm.filiere ||
      !subjectForm.niveau ||
      !subjectForm.semestre ||
      !subjectForm.nom
    ) {
      return alert("Complète tous les champs.");
    }

    setBusy(true);

    try {
      await addDoc(collection(db, "matieres"), {
        ...subjectForm,
        nom: subjectForm.nom.trim(),
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
      console.error(error);
      alert("Erreur lors de l'enregistrement de la matière.");
    } finally {
      setBusy(false);
    }
  }

  /* AJOUTER UNE LEÇON */

  async function ajouterLecon(e) {
    e.preventDefault();

    if (!isAdmin) return;

    const subject = subjects.find(s => s.id === courseForm.matiereId);

    if (!subject) return alert("Sélectionne une matière.");
    if (!courseForm.titre.trim()) return alert("Ajoute le titre de la leçon.");
    if (!courseForm.url.startsWith("https://")) {
      return alert("Ajoute un lien PDF valide commençant par https://");
    }

    setBusy(true);

    try {
      await addDoc(collection(db, "cours"), {
        titre: courseForm.titre.trim(),
        matiere: subject.nom,
        matiereId: subject.id,
        universite: subject.universite,
        filiere: subject.filiere,
        niveau: subject.niveau,
        semestre: subject.semestre,
        description: courseForm.description,
        url: courseForm.url.trim(),
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      setCourseForm({
        titre: "",
        matiereId: "",
        url: "",
        description: ""
      });

      setModal("");
      await chargerDonnees();
      alert("Leçon publiée avec succès.");
    } catch (error) {
      console.error(error);
      alert("Impossible de publier la leçon.");
    } finally {
      setBusy(false);
    }
  }

  /* AJOUTER UN EXAMEN */

  async function ajouterExamen(e) {
    e.preventDefault();

    if (!isAdmin) return;

    if (!examForm.titre || !examForm.matiere || !examForm.url) {
      return alert("Le titre, la matière et le lien du sujet sont obligatoires.");
    }

    if (!examForm.url.startsWith("https://")) {
      return alert("Le lien du sujet doit commencer par https://");
    }

    if (
      examForm.correctionUrl &&
      !examForm.correctionUrl.startsWith("https://")
    ) {
      return alert("Le lien de correction doit commencer par https://");
    }

    setBusy(true);

    try {
      await addDoc(collection(db, "examens"), {
        ...examForm,
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
      console.error(error);
      alert("Impossible d'enregistrer cet examen.");
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
      console.error(error);
      alert("Suppression impossible. Vérifie les règles Firebase.");
    }
  }

  /* OUVRIR UN COURS */

  function ouvrirCours(course) {
    const url = getCourseUrl(course);
    if (!url) return alert("Aucun document disponible.");
    window.open(url, "_blank", "noopener,noreferrer");
  }

  /* IA GEMINI */

  async function lancerIA(e) {
    e.preventDefault();

    if (!aiFile) return alert("Sélectionne un fichier PDF.");

    setBusy(true);
    setAiResult("");

    try {
      const formData = new FormData();
      formData.append("fichier", aiFile);
      formData.append("action", aiAction);

      if (aiQuestion) {
        formData.append("question", aiQuestion);
      }

      const response = await fetch("/api/ia", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur pendant l'analyse.");
      }

      const result =
        data.resultat ||
        data.result ||
        data.reponse ||
        data.text ||
        data.contenu ||
        JSON.stringify(data);

      setAiResult(result);

      if (user) {
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
      console.error(error);
      alert(error.message || "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  async function poserQuestion(e) {
    e.preventDefault();

    if (!aiQuestion.trim()) return;

    setAiAction("chat");

    if (!aiFile) {
      return alert("Sélectionne d'abord un PDF pour poser une question sur ton cours.");
    }

    await lancerIA(e);
  }

  async function deconnexion() {
    await signOut(auth);
    window.location.href = "/connexion";
  }

  /* NAVIGATION */

  function navigate(id) {
    setActive(id);
    setMobileMenu(false);
    setSelectedSubject(null);
    setSearch("");
  }

  /* CHARGEMENT */

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="brand-mark">DN</div>
        <LoaderCircle className="spin" size={28} />
        <p>Préparation de ton espace d'études...</p>
      </div>
    );
  }

  const displayName =
    profile.prenom ||
    profile.nom ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Étudiant";

  /* =====================================================
     RENDU DE L'APPLICATION
  ===================================================== */

  return (
    <main className={dark ? "app dark" : "app"}>

      {/* SIDEBAR ORDINATEUR */}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">DN</div>
          <div>
            <strong>DN Med Study</strong>
            <small>Medical learning platform</small>
          </div>
        </div>

        <div className="sidebar-label">ESPACE DE TRAVAIL</div>

        <nav className="side-nav">
          {NAVIGATION.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={active === item.id ? "nav-item active" : "nav-item"}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {active === item.id && <span className="active-line" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          {isAdmin && (
            <button className="admin-shortcut" onClick={() => navigate("admin")}>
              <ShieldCheck size={18} />
              Administration
            </button>
          )}

          <button className="nav-item" onClick={() => setDark(!dark)}>
            <Settings size={19} />
            <span>Apparence</span>
          </button>

          <div className="user-box">
            <div className="avatar">{displayName.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <strong>{displayName}</strong>
              <small>{isAdmin ? "Administrateur" : "Étudiant"}</small>
            </div>
            <button className="icon-button" onClick={deconnexion}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}

      <div className="main-area">

        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)}>
              <Menu size={22} />
            </button>
            <div className="breadcrumb">
              <span>DN Med Study</span>
              <ChevronRight size={14} />
              <strong>
                {NAVIGATION.find(n => n.id === active)?.label ||
                  (active === "admin" ? "Administration" : "Espace personnel")}
              </strong>
            </div>
          </div>

          <div className="topbar-right">
            <button className="icon-button" onClick={chargerDonnees} title="Actualiser">
              <RefreshCw size={18} />
            </button>
            <div className="top-avatar">{displayName.charAt(0).toUpperCase()}</div>
          </div>
        </header>

        {mobileMenu && (
          <div className="mobile-dropdown">
            {NAVIGATION.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => navigate(item.id)}>
                  <Icon size={19} /> {item.label}
                </button>
              );
            })}
            {isAdmin && (
              <button onClick={() => navigate("admin")}>
                <ShieldCheck size={19} /> Administration
              </button>
            )}
          </div>
        )}

        <div className="page-content">

          {/* ACCUEIL */}

          {active === "home" && (
            <>
              <section className="welcome-banner">
                <div className="welcome-content">
                  <div className="welcome-tag">
                    <Stethoscope size={14} />
                    ESPACE UNIVERSITAIRE
                  </div>

                  <h1>Bienvenue, {displayName}.</h1>

                  <p>
                    Apprends, comprends et prépare tes examens.
                    Retrouve tous tes cours de médecine au même endroit.
                  </p>

                  <button className="primary-button light-button" onClick={() => navigate("courses")}>
                    Explorer les cours <ChevronRight size={17} />
                  </button>
                </div>

                <div className="welcome-graphic">
                  <div className="graphic-circle circle-one" />
                  <div className="graphic-circle circle-two" />
                  <div className="medical-graphic">
                    <BookOpen size={75} strokeWidth={1.1} />
                    <div className="graphic-plus">+</div>
                  </div>
                  <div className="graphic-decoration decoration-one" />
                  <div className="graphic-decoration decoration-two" />
                </div>
              </section>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon blue-stat"><BookOpen /></div>
                  <div>
                    <span>Leçons disponibles</span>
                    <strong>{courses.length}</strong>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon purple-stat"><BookMarked /></div>
                  <div>
                    <span>Matières</span>
                    <strong>{subjects.length}</strong>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon cyan-stat"><ClipboardList /></div>
                  <div>
                    <span>Anciens examens</span>
                    <strong>{exams.length}</strong>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon green-stat"><ChartNoAxesCombined /></div>
                  <div>
                    <span>Activités réalisées</span>
                    <strong>{history.length}</strong>
                  </div>
                </div>
              </div>

              <SectionTitle
                eyebrow="TON ENVIRONNEMENT D'APPRENTISSAGE"
                title="Que souhaites-tu faire ?"
                description="Accède rapidement aux ressources et aux outils de révision."
              />

              <div className="feature-grid">
                <button className="feature-card course-feature" onClick={() => navigate("courses")}>
                  <IconTile icon={BookOpen} color="#2563EB" background="#EAF1FF" size={32} />
                  <div>
                    <h3>Bibliothèque de cours</h3>
                    <p>Explore les matières, les leçons et les documents PDF.</p>
                  </div>
                  <ChevronRight className="feature-arrow" />
                </button>

                <button className="feature-card exam-feature" onClick={() => navigate("exams")}>
                  <IconTile icon={ClipboardList} color="#0891B2" background="#E4F7FB" size={32} />
                  <div>
                    <h3>Anciens examens</h3>
                    <p>Prépare tes épreuves avec les sujets et corrections.</p>
                  </div>
                  <ChevronRight className="feature-arrow" />
                </button>

                <button className="feature-card revision-feature" onClick={() => navigate("revision")}>
                  <IconTile icon={Brain} color="#7C3AED" background="#F1EAFE" size={32} />
                  <div>
                    <h3>Espace de révision</h3>
                    <p>QCM, flashcards et résumés intelligents.</p>
                  </div>
                  <ChevronRight className="feature-arrow" />
                </button>

                <button className="feature-card ai-feature" onClick={() => navigate("ai")}>
                  <IconTile icon={Sparkles} color="#059669" background="#E4F8EF" size={32} />
                  <div>
                    <h3>Assistant médical IA</h3>
                    <p>Interroge tes cours et approfondis tes connaissances.</p>
                  </div>
                  <ChevronRight className="feature-arrow" />
                </button>
              </div>

              <SectionTitle
                eyebrow="REPRENDRE TON APPRENTISSAGE"
                title="Dernières activités"
                description="Retrouve les derniers travaux réalisés."
                action={
                  <button className="text-button" onClick={() => navigate("revision")}>
                    Voir tout <ChevronRight size={16} />
                  </button>
                }
              />

              {history.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="Aucune activité pour le moment"
                  description="Tes résumés, QCM et travaux apparaîtront ici."
                />
              ) : (
                <div className="history-list">
                  {history.slice(0, 5).map(item => (
                    <div className="history-item" key={item.id}>
                      <IconTile
                        icon={item.type === "qcm" ? ClipboardList : FileText}
                        color="#2563EB"
                        background="#EAF1FF"
                        size={20}
                      />
                      <div className="history-info">
                        <strong>{item.titre || item.type || "Activité"}</strong>
                        <small>{formatDate(item.createdAt)}</small>
                      </div>
                      <span className="history-type">{item.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* BIBLIOTHÈQUE */}

          {active === "courses" && (
            <>
              {!selectedSubject ? (
                <>
                  <SectionTitle
                    eyebrow="BIBLIOTHÈQUE UNIVERSITAIRE"
                    title="Mes cours"
                    description="Retrouve les cours classés par université, filière, année et semestre."
                    action={
                      isAdmin && (
                        <button className="primary-button" onClick={() => setModal("subject")}>
                          <Plus size={17} /> Nouvelle matière
                        </button>
                      )
                    }
                  />

                  <div className="filter-panel">
                    <div className="search-box">
                      <Search size={19} />
                      <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Rechercher une matière ou une leçon..."
                      />
                    </div>

                    <select value={filterUniversity} onChange={e => setFilterUniversity(e.target.value)}>
                      <option value="">Toutes les universités</option>
                      {universities.map(v => <option key={v}>{v}</option>)}
                    </select>

                    <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
                      <option value="">Toutes les années</option>
                      {levels.map(v => <option key={v}>{v}</option>)}
                    </select>

                    <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
                      <option value="">Tous les semestres</option>
                      {semesters.map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>

                  {isAdmin && (
                    <div className="admin-banner">
                      <div className="admin-banner-icon"><ShieldCheck size={22} /></div>
                      <div>
                        <strong>Espace administrateur</strong>
                        <p>Crée d'abord les matières, puis ajoute les leçons correspondantes.</p>
                      </div>
                      <button className="secondary-button" onClick={() => setModal("lesson")}>
                        <Plus size={16} /> Ajouter une leçon
                      </button>
                    </div>
                  )}

                  <div className="library-summary">
                    <span>{filteredCourses.length} leçon(s) disponible(s)</span>
                    <span>{Object.keys(groupedCourses).length} matière(s)</span>
                  </div>

                  {filteredCourses.length === 0 ? (
                    <EmptyState
                      icon={BookOpen}
                      title="Aucun cours trouvé"
                      description="Les cours publiés apparaîtront ici. Modifie tes filtres ou actualise la bibliothèque."
                    />
                  ) : (
                    Object.entries(groupedCourses).map(([subject, items]) => (
                      <section className="subject-section" key={subject}>
                        <div className="subject-heading">
                          <div className="subject-heading-left">
                            <IconTile icon={BookMarked} color="#2563EB" background="#EAF1FF" />
                            <div>
                              <h3>{subject}</h3>
                              <p>
                                {items[0].niveau || items[0].level || "Année non précisée"}
                                {" · "}
                                {items[0].semestre || "Semestre non précisé"}
                              </p>
                            </div>
                          </div>
                          <span className="count-pill">{items.length} leçon(s)</span>
                        </div>

                        <div className="lesson-list">
                          {items.map((course, index) => (
                            <div className="lesson-card" key={course.id}>
                              <div className="lesson-number">
                                {String(index + 1).padStart(2, "0")}
                              </div>
                              <div className="lesson-info">
                                <strong>{course.titre || course.title}</strong>
                                <small>
                                  {course.universite || course.university}
                                  {" · "}
                                  {course.filiere || course.track}
                                </small>
                                {course.description && <p>{course.description}</p>}
                              </div>

                              <button className="open-document" onClick={() => ouvrirCours(course)}>
                                <Eye size={16} /> Consulter
                              </button>

                              {isAdmin && (
                                <button
                                  className="icon-button danger"
                                  onClick={() => supprimerElement("cours", course.id)}
                                >
                                  <Trash2 size={17} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                    ))
                  )}
                </>
              ) : (
                <div>
                  <button className="back-button" onClick={() => setSelectedSubject(null)}>
                    <ArrowLeft size={17} /> Retour à la bibliothèque
                  </button>
                </div>
              )}
            </>
          )}

          {/* RÉVISIONS */}

          {active === "revision" && (
            <>
              <SectionTitle
                eyebrow="CENTRE DE RÉVISION"
                title="Révise intelligemment"
                description="Choisis ton outil de travail et progresse à ton rythme."
              />

              <div className="revision-hero">
                <div>
                  <span className="eyebrow">TON ESPACE PERSONNEL</span>
                  <h2>Comprendre. Mémoriser. Réussir.</h2>
                  <p>
                    Utilise les outils intelligents pour transformer tes cours
                    en supports de révision.
                  </p>
                </div>
                <Brain size={95} strokeWidth={1} />
              </div>

              <div className="tool-grid">
                {TOOLS.map(tool => (
                  <button
                    key={tool.id}
                    className="tool-card"
                    onClick={() => {
                      setAiAction(tool.id);
                      setActive("ai");
                    }}
                  >
                    <IconTile
                      icon={tool.icon}
                      color={tool.color}
                      background={tool.background}
                      size={34}
                    />
                    <h3>{tool.title}</h3>
                    <p>{tool.description}</p>
                    <span className="tool-link">Commencer <ChevronRight size={15} /></span>
                  </button>
                ))}
              </div>

              <SectionTitle
                eyebrow="SUIVI PERSONNEL"
                title="Ton historique"
                description="Retrouve les analyses et les documents précédents."
              />

              {history.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="Ton historique est vide"
                  description="Tes activités de révision seront enregistrées ici."
                />
              ) : (
                <div className="history-list">
                  {history.map(item => (
                    <div className="history-item" key={item.id}>
                      <IconTile icon={FileText} color="#2563EB" background="#EAF1FF" />
                      <div className="history-info">
                        <strong>{item.titre}</strong>
                        <small>{formatDate(item.createdAt)}</small>
                      </div>
                      <span className="history-type">{item.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* EXAMENS */}

          {active === "exams" && (
            <>
              <SectionTitle
                eyebrow="BANQUE D'ÉPREUVES"
                title="Anciens examens"
                description="Entraîne-toi avec les sujets des années précédentes et leurs corrections."
                action={
                  isAdmin && (
                    <button className="primary-button" onClick={() => setModal("exam")}>
                      <Plus size={17} /> Ajouter un examen
                    </button>
                  )
                }
              />

              <div className="exam-banner">
                <div>
                  <span className="eyebrow">PRÉPARATION UNIVERSITAIRE</span>
                  <h2>Prépare tes prochaines épreuves.</h2>
                  <p>Accède aux sujets et aux corrections disponibles.</p>
                </div>
                <FileCheck size={80} strokeWidth={1.1} />
              </div>

              <div className="filter-panel">
                <div className="search-box">
                  <Search size={19} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher un examen ou une matière..."
                  />
                </div>

                <select value={filterUniversity} onChange={e => setFilterUniversity(e.target.value)}>
                  <option value="">Toutes les universités</option>
                  {universities.map(v => <option key={v}>{v}</option>)}
                </select>

                <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
                  <option value="">Toutes les années</option>
                  {levels.map(v => <option key={v}>{v}</option>)}
                </select>

                <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
                  <option value="">Tous les semestres</option>
                  {semesters.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>

              <div className="library-summary">
                <span>{filteredExams.length} examen(s) disponible(s)</span>
              </div>

              {filteredExams.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Aucun examen disponible"
                  description="Les anciens sujets publiés apparaîtront dans cet espace."
                />
              ) : (
                <div className="exam-grid">
                  {filteredExams.map(exam => (
                    <div className="exam-card" key={exam.id}>
                      <div className="exam-card-top">
                        <IconTile icon={FileText} color="#0891B2" background="#E4F7FB" size={27} />
                        <span className="year-badge">{exam.annee || "Année inconnue"}</span>
                      </div>

                      <h3>{exam.titre}</h3>
                      <p>{exam.matiere}</p>

                      <div className="exam-metadata">
                        <span>{exam.universite}</span>
                        <span>{exam.niveau}</span>
                        <span>{exam.semestre}</span>
                      </div>

                      <div className="exam-actions">
                        <a href={exam.url} target="_blank" rel="noreferrer" className="primary-button">
                          <ExternalLink size={15} /> Sujet
                        </a>

                        {exam.correctionUrl ? (
                          <a
                            href={exam.correctionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="secondary-button"
                          >
                            <FileCheck size={15} /> Correction
                          </a>
                        ) : (
                          <span className="unavailable">Correction indisponible</span>
                        )}
                      </div>

                      {isAdmin && (
                        <button
                          className="delete-exam"
                          onClick={() => supprimerElement("examens", exam.id)}
                        >
                          <Trash2 size={15} /> Supprimer
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ASSISTANT IA */}

          {active === "ai" && (
            <>
              <SectionTitle
                eyebrow="INTELLIGENCE ARTIFICIELLE"
                title="Assistant médical"
                description="Travaille tes cours avec l'aide de l'intelligence artificielle."
              />

              <div className="ai-layout">
                <div className="ai-main-card">
                  <div className="ai-heading">
                    <div className="ai-logo"><Sparkles size={28} /></div>
                    <div>
                      <h2>Ton assistant d'études</h2>
                      <p>Importe un cours PDF pour commencer.</p>
                    </div>
                  </div>

                  <form onSubmit={lancerIA}>
                    <label className="upload-area">
                      <Upload size={32} />
                      <strong>{aiFile ? aiFile.name : "Importer un cours PDF"}</strong>
                      <span>Choisis un fichier depuis ton appareil.</span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={e => setAiFile(e.target.files?.[0] || null)}
                      />
                    </label>

                    <div className="ai-action-grid">
                      {[
                        ["resume", "Résumé", FileText],
                        ["qcm", "QCM", ClipboardList],
                        ["flashcards", "Flashcards", Layers]
                      ].map(([id, label, Icon]) => (
                        <button
                          type="button"
                          key={id}
                          onClick={() => setAiAction(id)}
                          className={aiAction === id ? "ai-action selected" : "ai-action"}
                        >
                          <Icon size={19} />
                          {label}
                        </button>
                      ))}
                    </div>

                    <label className="field">
                      <span>
                        {aiAction === "chat" ? "Ta question" : "Consigne facultative"}
                      </span>
                      <textarea
                        value={aiQuestion}
                        onChange={e => setAiQuestion(e.target.value)}
                        placeholder="Exemple : explique les notions essentielles de ce cours..."
                        rows={4}
                      />
                    </label>

                    <button className="primary-button full-button" disabled={busy}>
                      {busy ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}
                      {busy ? "Analyse en cours..." : "Lancer l'analyse"}
                    </button>
                  </form>
                </div>

                <div className="ai-side-card">
                  <h3>Comment ça fonctionne ?</h3>
                  <div className="ai-step">
                    <span>01</span>
                    <div>
                      <strong>Importe ton cours</strong>
                      <p>Choisis un document PDF.</p>
                    </div>
                  </div>
                  <div className="ai-step">
                    <span>02</span>
                    <div>
                      <strong>Choisis ton outil</strong>
                      <p>Résumé, QCM ou flashcards.</p>
                    </div>
                  </div>
                  <div className="ai-step">
                    <span>03</span>
                    <div>
                      <strong>Révise ton résultat</strong>
                      <p>Retrouve ton travail dans ton historique.</p>
                    </div>
                  </div>
                </div>
              </div>

              {aiResult && (
                <div className="result-card">
                  <div className="result-header">
                    <div>
                      <span className="eyebrow">RÉSULTAT DE L'ANALYSE</span>
                      <h2>Ton document de révision</h2>
                    </div>
                    <button
                      className="secondary-button"
                      onClick={() => navigator.clipboard.writeText(aiResult)}
                    >
                      Copier le résultat
                    </button>
                  </div>
                  <div className="result-content">{aiResult}</div>
                </div>
              )}
            </>
          )}

          {/* ADMINISTRATION */}

          {active === "admin" && (
            <>
              {!isAdmin ? (
                <EmptyState
                  icon={ShieldCheck}
                  title="Accès réservé"
                  description="Cette section est réservée à l'administrateur."
                />
              ) : (
                <>
                  <SectionTitle
                    eyebrow="GESTION DE LA PLATEFORME"
                    title="Administration"
                    description="Organise la bibliothèque et gère les ressources pédagogiques."
                  />

                  <div className="admin-stats">
                    <div><strong>{subjects.length}</strong><span>Matières</span></div>
                    <div><strong>{courses.length}</strong><span>Leçons</span></div>
                    <div><strong>{exams.length}</strong><span>Examens</span></div>
                  </div>

                  <div className="admin-grid">
                    <button className="admin-card" onClick={() => setModal("subject")}>
                      <IconTile icon={BookMarked} color="#2563EB" background="#EAF1FF" size={30} />
                      <h3>Créer une matière</h3>
                      <p>Enregistre une matière dans son semestre et son année.</p>
                      <span>Créer <ChevronRight size={15} /></span>
                    </button>

                    <button className="admin-card" onClick={() => setModal("lesson")}>
                      <IconTile icon={FilePlus2} color="#0891B2" background="#E4F7FB" size={30} />
                      <h3>Ajouter une leçon</h3>
                      <p>Associe un PDF à une matière existante.</p>
                      <span>Ajouter <ChevronRight size={15} /></span>
                    </button>

                    <button className="admin-card" onClick={() => setModal("exam")}>
                      <IconTile icon={ClipboardList} color="#7C3AED" background="#F1EAFE" size={30} />
                      <h3>Publier un examen</h3>
                      <p>Ajoute un sujet et sa correction facultative.</p>
                      <span>Publier <ChevronRight size={15} /></span>
                    </button>
                  </div>

                  <SectionTitle
                    eyebrow="CONTENU PÉDAGOGIQUE"
                    title="Matières enregistrées"
                    description="Vue d'ensemble des matières de la bibliothèque."
                  />

                  {subjects.length === 0 ? (
                    <EmptyState
                      icon={BookMarked}
                      title="Aucune matière enregistrée"
                      description="Commence par créer la première matière."
                    />
                  ) : (
                    <div className="admin-subject-list">
                      {subjects.map(subject => (
                        <div className="admin-subject-item" key={subject.id}>
                          <IconTile icon={BookMarked} color="#2563EB" background="#EAF1FF" size={20} />
                          <div>
                            <strong>{subject.nom}</strong>
                            <small>
                              {subject.universite} · {subject.filiere} · {subject.niveau} · {subject.semestre}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

        </div>

        {/* NAVIGATION MOBILE */}

        <nav className="bottom-navigation">
          {NAVIGATION.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={active === item.id ? "bottom-item active" : "bottom-item"}
              >
                <Icon size={21} strokeWidth={active === item.id ? 2.4 : 1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* MODALES ADMINISTRATION */}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal("")}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">ADMINISTRATION</span>
                <h2>
                  {modal === "subject" && "Créer une matière"}
                  {modal === "lesson" && "Ajouter une leçon"}
                  {modal === "exam" && "Publier un examen"}
                </h2>
              </div>
              <button className="icon-button" onClick={() => setModal("")}>
                <X size={21} />
              </button>
            </div>

            {modal === "subject" && (
              <form onSubmit={ajouterMatiere} className="modal-form">
                <Field label="Université" value={subjectForm.universite}
                  onChange={v => setSubjectForm({ ...subjectForm, universite: v })}
                  placeholder="Nom de l'université" />

                <Field label="Filière" value={subjectForm.filiere}
                  onChange={v => setSubjectForm({ ...subjectForm, filiere: v })}
                  placeholder="Exemple : Médecine" />

                <Field label="Année d'étude" value={subjectForm.niveau}
                  onChange={v => setSubjectForm({ ...subjectForm, niveau: v })}
                  placeholder="Exemple : Deuxième année" />

                <SelectField label="Semestre" value={subjectForm.semestre}
                  onChange={v => setSubjectForm({ ...subjectForm, semestre: v })}
                  options={semesters} />

                <Field label="Nom de la matière" value={subjectForm.nom}
                  onChange={v => setSubjectForm({ ...subjectForm, nom: v })}
                  placeholder="Nom de la matière" />

                <button className="primary-button full-button" disabled={busy}>
                  {busy ? "Enregistrement..." : "Enregistrer la matière"}
                </button>
              </form>
            )}

            {modal === "lesson" && (
              <form onSubmit={ajouterLecon} className="modal-form">
                <SelectField
                  label="Matière"
                  value={courseForm.matiereId}
                  onChange={v => setCourseForm({ ...courseForm, matiereId: v })}
                  options={subjects.map(s => ({
                    value: s.id,
                    label: `${s.nom} — ${s.niveau} — ${s.semestre}`
                  }))}
                />

                <Field label="Titre de la leçon" value={courseForm.titre}
                  onChange={v => setCourseForm({ ...courseForm, titre: v })}
                  placeholder="Exemple : Introduction générale" />

                <label className="field">
                  <span>Description facultative</span>
                  <textarea
                    rows={3}
                    value={courseForm.description}
                    onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
                  />
                </label>

                <Field label="Lien du document PDF" value={courseForm.url}
                  onChange={v => setCourseForm({ ...courseForm, url: v })}
                  placeholder="https://..." />

                <button className="primary-button full-button" disabled={busy}>
                  {busy ? "Publication..." : "Publier la leçon"}
                </button>
              </form>
            )}

            {modal === "exam" && (
              <form onSubmit={ajouterExamen} className="modal-form">
                <Field label="Titre de l'examen" value={examForm.titre}
                  onChange={v => setExamForm({ ...examForm, titre: v })}
                  placeholder="Exemple : Examen de physiologie" />

                <Field label="Université" value={examForm.universite}
                  onChange={v => setExamForm({ ...examForm, universite: v })} />

                <Field label="Filière" value={examForm.filiere}
                  onChange={v => setExamForm({ ...examForm, filiere: v })} />

                <Field label="Année d'étude" value={examForm.niveau}
                  onChange={v => setExamForm({ ...examForm, niveau: v })} />

                <SelectField label="Semestre" value={examForm.semestre}
                  onChange={v => setExamForm({ ...examForm, semestre: v })}
                  options={semesters} />

                <Field label="Matière" value={examForm.matiere}
                  onChange={v => setExamForm({ ...examForm, matiere: v })} />

                <Field label="Année de l'examen" value={examForm.annee}
                  onChange={v => setExamForm({ ...examForm, annee: v })}
                  placeholder="Exemple : 2025" />

                <Field label="Lien du sujet PDF" value={examForm.url}
                  onChange={v => setExamForm({ ...examForm, url: v })}
                  placeholder="https://..." />

                <Field label="Lien de la correction (facultatif)" value={examForm.correctionUrl}
                  onChange={v => setExamForm({ ...examForm, correctionUrl: v })}
                  placeholder="https://..." />

                <button className="primary-button full-button" disabled={busy}>
                  {busy ? "Publication..." : "Publier l'examen"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* STYLES */}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; }

        body {
          margin: 0;
          font-family: 'DM Sans', sans-serif;
          background: #F5F7FB;
          color: #172B43;
        }

        button, input, select, textarea { font: inherit; }
        button { cursor: pointer; }
        a { text-decoration: none; }

        .app {
          --surface: #FFFFFF;
          --background: #F5F7FB;
          --text: #172B43;
          --muted: #718096;
          --border: #E8EDF4;
          display: flex;
          min-height: 100vh;
          background: var(--background);
          color: var(--text);
        }

        .app.dark {
          --surface: #17283D;
          --background: #0D1B2B;
          --text: #E7EEF8;
          --muted: #A1B0C3;
          --border: #293D55;
        }

        .sidebar {
          width: 255px;
          min-width: 255px;
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          padding: 27px 17px 18px;
          position: fixed;
          inset: 0 auto 0 0;
          z-index: 30;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 0 7px 34px;
        }

        .brand-mark {
          width: 43px;
          height: 43px;
          border-radius: 14px;
          background: linear-gradient(145deg, #153D69, #2675CF);
          display: grid;
          place-items: center;
          color: white;
          font-family: Manrope, sans-serif;
          font-weight: 800;
          font-size: 17px;
          box-shadow: 0 7px 18px #2563eb35;
        }

        .brand strong {
          display: block;
          font-family: Manrope, sans-serif;
          font-size: 15px;
          font-weight: 800;
        }

        .brand small {
          display: block;
          font-size: 10px;
          color: var(--muted);
          margin-top: 3px;
        }

        .sidebar-label {
          padding: 0 12px 12px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.3px;
          color: #9AA8B8;
        }

        .side-nav { display: grid; gap: 5px; }

        .nav-item {
          height: 46px;
          border: 0;
          background: transparent;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 0 13px;
          border-radius: 11px;
          text-align: left;
          font-size: 13px;
          font-weight: 600;
          position: relative;
          transition: .2s;
        }

        .nav-item:hover { background: var(--background); color: var(--text); }

        .nav-item.active {
          color: #2563EB;
          background: #EEF4FF;
        }

        .dark .nav-item.active { background: #203B5B; color: #80B5FF; }

        .active-line {
          position: absolute;
          right: 0;
          height: 22px;
          width: 3px;
          background: #2563EB;
          border-radius: 5px 0 0 5px;
        }

        .sidebar-bottom { margin-top: auto; }

        .admin-shortcut {
          width: 100%;
          border: 1px solid #DCE8F8;
          background: #F2F7FF;
          color: #24599A;
          padding: 12px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 12px;
          margin-bottom: 13px;
        }

        .user-box {
          display: flex;
          align-items: center;
          gap: 10px;
          border-top: 1px solid var(--border);
          padding: 17px 3px 0;
          margin-top: 16px;
        }

        .avatar, .top-avatar {
          display: grid;
          place-items: center;
          width: 37px;
          height: 37px;
          border-radius: 12px;
          background: #E6F0FF;
          color: #2563EB;
          font-weight: 800;
        }

        .user-info { min-width: 0; flex: 1; }
        .user-info strong { display: block; font-size: 12px; }
        .user-info small { color: var(--muted); font-size: 10px; }

        .main-area {
          min-width: 0;
          flex: 1;
          margin-left: 255px;
        }

        .topbar {
          height: 72px;
          padding: 0 42px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .breadcrumb { display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--muted); }
        .breadcrumb strong { color: var(--text); }
        .topbar-right { display: flex; align-items: center; gap: 17px; }

        .icon-button {
          border: 0;
          background: transparent;
          color: var(--muted);
          display: grid;
          place-items: center;
          width: 35px;
          height: 35px;
          border-radius: 9px;
        }

        .icon-button:hover { background: var(--background); color: var(--text); }
        .danger { color: #DC4444; }
        .top-avatar { width: 35px; height: 35px; }

        .page-content {
          max-width: 1440px;
          margin: auto;
          padding: 34px 42px 65px;
        }

        .section-title {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin: 36px 0 21px;
        }

        .section-title h1 {
          font-family: Manrope, sans-serif;
          font-size: clamp(24px, 3vw, 31px);
          line-height: 1.2;
          letter-spacing: -1.1px;
          margin: 5px 0 7px;
          font-weight: 800;
        }

        .section-title p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.6; }

        .eyebrow {
          color: #3877C9;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .welcome-banner {
          min-height: 270px;
          background: linear-gradient(112deg, #102A48 0%, #174B7D 55%, #2073B9 100%);
          border-radius: 23px;
          padding: 37px 43px;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          overflow: hidden;
          box-shadow: 0 15px 35px #123d6824;
        }

        .welcome-content { max-width: 520px; position: relative; z-index: 2; }
        .welcome-tag {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #B9D9FF;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.4px;
          margin-bottom: 15px;
        }

        .welcome-banner h1 {
          font-family: Manrope, sans-serif;
          font-size: clamp(29px, 4vw, 40px);
          line-height: 1.15;
          letter-spacing: -1.5px;
          margin: 0 0 13px;
        }

        .welcome-banner p {
          font-size: 13px;
          line-height: 1.8;
          color: #D2E5F8;
          max-width: 430px;
          margin: 0 0 23px;
        }

        .welcome-graphic {
          width: 240px;
          height: 220px;
          position: relative;
          display: grid;
          place-items: center;
          margin-right: 30px;
        }

        .graphic-circle {
          position: absolute;
          border-radius: 50%;
          border: 1px solid #FFFFFF28;
        }

        .circle-one { width: 205px; height: 205px; }
        .circle-two { width: 155px; height: 155px; background: #FFFFFF0D; }

        .medical-graphic {
          width: 115px;
          height: 115px;
          display: grid;
          place-items: center;
          border-radius: 30px;
          background: linear-gradient(145deg, #FFFFFF2C, #FFFFFF0C);
          border: 1px solid #FFFFFF42;
          box-shadow: 0 20px 45px #061d3b4a;
          transform: rotate(-8deg);
          position: relative;
          z-index: 2;
          color: #E4F3FF;
        }

        .graphic-plus {
          position: absolute;
          right: -13px;
          top: -13px;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: #12B9B0;
          color: white;
          display: grid;
          place-items: center;
          font-size: 24px;
          font-weight: 600;
        }

        .graphic-decoration {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 4px;
          background: #63D8D2;
          transform: rotate(45deg);
        }

        .decoration-one { top: 18px; right: 20px; }
        .decoration-two { bottom: 17px; left: 17px; background: #9BC6FF; }

        .primary-button, .secondary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 0;
          border-radius: 10px;
          padding: 11px 15px;
          background: #2563EB;
          color: white;
          font-size: 12px;
          font-weight: 700;
          transition: .2s;
        }

        .primary-button:hover { background: #1D4ED8; transform: translateY(-1px); }
        .primary-button:disabled { opacity: .6; cursor: wait; }
        .light-button { background: white; color: #164A7E; }
        .light-button:hover { background: #EAF3FF; }
        .secondary-button { background: #EEF4FF; color: #2563EB; border: 1px solid #DCE8FC; }
        .text-button { display: flex; align-items: center; gap: 4px; background: none; border: 0; color: #2563EB; font-size: 12px; font-weight: 700; }
        .full-button { width: 100%; min-height: 46px; }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-top: 23px;
        }

        .stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 15px;
          padding: 17px;
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .stat-icon {
          width: 43px;
          height: 43px;
          border-radius: 13px;
          display: grid;
          place-items: center;
        }

        .stat-icon svg { width: 21px; }
        .blue-stat { color: #2563EB; background: #EAF1FF; }
        .purple-stat { color: #7C3AED; background: #F1EAFE; }
        .cyan-stat { color: #0891B2; background: #E4F7FB; }
        .green-stat { color: #059669; background: #E4F8EF; }
        .stat-card span { display: block; font-size: 10px; color: var(--muted); }
        .stat-card strong { display: block; font-family: Manrope; font-size: 23px; margin-top: 3px; }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 15px;
        }

        .feature-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 17px;
          padding: 22px;
          display: flex;
          align-items: center;
          gap: 17px;
          text-align: left;
          color: var(--text);
          position: relative;
          min-height: 126px;
          transition: .2s;
        }

        .feature-card:hover, .tool-card:hover, .admin-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px #193b6310;
          border-color: #C8D9F3;
        }

        .feature-card h3 { font-size: 14px; margin: 0 0 6px; }
        .feature-card p { font-size: 11px; color: var(--muted); line-height: 1.6; margin: 0; max-width: 280px; }
        .feature-arrow { margin-left: auto; color: #9AAABD; min-width: 18px; }

        .icon-tile {
          width: 55px;
          height: 55px;
          min-width: 55px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          box-shadow: inset 0 1px 0 #FFFFFF80;
        }

        .history-list { display: grid; gap: 9px; }
        .history-item {
          display: flex;
          align-items: center;
          gap: 13px;
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 12px 15px;
          border-radius: 12px;
        }

        .history-item .icon-tile { width: 42px; height: 42px; min-width: 42px; border-radius: 12px; }
        .history-info { flex: 1; min-width: 0; }
        .history-info strong { display: block; font-size: 12px; }
        .history-info small { display: block; font-size: 10px; color: var(--muted); margin-top: 4px; }
        .history-type { font-size: 10px; color: #2563EB; background: #EEF4FF; padding: 6px 9px; border-radius: 7px; }

        .filter-panel {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding: 14px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--surface);
          margin-bottom: 18px;
        }

        .search-box {
          min-width: 220px;
          flex: 1;
          display: flex;
          align-items: center;
          gap: 9px;
          color: #8A9AAF;
          padding: 0 12px;
          border: 1px solid var(--border);
          border-radius: 9px;
          min-height: 42px;
        }

        .search-box input {
          width: 100%;
          border: 0;
          outline: none;
          background: transparent;
          color: var(--text);
          font-size: 11px;
        }

        .filter-panel select {
          min-width: 140px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          border-radius: 9px;
          padding: 0 10px;
          min-height: 42px;
          font-size: 11px;
          outline: none;
        }

        .admin-banner {
          background: #EFF6FF;
          border: 1px solid #DBEAFE;
          border-radius: 14px;
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 13px;
          margin: 15px 0 23px;
          color: #1E3A5F;
        }

        .admin-banner-icon { width: 42px; height: 42px; border-radius: 12px; background: white; display: grid; place-items: center; color: #2563EB; }
        .admin-banner div:nth-child(2) { flex: 1; }
        .admin-banner strong { font-size: 12px; }
        .admin-banner p { font-size: 10px; margin: 4px 0 0; color: #60758F; }

        .library-summary {
          display: flex;
          justify-content: space-between;
          color: var(--muted);
          font-size: 11px;
          padding: 10px 2px 15px;
        }

        .subject-section { margin: 23px 0 28px; }
        .subject-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px 0;
          border-bottom: 1px solid var(--border);
          margin-bottom: 9px;
        }

        .subject-heading-left { display: flex; align-items: center; gap: 12px; }
        .subject-heading .icon-tile { width: 45px; height: 45px; min-width: 45px; }
        .subject-heading h3 { font-size: 14px; margin: 0 0 4px; }
        .subject-heading p { font-size: 10px; margin: 0; color: var(--muted); }
        .count-pill { font-size: 10px; color: #2563EB; background: #EEF4FF; border-radius: 20px; padding: 7px 10px; }

        .lesson-list { display: grid; gap: 8px; }
        .lesson-card {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 13px 15px;
          border: 1px solid var(--border);
          background: var(--surface);
          border-radius: 12px;
        }

        .lesson-number {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          background: var(--background);
          border-radius: 10px;
          color: #6D83A0;
          font-size: 11px;
          font-weight: 800;
        }

        .lesson-info { flex: 1; min-width: 0; }
        .lesson-info strong { display: block; font-size: 12px; }
        .lesson-info small { display: block; color: var(--muted); font-size: 10px; margin-top: 5px; }
        .lesson-info p { font-size: 10px; color: var(--muted); }
        .open-document { border: 0; background: #EEF4FF; color: #2563EB; padding: 9px 11px; border-radius: 8px; display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; }

        .empty-state {
          background: var(--surface);
          border: 1px dashed var(--border);
          border-radius: 16px;
          padding: 45px 20px;
          text-align: center;
          margin: 15px 0;
        }

        .empty-icon {
          width: 66px;
          height: 66px;
          border-radius: 20px;
          background: var(--background);
          color: #7C94B0;
          display: grid;
          place-items: center;
          margin: auto auto 15px;
        }

        .empty-state h3 { font-size: 14px; margin: 0 0 7px; }
        .empty-state p { color: var(--muted); font-size: 11px; margin: 0; }

        .revision-hero, .exam-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 32px;
          border-radius: 18px;
          background: linear-gradient(110deg, #192D50, #334B86);
          color: white;
          margin-bottom: 25px;
        }

        .revision-hero h2, .exam-banner h2 { font-family: Manrope; font-size: 23px; margin: 8px 0; }
        .revision-hero p, .exam-banner p { color: #D0DCF2; font-size: 12px; }
        .revision-hero > svg, .exam-banner > svg { color: #B9D7FF; margin-right: 20px; }

        .tool-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        .tool-card {
          text-align: left;
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 22px;
          background: var(--surface);
          color: var(--text);
          transition: .2s;
        }

        .tool-card .icon-tile { margin-bottom: 19px; }
        .tool-card h3 { font-size: 14px; margin: 0 0 7px; }
        .tool-card p { color: var(--muted); font-size: 11px; line-height: 1.6; min-height: 38px; }
        .tool-link { display: flex; align-items: center; gap: 5px; color: #2563EB; font-size: 11px; font-weight: 700; margin-top: 15px; }

        .exam-banner { background: linear-gradient(110deg, #0F415C, #087F9B); }
        .exam-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 15px; }
        .exam-card { background: var(--surface); border: 1px solid var(--border); border-radius: 15px; padding: 19px; }
        .exam-card-top { display: flex; align-items: center; justify-content: space-between; }
        .exam-card h3 { font-size: 14px; margin: 16px 0 5px; }
        .exam-card > p { font-size: 11px; color: var(--muted); }
        .year-badge { color: #2563EB; background: #EEF4FF; padding: 6px 9px; border-radius: 7px; font-size: 10px; }
        .exam-metadata { display: flex; flex-wrap: wrap; gap: 7px; margin: 13px 0; }
        .exam-metadata span { background: var(--background); color: var(--muted); padding: 6px 8px; border-radius: 6px; font-size: 9px; }
        .exam-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .unavailable { font-size: 10px; color: var(--muted); }
        .delete-exam { border: 0; background: none; color: #DC4444; font-size: 10px; display: flex; align-items: center; gap: 5px; margin-top: 13px; }

        .ai-layout { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(230px, .8fr); gap: 18px; }
        .ai-main-card, .ai-side-card, .result-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 17px;
          padding: 23px;
        }

        .ai-heading { display: flex; align-items: center; gap: 13px; margin-bottom: 23px; }
        .ai-logo { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 15px; color: #059669; background: #E4F8EF; }
        .ai-heading h2 { font-size: 16px; margin: 0 0 5px; }
        .ai-heading p { font-size: 11px; color: var(--muted); margin: 0; }

        .upload-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 28px 15px;
          border: 1.5px dashed #B9CCE5;
          background: #F6F9FE;
          border-radius: 13px;
          color: #4775A7;
          cursor: pointer;
          margin-bottom: 16px;
        }

        .upload-area strong { font-size: 12px; }
        .upload-area span { font-size: 10px; color: #8497AD; }
        .upload-area input { display: none; }

        .ai-action-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 17px; }
        .ai-action { display: flex; align-items: center; justify-content: center; gap: 7px; padding: 11px 5px; border: 1px solid var(--border); background: var(--surface); color: var(--muted); border-radius: 9px; font-size: 10px; }
        .ai-action.selected { border-color: #93B8F6; background: #EEF4FF; color: #2563EB; }

        .field { display: grid; gap: 7px; margin-bottom: 14px; }
        .field span { font-size: 11px; font-weight: 700; color: var(--text); }
        .field input, .field select, .field textarea {
          width: 100%;
          min-height: 42px;
          padding: 11px 12px;
          border-radius: 9px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          outline: none;
          font-size: 11px;
        }

        .field input:focus, .field select:focus, .field textarea:focus { border-color: #6B9BEA; box-shadow: 0 0 0 3px #2563eb14; }
        .field textarea { resize: vertical; }

        .ai-side-card h3 { font-size: 14px; margin: 0 0 22px; }
        .ai-step { display: flex; gap: 12px; margin: 18px 0; }
        .ai-step > span { width: 30px; height: 30px; min-width: 30px; border-radius: 9px; display: grid; place-items: center; background: #EEF4FF; color: #2563EB; font-size: 10px; font-weight: 800; }
        .ai-step strong { font-size: 11px; }
        .ai-step p { font-size: 10px; color: var(--muted); margin: 5px 0 0; }

        .result-card { margin-top: 20px; }
        .result-header { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
        .result-header h2 { font-size: 17px; margin: 6px 0; }
        .result-content { white-space: pre-wrap; line-height: 1.8; font-size: 12px; color: var(--text); padding-top: 15px; overflow-wrap: anywhere; }

        .admin-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 13px; margin-bottom: 22px; }
        .admin-stats > div { background: var(--surface); border: 1px solid var(--border); border-radius: 13px; padding: 18px; }
        .admin-stats strong { display: block; font-family: Manrope; font-size: 25px; }
        .admin-stats span { color: var(--muted); font-size: 10px; }

        .admin-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .admin-card { background: var(--surface); color: var(--text); text-align: left; border: 1px solid var(--border); border-radius: 15px; padding: 20px; transition: .2s; }
        .admin-card h3 { font-size: 13px; margin: 15px 0 7px; }
        .admin-card p { font-size: 10px; line-height: 1.6; color: var(--muted); min-height: 33px; }
        .admin-card > span { display: flex; align-items: center; gap: 5px; color: #2563EB; font-size: 10px; font-weight: 700; margin-top: 15px; }

        .admin-subject-list { display: grid; gap: 8px; }
        .admin-subject-item { display: flex; align-items: center; gap: 12px; padding: 13px; background: var(--surface); border: 1px solid var(--border); border-radius: 11px; }
        .admin-subject-item .icon-tile { width: 40px; height: 40px; min-width: 40px; border-radius: 11px; }
        .admin-subject-item strong { display: block; font-size: 12px; }
        .admin-subject-item small { display: block; color: var(--muted); font-size: 10px; margin-top: 4px; }

        .bottom-navigation { display: none; }
        .mobile-menu-button, .mobile-dropdown { display: none; }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: #071629A8;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          overflow-y: auto;
          backdrop-filter: blur(5px);
        }

        .modal {
          width: 100%;
          max-width: 540px;
          max-height: 90vh;
          overflow-y: auto;
          background: var(--surface);
          color: var(--text);
          border-radius: 19px;
          padding: 24px;
          box-shadow: 0 25px 70px #06162c50;
        }

        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; }
        .modal-header h2 { font-family: Manrope; font-size: 21px; margin: 7px 0 0; }
        .modal-form { display: grid; gap: 2px; }
        .back-button { display: flex; align-items: center; gap: 7px; border: 0; background: none; color: #2563EB; font-size: 12px; font-weight: 700; margin-bottom: 20px; }

        .loading-screen { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; background: #F5F7FB; color: #63758A; font-size: 12px; }
        .loading-screen .brand-mark { width: 58px; height: 58px; font-size: 20px; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media(max-width: 1100px) {
          .page-content { padding-left: 25px; padding-right: 25px; }
          .topbar { padding: 0 25px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media(max-width: 760px) {
          .sidebar { display: none; }
          .main-area { margin-left: 0; }
          .topbar { height: 59px; padding: 0 16px; }
          .mobile-menu-button { display: grid; place-items: center; border: 0; background: none; color: var(--text); padding: 5px; }
          .topbar-left { display: flex; align-items: center; gap: 9px; }
          .breadcrumb { font-size: 10px; }
          .topbar-right { gap: 7px; }
          .page-content { padding: 21px 15px 100px; }
          .section-title { align-items: flex-start; margin: 29px 0 16px; }
          .section-title h1 { font-size: 25px; }
          .section-title p { font-size: 11px; }
          .welcome-banner { padding: 25px 21px; min-height: 230px; border-radius: 18px; }
          .welcome-banner h1 { font-size: 29px; }
          .welcome-banner p { font-size: 11px; max-width: 95%; }
          .welcome-graphic { position: absolute; right: -85px; bottom: -35px; opacity: .23; transform: scale(.9); }
          .stats-grid { gap: 9px; margin-top: 14px; }
          .stat-card { padding: 12px 10px; gap: 9px; border-radius: 12px; }
          .stat-icon { width: 35px; height: 35px; min-width: 35px; border-radius: 10px; }
          .stat-icon svg { width: 17px; }
          .stat-card span { font-size: 9px; }
          .stat-card strong { font-size: 19px; }
          .feature-grid { grid-template-columns: 1fr; gap: 10px; }
          .feature-card { padding: 15px; min-height: 100px; gap: 12px; }
          .feature-card .icon-tile { width: 47px; height: 47px; min-width: 47px; border-radius: 13px; }
          .feature-card h3 { font-size: 12px; }
          .feature-card p { font-size: 10px; }
          .filter-panel { padding: 10px; gap: 8px; }
          .search-box { min-width: 100%; }
          .filter-panel select { flex: 1; min-width: 0; }
          .admin-banner { flex-wrap: wrap; }
          .admin-banner .secondary-button { width: 100%; }
          .lesson-card { gap: 8px; padding: 11px 9px; }
          .lesson-number { width: 30px; height: 30px; min-width: 30px; }
          .lesson-info strong { font-size: 10px; }
          .lesson-info small { font-size: 9px; }
          .open-document { padding: 8px; font-size: 0; }
          .open-document svg { width: 17px; }
          .subject-heading h3 { font-size: 12px; }
          .subject-heading p { font-size: 9px; }
          .count-pill { font-size: 9px; }
          .tool-grid { grid-template-columns: 1fr; }
          .tool-card { padding: 17px; }
          .tool-card .icon-tile { margin-bottom: 12px; }
          .tool-card p { min-height: auto; }
          .exam-grid { grid-template-columns: 1fr; }
          .ai-layout { grid-template-columns: 1fr; }
          .ai-main-card, .ai-side-card { padding: 17px; }
          .ai-action-grid { gap: 5px; }
          .ai-action { font-size: 9px; }
          .admin-grid { grid-template-columns: 1fr; }
          .admin-stats { gap: 8px; }
          .admin-stats > div { padding: 13px; }
          .admin-stats strong { font-size: 21px; }
          .revision-hero, .exam-banner { padding: 22px 18px; }
          .revision-hero h2, .exam-banner h2 { font-size: 18px; }
          .revision-hero p, .exam-banner p { font-size: 10px; }
          .revision-hero > svg, .exam-banner > svg { width: 54px; min-width: 54px; margin: 0; }
          .bottom-navigation {
            display: flex;
            position: fixed;
            z-index: 40;
            bottom: 0;
            left: 0;
            right: 0;
            height: 69px;
            padding: 7px 4px max(7px, env(safe-area-inset-bottom));
            background: var(--surface);
            border-top: 1px solid var(--border);
            justify-content: space-around;
            box-shadow: 0 -5px 20px #10243a08;
          }

          .bottom-item {
            border: 0;
            background: none;
            color: #8B9AAF;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            flex: 1;
            font-size: 9px;
            font-weight: 600;
            position: relative;
          }

          .bottom-item.active { color: #2563EB; }
          .bottom-item.active:before {
            content: "";
            position: absolute;
            top: -7px;
            width: 25px;
            height: 3px;
            background: #2563EB;
            border-radius: 0 0 5px 5px;
          }

          .mobile-dropdown {
            display: grid;
            position: fixed;
            z-index: 50;
            top: 59px;
            left: 10px;
            right: 10px;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 13px;
            padding: 8px;
            box-shadow: 0 15px 35px #0b23412b;
          }

          .mobile-dropdown button {
            display: flex;
            align-items: center;
            gap: 12px;
            border: 0;
            background: none;
            color: var(--text);
            padding: 12px;
            text-align: left;
            font-size: 12px;
          }

          .modal { padding: 19px; }
          .result-header { align-items: flex-start; flex-direction: column; }
        }

        @media(max-width: 370px) {
          .welcome-banner h1 { font-size: 25px; }
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .stat-card { gap: 7px; }
          .stat-card span { font-size: 8px; }
          .bottom-item { font-size: 8px; }
        }
      `}</style>
    </main>
  );
}
