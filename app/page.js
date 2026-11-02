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
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

const storage = getStorage(auth.app);

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

/* COMPOSANTS VISUELS */

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

/* MODALE STABLE */

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
            className="icon-button"
            type="button"
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

/* APPLICATION */

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
          console.error("Profil :", error);
        }

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /* CHARGEMENT FIREBASE */

  async function chargerDonnees() {
    if (!user?.uid) return;

    setBusy(true);

    try {
      const [
        courseSnap,
        subjectSnap,
        examSnap
      ] = await Promise.all([
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
    } catch (error) {
      console.error("Chargement :", error);

      alert(
        "Impossible de charger certaines données : " +
        (error.message || "Erreur Firebase")
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (user?.uid) chargerDonnees();
  }, [user?.uid]);

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

  const groupedCourses = useMemo(() => {
    return filteredCourses.reduce((groups, course) => {
      const subject =
        course.matiere || course.subject || "Autres cours";

      if (!groups[subject]) groups[subject] = [];

      groups[subject].push(course);

      return groups;
    }, {});
  }, [filteredCourses]);

  /* NAVIGATION */

  function navigate(id) {
    setActive(id);
    setMobileMenu(false);
    setSelectedSubject(null);
    setSearch("");
  }

  const displayName =
    profile.prenom ||
    profile.firstName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Étudiant";

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="brand-mark">DN</div>
        <LoaderCircle className="spin" size={28} />
        <p>Préparation de ton espace d'études...</p>
      </div>
    );
    }
    /* AJOUTER UNE MATIÈRE */

  async function ajouterMatiere(e) {
    e.preventDefault();

    if (!subjectForm.nom.trim()) {
      alert("Veuillez saisir le nom de la matière.");
      return;
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

      alert("Matière ajoutée avec succès.");
    } catch (error) {
      console.error(error);
      alert("Erreur : " + error.message);
    } finally {
      setBusy(false);
    }
  }

  /* AJOUTER UN COURS */

  async function ajouterLecon(e) {
    e.preventDefault();

    if (!courseForm.titre.trim()) {
      alert("Veuillez saisir le titre du cours.");
      return;
    }

    setBusy(true);

    try {
      let fileUrl = courseForm.url.trim();

      if (lessonFile) {
        const fileName =
          `${Date.now()}_${lessonFile.name.replace(/\s+/g, "_")}`;

        const storageRef = ref(
          storage,
          `cours/${user.uid}/${fileName}`
        );

        const uploadResult = await uploadBytes(
          storageRef,
          lessonFile,
          { contentType: lessonFile.type || "application/pdf" }
        );

        fileUrl = await getDownloadURL(uploadResult.ref);
      }

      const selected = subjects.find(
        subject => subject.id === courseForm.matiereId
      );

      await addDoc(collection(db, "cours"), {
        ...courseForm,
        titre: courseForm.titre.trim(),
        url: fileUrl,
        pdfUrl: fileUrl,
        matiere: selected?.nom || "",
        universite: selected?.universite || "",
        filiere: selected?.filiere || "",
        niveau: selected?.niveau || "",
        semestre: selected?.semestre || "",
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      setCourseForm({
        titre: "",
        matiereId: "",
        url: "",
        description: ""
      });

      setLessonFile(null);
      setModal("");

      await chargerDonnees();

      alert("Cours ajouté avec succès.");
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'ajout : " + error.message);
    } finally {
      setBusy(false);
    }
  }

  /* AJOUTER UN EXAMEN */

  async function ajouterExamen(e) {
    e.preventDefault();

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

      alert("Examen ajouté avec succès.");
    } catch (error) {
      console.error(error);
      alert("Erreur : " + error.message);
    } finally {
      setBusy(false);
    }
  }

  /* SUPPRIMER UN ÉLÉMENT */

  async function supprimerElement(type, id) {
    if (!isAdmin) {
      alert("Action réservée à l'administration.");
      return;
    }

    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer cet élément ?"
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      const collectionName = {
        cours: "cours",
        matieres: "matieres",
        examens: "examens"
      }[type];

      if (!collectionName) {
        throw new Error("Type de suppression inconnu.");
      }

      await deleteDoc(doc(db, collectionName, id));

      await chargerDonnees();

      alert("Suppression effectuée.");
    } catch (error) {
      console.error(error);
      alert("Erreur : " + error.message);
    } finally {
      setBusy(false);
    }
  }

  /* HISTORIQUE */

  async function enregistrerResultat(data) {
    if (!user?.uid) return;

    try {
      await addDoc(
        collection(db, "users", user.uid, "resultats"),
        {
          ...data,
          createdAt: serverTimestamp()
        }
      );

      await chargerDonnees();
    } catch (error) {
      console.error("Historique :", error);
    }
  }

  function ouvrirResultat(result) {
    setAiResult(
      result.contenu ||
      result.resultat ||
      result.texte ||
      ""
    );

    setActive("ai");
  }

  async function copierResultat() {
    try {
      await navigator.clipboard.writeText(aiResult);
      alert("Texte copié.");
    } catch {
      alert("Impossible de copier le texte.");
    }
  }

  /* ASSISTANT IA */

  async function lancerIA(e, actionOverride) {
    if (e?.preventDefault) e.preventDefault();

    const action = actionOverride || aiAction;

    if (!aiFile && !aiQuestion.trim()) {
      alert("Ajoutez un document ou écrivez une question.");
      return;
    }

    setBusy(true);
    setAiResult("");

    try {
      let fileBase64 = null;
      let fileName = null;
      let mimeType = null;

      if (aiFile) {
        const reader = new FileReader();

        fileBase64 = await new Promise((resolve, reject) => {
          reader.onload = () => {
            const result = String(reader.result || "");
            resolve(result.split(",")[1] || "");
          };

          reader.onerror = reject;
          reader.readAsDataURL(aiFile);
        });

        fileName = aiFile.name;
        mimeType = aiFile.type || "application/pdf";
      }

      const response = await fetch("/api/ia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fichier: fileBase64,
          fileName,
          mimeType,
          action,
          question: aiQuestion.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Erreur de l'assistant IA."
        );
      }

      const result =
        data.result ||
        data.response ||
        data.text ||
        data.contenu ||
        data.output ||
        "";

      if (!result) {
        throw new Error("L'assistant n'a retourné aucun résultat.");
      }

      setAiResult(result);

      await enregistrerResultat({
        type: action,
        titre: aiFile?.name || aiQuestion.slice(0, 80) || action,
        contenu: result
      });
    } catch (error) {
      console.error("Assistant IA :", error);

      setAiResult(
        "Une erreur est survenue : " + error.message
      );
    } finally {
      setBusy(false);
    }
  }

  async function poserQuestion(e) {
    e?.preventDefault();

    await lancerIA(e, "chat");
  }

  /* TABLEAU DE BORD */

  function Dashboard() {
    const cards = [
      {
        label: "Cours disponibles",
        value: courses.length,
        icon: BookOpen,
        color: "#2563EB",
        background: "#EAF1FF"
      },
      {
        label: "Matières",
        value: subjects.length,
        icon: GraduationCap,
        color: "#7C3AED",
        background: "#F1EAFE"
      },
      {
        label: "Examens",
        value: exams.length,
        icon: ClipboardList,
        color: "#0891B2",
        background: "#E4F7FB"
      },
      {
        label: "Révisions",
        value: history.length,
        icon: Brain,
        color: "#059669",
        background: "#E4F8EF"
      }
    ];

    return (
      <>
        <div className="welcome-banner">
          <div>
            <div className="welcome-label">
              TON ESPACE D'APPRENTISSAGE
            </div>

            <h1>
              Bonjour {displayName} 👋
            </h1>

            <p>
              Continue à progresser. Chaque révision te rapproche
              de tes objectifs.
            </p>

            <button
              className="banner-button"
              onClick={() => navigate("courses")}
            >
              Explorer les cours
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="welcome-decoration">
            <Stethoscope size={95} strokeWidth={1.1} />
          </div>
        </div>

        <div className="stats-grid">
          {cards.map(card => (
            <div className="stat-card" key={card.label}>
              <IconTile
                icon={card.icon}
                color={card.color}
                background={card.background}
              />

              <div>
                <strong>{card.value}</strong>
                <span>{card.label}</span>
              </div>
            </div>
          ))}
        </div>

        <SectionTitle
          eyebrow="APPRENDRE AUTREMENT"
          title="Tes outils d'étude"
          description="Des outils pour apprendre, comprendre et mémoriser."
        />

        <div className="tools-grid">
          {TOOLS.map(tool => (
            <button
              className="tool-card"
              key={tool.id}
              onClick={() => {
                setAiAction(tool.id === "qcm"
                  ? "qcm"
                  : tool.id === "flashcards"
                    ? "flashcards"
                    : "resume"
                );

                navigate("ai");
              }}
            >
              <IconTile
                icon={tool.icon}
                color={tool.color}
                background={tool.background}
              />

              <h3>{tool.title}</h3>
              <p>{tool.description}</p>

              <span className="tool-link">
                Commencer <ChevronRight size={16} />
              </span>
            </button>
          ))}
        </div>

        <SectionTitle
          eyebrow="BIBLIOTHÈQUE"
          title="Derniers cours"
          action={
            <button
              className="text-button"
              onClick={() => navigate("courses")}
            >
              Tout voir <ChevronRight size={16} />
            </button>
          }
        />

        {courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Aucun cours disponible"
            description="Les cours ajoutés apparaîtront ici."
          />
        ) : (
          <div className="course-grid">
            {courses.slice(0, 4).map(course => (
              <div className="course-card" key={course.id}>
                <IconTile
                  icon={FileText}
                  color="#2563EB"
                  background="#EAF1FF"
                />

                <h3>{course.titre || course.title}</h3>

                <p>
                  {course.matiere || course.subject || "Matière"}
                </p>

                <span>{course.niveau || course.level || ""}</span>

                {getCourseUrl(course) && (
                  <a
                    href={getCourseUrl(course)}
                    target="_blank"
                    rel="noreferrer"
                    className="course-link"
                  >
                    Consulter <ExternalLink size={15} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  /* BIBLIOTHÈQUE DES COURS */

  function CoursesPage() {
    return (
      <>
        <SectionTitle
          eyebrow="BIBLIOTHÈQUE UNIVERSITAIRE"
          title="Mes cours"
          description="Retrouve les ressources de ta filière et de ton niveau."
          action={
            isAdmin && (
              <button
                className="primary-button"
                onClick={() => setModal("course")}
              >
                <Plus size={17} />
                Ajouter
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
          </div>

          <div className="filter-grid">
            <select
              value={filterUniversity}
              onChange={e => setFilterUniversity(e.target.value)}
            >
              <option value="">Toutes les universités</option>

              {universities.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <select
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value)}
            >
              <option value="">Tous les niveaux</option>

              {levels.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <select
              value={filterSemester}
              onChange={e => setFilterSemester(e.target.value)}
            >
              <option value="">Tous les semestres</option>

              {semesters.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="results-count">
          {filteredCourses.length} cours trouvé(s)
        </div>

        {Object.keys(groupedCourses).length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Aucun cours trouvé"
            description="Essaie de modifier tes filtres ou ta recherche."
          />
        ) : (
          Object.entries(groupedCourses).map(([subject, items]) => (
            <section className="subject-section" key={subject}>
              <div className="subject-heading">
                <div>
                  <h2>{subject}</h2>
                  <p>{items.length} ressource(s)</p>
                </div>
              </div>

              <div className="course-grid">
                {items.map(course => (
                  <div className="course-card" key={course.id}>
                    <IconTile
                      icon={FileText}
                      color="#2563EB"
                      background="#EAF1FF"
                    />

                    <h3>{course.titre || course.title}</h3>

                    <p>
                      {course.description || "Support de cours"}
                    </p>

                    <div className="course-meta">
                      {course.niveau || course.level || ""}
                      {" · "}
                      {course.semestre || ""}
                    </div>

                    <div className="course-actions">
                      {getCourseUrl(course) && (
                        <a
                          href={getCourseUrl(course)}
                          target="_blank"
                          rel="noreferrer"
                          className="course-link"
                        >
                          Ouvrir le cours
                          <ExternalLink size={15} />
                        </a>
                      )}

                      {isAdmin && (
                        <button
                          className="danger-icon"
                          onClick={() =>
                            supprimerElement("cours", course.id)
                          }
                          title="Supprimer"
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </>
    );
  }

  /* EXAMENS */

  function ExamsPage() {
    return (
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
                Ajouter
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
        </div>

        {filteredExams.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Aucun examen disponible"
            description="Les sujets ajoutés seront affichés ici."
          />
        ) : (
          <div className="exam-list">
            {filteredExams.map(exam => (
              <div className="exam-card" key={exam.id}>
                <IconTile
                  icon={ClipboardList}
                  color="#7C3AED"
                  background="#F1EAFE"
                />

                <div className="exam-info">
                  <h3>{exam.titre}</h3>

                  <p>
                    {exam.matiere || "Matière non précisée"}
                    {" · "}
                    {exam.niveau || ""}
                  </p>

                  <span>
                    {exam.annee || ""}
                    {" · "}
                    {exam.semestre || ""}
                  </span>
                </div>

                <div className="exam-actions">
                  {exam.url && (
                    <a
                      href={exam.url}
                      target="_blank"
                      rel="noreferrer"
                      className="course-link"
                    >
                      Sujet <ExternalLink size={15} />
                    </a>
                  )}

                  {exam.correctionUrl && (
                    <a
                      href={exam.correctionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="course-link"
                    >
                      Correction <ExternalLink size={15} />
                    </a>
                  )}

                  {isAdmin && (
                    <button
                      className="danger-icon"
                      onClick={() =>
                        supprimerElement("examens", exam.id)
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
        }
  /* PAGE RÉVISIONS */

  function RevisionPage() {
    return (
      <>
        <SectionTitle
          eyebrow="TON PARCOURS"
          title="Mes révisions"
          description="Retrouve tes travaux réalisés avec l'assistant IA."
        />

        <div className="revision-summary">
          <div className="revision-summary-icon">
            <Brain size={30} />
          </div>

          <div>
            <strong>{history.length}</strong>
            <span>Travaux enregistrés</span>
          </div>
        </div>

        {history.length === 0 ? (
          <EmptyState
            icon={History}
            title="Aucune révision pour le moment"
            description="Tes résumés, QCM et autres travaux apparaîtront ici."
          />
        ) : (
          <div className="history-list">
            {history.map(result => (
              <div className="history-card" key={result.id}>
                <div className="history-icon">
                  <FileText size={22} />
                </div>

                <div className="history-content">
                  <h3>{result.titre || "Travail sans titre"}</h3>

                  <p>
                    {result.type || "Révision"}
                    {" · "}
                    {formatDate(result.createdAt)}
                  </p>
                </div>

                <button
                  className="secondary-button"
                  onClick={() => ouvrirResultat(result)}
                >
                  <Eye size={16} />
                  Voir
                </button>
              </div>
            ))}
          </div>
        )}

        {aiResult && (
          <div className="result-panel">
            <div className="result-header">
              <h2>Résultat sélectionné</h2>

              <button
                className="icon-button"
                onClick={() => setAiResult("")}
              >
                <X size={19} />
              </button>
            </div>

            <div className="result-content">
              {aiResult}
            </div>

            <button
              className="secondary-button"
              onClick={copierResultat}
            >
              <Download size={16} />
              Copier le résultat
            </button>
          </div>
        )}
      </>
    );
  }

  /* ASSISTANT IA */

  function AIPage() {
    const actions = [
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
        id: "chat",
        label: "Question",
        icon: MessageCircle
      }
    ];

    return (
      <>
        <SectionTitle
          eyebrow="INTELLIGENCE ARTIFICIELLE"
          title="Assistant DN Med"
          description="Un assistant pour t'aider à comprendre et réviser tes cours."
        />

        <div className="ai-intro">
          <div className="ai-intro-icon">
            <Sparkles size={32} />
          </div>

          <div>
            <h2>Ton partenaire d'apprentissage</h2>
            <p>
              Ajoute un document ou pose une question pour commencer.
            </p>
          </div>
        </div>

        <div className="ai-workspace">
          <h3>Que souhaites-tu faire ?</h3>

          <div className="ai-actions">
            {actions.map(action => {
              const Icon = action.icon;

              return (
                <button
                  type="button"
                  key={action.id}
                  className={
                    aiAction === action.id
                      ? "ai-action active"
                      : "ai-action"
                  }
                  onClick={() => setAiAction(action.id)}
                >
                  <Icon size={19} />
                  {action.label}
                </button>
              );
            })}
          </div>

          <form
            onSubmit={
              aiAction === "chat"
                ? poserQuestion
                : lancerIA
            }
          >
            <label className="field">
              <span>Importer un document (PDF)</span>

              <div className="upload-zone">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={e =>
                    setAiFile(e.target.files?.[0] || null)
                  }
                />

                <Upload size={25} />

                <strong>
                  {aiFile
                    ? aiFile.name
                    : "Sélectionner un document"}
                </strong>

                <small>
                  Format PDF recommandé
                </small>
              </div>
            </label>

            <label className="field">
              <span>
                {aiAction === "chat"
                  ? "Écris ta question"
                  : "Instructions complémentaires (facultatif)"}
              </span>

              <textarea
                value={aiQuestion}
                onChange={e => setAiQuestion(e.target.value)}
                placeholder={
                  aiAction === "chat"
                    ? "Exemple : Explique-moi la différence entre ventilation et respiration..."
                    : "Précise ce que tu souhaites obtenir..."
                }
                rows={4}
              />
            </label>

            <button
              className="primary-button ai-submit"
              type="submit"
              disabled={busy}
            >
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={19} />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Lancer l'assistant
                </>
              )}
            </button>
          </form>

          {aiResult && (
            <div className="result-panel">
              <div className="result-header">
                <h2>Résultat</h2>

                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setAiResult("")}
                >
                  <X size={19} />
                </button>
              </div>

              <div className="result-content">
                {aiResult}
              </div>

              <button
                className="secondary-button"
                type="button"
                onClick={copierResultat}
              >
                <Download size={16} />
                Copier le résultat
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  /* ADMINISTRATION */

  function AdminPage() {
    if (!isAdmin) {
      return (
        <EmptyState
          icon={ShieldCheck}
          title="Accès réservé"
          description="Cette rubrique est réservée à l'administration."
        />
      );
    }

    return (
      <>
        <SectionTitle
          eyebrow="GESTION DE LA PLATEFORME"
          title="Administration"
          description="Gère les ressources pédagogiques de DN Med Study."
        />

        <div className="admin-grid">
          <button
            className="admin-card"
            onClick={() => setModal("subject")}
          >
            <IconTile
              icon={GraduationCap}
              color="#7C3AED"
              background="#F1EAFE"
            />

            <h3>Ajouter une matière</h3>
            <p>Créer une matière pour une filière et un niveau.</p>

            <ChevronRight size={19} />
          </button>

          <button
            className="admin-card"
            onClick={() => setModal("course")}
          >
            <IconTile
              icon={BookOpen}
              color="#2563EB"
              background="#EAF1FF"
            />

            <h3>Ajouter un cours</h3>
            <p>Importer un support pédagogique.</p>

            <ChevronRight size={19} />
          </button>

          <button
            className="admin-card"
            onClick={() => setModal("exam")}
          >
            <IconTile
              icon={ClipboardList}
              color="#0891B2"
              background="#E4F7FB"
            />

            <h3>Ajouter un examen</h3>
            <p>Ajouter un sujet et sa correction.</p>

            <ChevronRight size={19} />
          </button>
        </div>

        <SectionTitle
          eyebrow="CONTENU"
          title="Ressources enregistrées"
        />

        <div className="admin-stats">
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

        <div className="admin-list">
          <h3>Derniers cours ajoutés</h3>

          {courses.slice(0, 10).map(course => (
            <div className="admin-list-item" key={course.id}>
              <div>
                <strong>{course.titre || course.title}</strong>

                <span>
                  {course.matiere || "Matière non précisée"}
                </span>
              </div>

              <button
                className="danger-icon"
                onClick={() =>
                  supprimerElement("cours", course.id)
                }
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
      </>
    );
  }

  /* PARAMÈTRES */

  function SettingsPage() {
    return (
      <>
        <SectionTitle
          eyebrow="PERSONNALISATION"
          title="Paramètres"
          description="Configure ton espace personnel."
        />

        <div className="settings-card">
          <div className="settings-profile">
            <div className="profile-avatar">
              <UserRound size={30} />
            </div>

            <div>
              <h3>{displayName}</h3>
              <p>{user?.email}</p>
            </div>
          </div>

          <div className="settings-divider" />

          <div className="setting-row">
            <div>
              <strong>Mode sombre</strong>
              <p>Modifier l'apparence de ton espace.</p>
            </div>

            <button
              type="button"
              className={dark ? "toggle active" : "toggle"}
              onClick={() => setDark(!dark)}
              aria-label="Activer ou désactiver le mode sombre"
            >
              <span />
            </button>
          </div>

          <div className="settings-divider" />

          <div className="setting-row">
            <div>
              <strong>Compte administrateur</strong>
              <p>
                {isAdmin
                  ? "Tu disposes des droits d'administration."
                  : "Compte étudiant."}
              </p>
            </div>

            <ShieldCheck
              color={isAdmin ? "#10B981" : "#94A3B8"}
              size={25}
            />
          </div>

          <div className="settings-divider" />

          <div className="setting-row">
            <div>
              <strong>Actualiser les données</strong>
              <p>Recharger les cours, matières et examens.</p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={chargerDonnees}
              disabled={busy}
            >
              <RefreshCw size={16} />
              Actualiser
            </button>
          </div>

          <div className="settings-divider" />

          <button
            type="button"
            className="logout-button"
            onClick={async () => {
              try {
                await signOut(auth);
                window.location.href = "/connexion";
              } catch (error) {
                alert(error.message);
              }
            }}
          >
            <LogOut size={18} />
            Se déconnecter
          </button>
        </div>
      </>
    );
                        }
  /* MODALE MATIÈRE */

  function SubjectModal() {
    return (
      <Modal
        title="Ajouter une matière"
        onClose={() => setModal("")}
      >
        <form onSubmit={ajouterMatiere} className="modal-form">
          <Field
            label="Nom de la matière"
            value={subjectForm.nom}
            onChange={v =>
              setSubjectForm({ ...subjectForm, nom: v })
            }
            placeholder="Ex : Anatomie"
            required
          />

          <Field
            label="Université"
            value={subjectForm.universite}
            onChange={v =>
              setSubjectForm({ ...subjectForm, universite: v })
            }
            placeholder="Ex : UCAD"
          />

          <Field
            label="Filière"
            value={subjectForm.filiere}
            onChange={v =>
              setSubjectForm({ ...subjectForm, filiere: v })
            }
            placeholder="Ex : Médecine"
          />

          <Field
            label="Niveau"
            value={subjectForm.niveau}
            onChange={v =>
              setSubjectForm({ ...subjectForm, niveau: v })
            }
            placeholder="Ex : Deuxième année"
          />

          <SelectField
            label="Semestre"
            value={subjectForm.semestre}
            onChange={v =>
              setSubjectForm({ ...subjectForm, semestre: v })
            }
            options={semesters}
          />

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setModal("")}
            >
              Annuler
            </button>

            <button
              className="primary-button"
              type="submit"
              disabled={busy}
            >
              {busy ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  /* MODALE COURS */

  function CourseModal() {
    return (
      <Modal
        title="Ajouter un cours"
        onClose={() => setModal("")}
      >
        <form onSubmit={ajouterLecon} className="modal-form">
          <Field
            label="Titre du cours"
            value={courseForm.titre}
            onChange={v =>
              setCourseForm({ ...courseForm, titre: v })
            }
            placeholder="Ex : Introduction à l'anatomie"
            required
          />

          <SelectField
            label="Matière"
            value={courseForm.matiereId}
            onChange={v =>
              setCourseForm({ ...courseForm, matiereId: v })
            }
            options={subjects.map(s => ({
              value: s.id,
              label: s.nom
            }))}
          />

          <Field
            label="Description"
            value={courseForm.description}
            onChange={v =>
              setCourseForm({ ...courseForm, description: v })
            }
            placeholder="Description du support"
          />

          <Field
            label="Lien du PDF (facultatif)"
            value={courseForm.url}
            onChange={v =>
              setCourseForm({ ...courseForm, url: v })
            }
            placeholder="https://..."
          />

          <label className="field">
            <span>Ou importer un fichier PDF</span>

            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={e => {
                const file = e.target.files?.[0] || null;

                if (
                  file &&
                  file.type !== "application/pdf" &&
                  !file.name.toLowerCase().endsWith(".pdf")
                ) {
                  alert("Veuillez sélectionner un fichier PDF.");
                  e.target.value = "";
                  return;
                }

                setLessonFile(file);
              }}
            />

            {lessonFile && (
              <small className="selected-file">
                {lessonFile.name}
              </small>
            )}
          </label>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setModal("")}
            >
              Annuler
            </button>

            <button
              className="primary-button"
              type="submit"
              disabled={busy}
            >
              {busy ? "Enregistrement..." : "Ajouter le cours"}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  /* MODALE EXAMEN */

  function ExamModal() {
    return (
      <Modal
        title="Ajouter un examen"
        onClose={() => setModal("")}
      >
        <form onSubmit={ajouterExamen} className="modal-form">
          <Field
            label="Titre de l'examen"
            value={examForm.titre}
            onChange={v =>
              setExamForm({ ...examForm, titre: v })
            }
            placeholder="Ex : Examen d'anatomie"
            required
          />

          <Field
            label="Université"
            value={examForm.universite}
            onChange={v =>
              setExamForm({ ...examForm, universite: v })
            }
            placeholder="UCAD"
          />

          <Field
            label="Filière"
            value={examForm.filiere}
            onChange={v =>
              setExamForm({ ...examForm, filiere: v })
            }
            placeholder="Médecine"
          />

          <Field
            label="Niveau"
            value={examForm.niveau}
            onChange={v =>
              setExamForm({ ...examForm, niveau: v })
            }
            placeholder="Deuxième année"
          />

          <SelectField
            label="Semestre"
            value={examForm.semestre}
            onChange={v =>
              setExamForm({ ...examForm, semestre: v })
            }
            options={semesters}
          />

          <Field
            label="Matière"
            value={examForm.matiere}
            onChange={v =>
              setExamForm({ ...examForm, matiere: v })
            }
            placeholder="Anatomie"
          />

          <Field
            label="Année"
            value={examForm.annee}
            onChange={v =>
              setExamForm({ ...examForm, annee: v })
            }
            placeholder="2025"
          />

          <Field
            label="Lien du sujet"
            value={examForm.url}
            onChange={v =>
              setExamForm({ ...examForm, url: v })
            }
            placeholder="https://..."
          />

          <Field
            label="Lien de la correction"
            value={examForm.correctionUrl}
            onChange={v =>
              setExamForm({ ...examForm, correctionUrl: v })
            }
            placeholder="https://..."
          />

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setModal("")}
            >
              Annuler
            </button>

            <button
              className="primary-button"
              type="submit"
              disabled={busy}
            >
              {busy ? "Enregistrement..." : "Ajouter l'examen"}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  /* RENDU STABLE DES PAGES */

  function renderActivePage() {
    switch (active) {
      case "courses":
        return CoursesPage();

      case "exams":
        return ExamsPage();

      case "revision":
        return RevisionPage();

      case "ai":
        return AIPage();

      case "admin":
        return AdminPage();

      case "settings":
        return SettingsPage();

      default:
        return Dashboard();
    }
  }

  /* RENDU STABLE DES MODALES */

  function renderModal() {
    switch (modal) {
      case "subject":
        return SubjectModal();

      case "course":
        return CourseModal();

      case "exam":
        return ExamModal();

      default:
        return null;
    }
  }

  return (
    <div className={dark ? "app-shell dark-mode" : "app-shell"}>
      <aside className={mobileMenu ? "sidebar mobile-open" : "sidebar"}>
        <div className="brand">
          <div className="brand-mark">DN</div>

          <div>
            <strong>DN MED</strong>
            <span>STUDY</span>
          </div>

          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-label">MENU PRINCIPAL</div>

        <nav className="sidebar-nav">
          {NAVIGATION.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={active === item.id ? "nav-item active" : "nav-item"}
                onClick={() => navigate(item.id)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {isAdmin && (
          <>
            <div className="sidebar-label">GESTION</div>

            <button
              className={active === "admin" ? "nav-item active" : "nav-item"}
              onClick={() => navigate("admin")}
            >
              <ShieldCheck size={20} />
              <span>Administration</span>
            </button>
          </>
        )}

        <div className="sidebar-bottom">
          <button
            className={active === "settings" ? "nav-item active" : "nav-item"}
            onClick={() => navigate("settings")}
          >
            <Settings size={20} />
            <span>Paramètres</span>
          </button>

          <div className="sidebar-user">
            <div className="profile-avatar small">
              <UserRound size={20} />
            </div>

            <div className="sidebar-user-info">
              <strong>{displayName}</strong>
              <span>{isAdmin ? "Administrateur" : "Étudiant"}</span>
            </div>
          </div>
        </div>
      </aside>

      {mobileMenu && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu-button"
            onClick={() => setMobileMenu(true)}
          >
            <Menu size={23} />
          </button>

          <div className="topbar-title">
            <span>DN MED STUDY</span>
            <strong>
              {NAVIGATION.find(item => item.id === active)?.label ||
                (active === "admin" ? "Administration" :
                  active === "settings" ? "Paramètres" : "Accueil")}
            </strong>
          </div>

          <div className="topbar-right">
            <button
              className="icon-button"
              title="Actualiser"
              onClick={chargerDonnees}
              disabled={busy}
            >
              <RefreshCw size={19} />
            </button>

            <div className="topbar-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="page-content">
          {renderActivePage()}
        </div>

        <footer className="app-footer">
          <strong>DN MED STUDY</strong>
          <span>Apprendre · Comprendre · Réussir</span>
        </footer>
      </main>

      <nav className="mobile-bottom-nav">
        {NAVIGATION.slice(0, 4).map(item => {
          const Icon = item.icon;

          return (
            <button
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

      {renderModal()}
    </div>
  );
}

/* STYLES */

const styles = `
`;
