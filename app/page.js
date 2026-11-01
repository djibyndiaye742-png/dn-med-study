"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Home, BookOpen, Brain, ClipboardList, Sparkles,
  GraduationCap, CalendarDays, Layers, FileText,
  Search, Plus, X, Menu, ChevronRight, ArrowLeft,
  Upload, ExternalLink, Trash2, Clock,
  ChartNoAxesCombined, FolderOpen, University,
  NotebookText, FilePlus2, Settings, LogOut,
  UserRound, CheckCircle2, LoaderCircle, Download,
  MessageCircle, Send, BookMarked, Filter, RefreshCw,
  Stethoscope, ShieldCheck, History, Bookmark,
  FileCheck, Eye
} from "lucide-react";

import {
  onAuthStateChanged,
  signOut
} from "firebase/auth";

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "firebase/firestore";

import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "firebase/storage";

import { auth, db, storage } from "../lib/firebase";

import { useRouter } from "next/navigation";

const ADMIN_EMAIL = "djibyndiaye742@gmail.com";

const NAVIGATION = [
  { id: "home", label: "Accueil", icon: Home },
  { id: "courses", label: "Cours", icon: BookOpen },
  { id: "exams", label: "Examens", icon: ClipboardList },
  { id: "revision", label: "Révisions", icon: Brain },
  { id: "ai", label: "Assistant IA", icon: Sparkles },
  { id: "admin", label: "Administration", icon: ShieldCheck },
  { id: "settings", label: "Paramètres", icon: Settings }
];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function formatDate(date) {
  if (!date) return "";
  const d = date?.toDate ? date.toDate() : new Date(date);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("fr-FR");
}

function Field({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  required = false
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Sélectionner</option>
        {options.map((option) => (
          <option
            key={typeof option === "string" ? option : option.value}
            value={typeof option === "string" ? option : option.value}
          >
            {typeof option === "string" ? option : option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyState({ icon: Icon = FolderOpen, text }) {
  return (
    <div className="empty-state">
      <Icon size={34} />
      <p>{text}</p>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [active, setActive] = useState("home");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [dark, setDark] = useState(false);

  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [history, setHistory] = useState([]);

  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  const [modal, setModal] = useState("");

  const [subjectForm, setSubjectForm] = useState({
    nom: "",
    universite: "UCAD",
    filiere: "Médecine",
    niveau: "Deuxième année",
    semestre: "Premier semestre"
  });

  const [courseForm, setCourseForm] = useState({
    titre: "",
    matiereId: "",
    url: "",
    description: ""
  });

  const [examForm, setExamForm] = useState({
    titre: "",
    matiereId: "",
    sujetUrl: "",
    correctionUrl: "",
    annee: ""
  });

  const [lessonFile, setLessonFile] = useState(null);
  const [examFile, setExamFile] = useState(null);
  const [correctionFile, setCorrectionFile] = useState(null);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [aiFile, setAiFile] = useState(null);
  const [aiAction, setAiAction] = useState("resume");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiResult, setAiResult] = useState("");

  const isAdmin =
    normalize(user?.email) === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/connexion");
        return;
      }

      setUser(currentUser);

      try {
        const profileRef = doc(db, "users", currentUser.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          setProfile(profileSnap.data());
        }

        await chargerDonnees(currentUser.uid);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  async function chargerDonnees(uid = user?.uid) {
    if (!uid) return;

    try {
      const [coursesSnap, subjectsSnap, examsSnap, historySnap] =
        await Promise.all([
          getDocs(collection(db, "cours")),
          getDocs(collection(db, "matieres")),
          getDocs(collection(db, "examens")),
          getDocs(
            query(
              collection(db, "users", uid, "resultats"),
              orderBy("createdAt", "desc")
            )
          )
        ]);

      setCourses(
        coursesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );

      setSubjects(
        subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );

      setExams(
        examsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );

      setHistory(
        historySnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    } catch (error) {
      console.error("Chargement:", error);
    }
  }

  async function ajouterMatiere(e) {
    e.preventDefault();

    if (!isAdmin) return;

    if (!subjectForm.nom.trim()) {
      return alert("Entre le nom de la matière.");
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
        nom: "",
        universite: "UCAD",
        filiere: "Médecine",
        niveau: "Deuxième année",
        semestre: "Premier semestre"
      });

      setModal("");
      await chargerDonnees();

      alert("Matière créée avec succès.");
    } catch (error) {
      console.error(error);
      alert("Impossible de créer la matière : " + error.message);
    } finally {
      setBusy(false);
    }
  }

  async function ajouterLecon(e) {
    e.preventDefault();

    if (!isAdmin) return;

    const subject = subjects.find(
      (s) => s.id === courseForm.matiereId
    );

    if (!subject) return alert("Sélectionne une matière.");

    if (!courseForm.titre.trim()) {
      return alert("Entre le titre de la leçon.");
    }

    if (!lessonFile && !courseForm.url.trim()) {
      return alert("Choisis un PDF ou ajoute un lien.");
    }

    if (
      lessonFile &&
      lessonFile.type !== "application/pdf" &&
      !lessonFile.name.toLowerCase().endsWith(".pdf")
    ) {
      return alert("Le fichier doit être un PDF.");
    }

    setBusy(true);
    setUploading(false);
    setUploadProgress(0);

    try {
      let pdfUrl = courseForm.url.trim();

      if (lessonFile) {
        setUploading(true);

        const safeName = lessonFile.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

        const fileRef = ref(
          storage,
          `cours/${user.uid}/${Date.now()}_${safeName}`
        );

        const task = uploadBytesResumable(fileRef, lessonFile, {
          contentType: "application/pdf"
        });

        pdfUrl = await new Promise((resolve, reject) => {
          task.on(
            "state_changed",
            (snapshot) => {
              const percent = Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              );
              setUploadProgress(percent);
            },
            reject,
            async () => {
              try {
                resolve(await getDownloadURL(task.snapshot.ref));
              } catch (error) {
                reject(error);
              }
            }
          );
        });
      }

      await addDoc(collection(db, "cours"), {
        titre: courseForm.titre.trim(),
        matiere: subject.nom,
        matiereId: subject.id,
        universite: subject.universite,
        filiere: subject.filiere,
        niveau: subject.niveau,
        semestre: subject.semestre,
        description: courseForm.description.trim(),
        url: pdfUrl,
        pdfUrl,
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

      alert("Leçon publiée avec succès.");
    } catch (error) {
      console.error("Publication:", error);
      alert(
        "Erreur de publication : " +
        (error.message || "Vérifie Firebase Storage.")
      );
    } finally {
      setBusy(false);
      setUploading(false);
    }
  }

  async function ajouterExamen(e) {
    e.preventDefault();

    if (!isAdmin) return;

    const subject = subjects.find(
      (s) => s.id === examForm.matiereId
    );

    if (!subject) return alert("Sélectionne une matière.");

    if (!examForm.titre.trim()) {
      return alert("Entre le titre de l'examen.");
    }

    setBusy(true);

    try {
      let sujetUrl = examForm.sujetUrl.trim();
      let correctionUrl = examForm.correctionUrl.trim();

      if (examFile) {
        const fileRef = ref(
          storage,
          `examens/${user.uid}/${Date.now()}_${examFile.name}`
        );

        const task = uploadBytesResumable(fileRef, examFile);
        await new Promise((resolve, reject) => {
          task.on(
            "state_changed",
            null,
            reject,
            async () => {
              try {
                sujetUrl = await getDownloadURL(task.snapshot.ref);
                resolve();
              } catch (error) {
                reject(error);
              }
            }
          );
        });
      }

      if (correctionFile) {
        const fileRef = ref(
          storage,
          `corrections/${user.uid}/${Date.now()}_${correctionFile.name}`
        );

        const task = uploadBytesResumable(fileRef, correctionFile);

        await new Promise((resolve, reject) => {
          task.on(
            "state_changed",
            null,
            reject,
            async () => {
              try {
                correctionUrl = await getDownloadURL(task.snapshot.ref);
                resolve();
              } catch (error) {
                reject(error);
              }
            }
          );
        });
      }

      await addDoc(collection(db, "examens"), {
        titre: examForm.titre.trim(),
        matiere: subject.nom,
        matiereId: subject.id,
        universite: subject.universite,
        filiere: subject.filiere,
        niveau: subject.niveau,
        semestre: subject.semestre,
        annee: examForm.annee,
        sujetUrl,
        correctionUrl,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      setExamForm({
        titre: "",
        matiereId: "",
        sujetUrl: "",
        correctionUrl: "",
        annee: ""
      });

      setExamFile(null);
      setCorrectionFile(null);
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

  async function supprimerElement(collectionName, id) {
    if (!isAdmin) return;

    if (!confirm("Confirmer la suppression ?")) return;

    try {
      await deleteDoc(doc(db, collectionName, id));
      await chargerDonnees();
    } catch (error) {
      alert("Suppression impossible : " + error.message);
    }
  }

  async function lancerIA(e, actionOverride = aiAction) {
    e?.preventDefault();

    if (!aiFile) {
      return alert("Sélectionne d'abord un fichier PDF.");
    }

    setBusy(true);
    setAiResult("");

    try {
      const formData = new FormData();

      formData.append("fichier", aiFile);
      formData.append("action", actionOverride);

      if (aiQuestion.trim()) {
        formData.append("question", aiQuestion.trim());
      }

      const response = await fetch("/api/ia", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur du service IA.");
      }

      const result =
        data.resultat ||
        data.result ||
        data.reponse ||
        data.text ||
        data.contenu ||
        "";

      setAiResult(result);

      await addDoc(
        collection(db, "users", user.uid, "resultats"),
        {
          type: actionOverride,
          fichier: aiFile.name,
          resultat: result,
          createdAt: serverTimestamp()
        }
      );

      await chargerDonnees();
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

    await lancerIA(e, "chat");
  }

  async function deconnexion() {
    await signOut(auth);
    router.replace("/connexion");
  }

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        normalize(course.titre).includes(normalize(search)) ||
        normalize(course.matiere).includes(normalize(search));

      const matchesSubject =
        !filterSubject || course.matiereId === filterSubject;

      return matchesSearch && matchesSubject;
    });
  }, [courses, search, filterSubject]);

  const filteredExams = useMemo(() => {
    return exams.filter((exam) =>
      normalize(exam.titre + " " + exam.matiere).includes(normalize(search))
    );
  }, [exams, search]);

  const displayName =
    profile?.prenom ||
    profile?.nom ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Étudiant";

  function Dashboard() {
    return (
      <>
        <div className="welcome">
          <div>
            <p className="eyebrow">ESPACE ÉTUDIANT</p>
            <h1>Bienvenue, {displayName}</h1>
            <p>Tout ton environnement de travail médical au même endroit.</p>
          </div>
          <div className="welcome-icon">
            <Stethoscope size={42} />
          </div>
        </div>

        <div className="stats-grid">
          <Stat icon={BookOpen} label="Cours disponibles" value={courses.length} />
          <Stat icon={Layers} label="Matières" value={subjects.length} />
          <Stat icon={ClipboardList} label="Examens" value={exams.length} />
          <Stat icon={History} label="Travaux IA" value={history.length} />
        </div>

        <SectionTitle title="Accès rapide" />

        <div className="quick-grid">
          {[
            ["courses", "Bibliothèque des cours", BookOpen],
            ["exams", "Examens et corrections", ClipboardList],
            ["ai", "Assistant intelligent", Sparkles],
            ["revision", "Mes révisions", Brain]
          ].map(([id, label, Icon]) => (
            <button
              className="quick-card"
              key={id}
              onClick={() => setActive(id)}
            >
              <Icon size={24} />
              <span>{label}</span>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>

        <SectionTitle title="Derniers cours ajoutés" />

        <div className="list-card">
          {courses.slice(0, 5).map((course) => (
            <div className="list-row" key={course.id}>
              <FileText size={20} />
              <div>
                <strong>{course.titre}</strong>
                <small>{course.matiere}</small>
              </div>
              <a href={course.pdfUrl || course.url} target="_blank" rel="noreferrer">
                <ExternalLink size={18} />
              </a>
            </div>
          ))}

          {courses.length === 0 && (
            <EmptyState text="Aucun cours disponible pour le moment." />
          )}
        </div>
      </>
    );
  }

  function SectionTitle({ title, action, onAction }) {
    return (
      <div className="section-title">
        <h2>{title}</h2>
        {action && (
          <button onClick={onAction}>{action}</button>
        )}
      </div>
    );
  }

  function Stat({ icon: Icon, label, value }) {
    return (
      <div className="stat-card">
        <div className="stat-icon"><Icon size={22} /></div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    );
  }

  function CoursesPage() {
    return (
      <>
        <SectionTitle
          title="Bibliothèque des cours"
          action={isAdmin ? "Ajouter un cours" : null}
          onAction={() => setModal("course")}
        />

        <div className="filters">
          <div className="search-box">
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un cours..."
            />
          </div>

          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
          >
            <option value="">Toutes les matières</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.nom}</option>
            ))}
          </select>
        </div>

        <div className="course-grid">
          {filteredCourses.map((course) => (
            <article className="course-card" key={course.id}>
              <div className="course-icon"><FileText size={26} /></div>
              <small>{course.matiere}</small>
              <h3>{course.titre}</h3>
              <p>{course.description || "Document de cours disponible."}</p>
              <a
                href={course.pdfUrl || course.url}
                target="_blank"
                rel="noreferrer"
                className="primary-button"
              >
                <Eye size={17} /> Ouvrir le cours
              </a>

              {isAdmin && (
                <button
                  className="delete-button"
                  onClick={() => supprimerElement("cours", course.id)}
                >
                  <Trash2 size={16} /> Supprimer
                </button>
              )}
            </article>
          ))}

          {filteredCourses.length === 0 && (
            <EmptyState text="Aucun cours trouvé." />
          )}
        </div>
      </>
    );
  }

  function ExamsPage() {
    return (
      <>
        <SectionTitle
          title="Examens"
          action={isAdmin ? "Ajouter un examen" : null}
          onAction={() => setModal("exam")}
        />

        <div className="search-box">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un examen..."
          />
        </div>

        <div className="list-card">
          {filteredExams.map((exam) => (
            <div className="exam-row" key={exam.id}>
              <div className="course-icon"><ClipboardList size={24} /></div>

              <div className="exam-info">
                <strong>{exam.titre}</strong>
                <span>{exam.matiere} · {exam.annee || "Année non précisée"}</span>
              </div>

              {exam.sujetUrl && (
                <a
                  href={exam.sujetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="small-button"
                >
                  Sujet
                </a>
              )}

              {exam.correctionUrl ? (
                <a
                  href={exam.correctionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="small-button secondary"
                >
                  Correction
                </a>
              ) : (
                <span className="unavailable">Correction non disponible</span>
              )}

              {isAdmin && (
                <button
                  className="icon-button danger"
                  onClick={() => supprimerElement("examens", exam.id)}
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
          ))}

          {filteredExams.length === 0 && (
            <EmptyState text="Aucun examen disponible." />
          )}
        </div>
      </>
    );
  }

  function RevisionPage() {
    return (
      <>
        <SectionTitle title="Mes révisions" />

        <div className="stats-grid">
          <Stat icon={History} label="Résultats enregistrés" value={history.length} />
          <Stat icon={BookMarked} label="Documents utilisés" value={new Set(history.map(h => h.fichier)).size} />
        </div>

        <div className="list-card">
          {history.map((item) => (
            <div className="list-row" key={item.id}>
              <Brain size={21} />
              <div>
                <strong>{item.fichier || "Document"}</strong>
                <small>{item.type} · {formatDate(item.createdAt)}</small>
              </div>
              <button onClick={() => setAiResult(item.resultat || "")}>
                <Eye size={18} />
              </button>
            </div>
          ))}

          {history.length === 0 && (
            <EmptyState text="Ton historique de révision apparaîtra ici." />
          )}
        </div>

        {aiResult && (
          <div className="result-card">
            <button className="close-result" onClick={() => setAiResult("")}>
              <X size={18} />
            </button>
            <h3>Résultat</h3>
            <pre>{aiResult}</pre>
          </div>
        )}
      </>
    );
  }

  function AIPage() {
    return (
      <>
        <SectionTitle title="Assistant intelligent" />

        <div className="ai-card">
          <div className="ai-heading">
            <Sparkles size={30} />
            <div>
              <h2>Travaille tes cours plus efficacement</h2>
              <p>Importe un PDF et choisis le traitement souhaité.</p>
            </div>
          </div>

          <form onSubmit={(e) => lancerIA(e)}>
            <label className="upload-zone">
              <Upload size={30} />
              <strong>{aiFile ? aiFile.name : "Sélectionner un PDF"}</strong>
              <span>Appuie ici pour choisir un document</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setAiFile(e.target.files?.[0] || null)}
              />
            </label>

            <div className="ai-actions">
              {[
                ["resume", "Résumé"],
                ["qcm", "QCM"],
                ["flashcards", "Flashcards"]
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={aiAction === value ? "active-chip" : "chip"}
                  onClick={() => setAiAction(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <button className="primary-button full" disabled={busy}>
              {busy ? <LoaderCircle className="spin" /> : <Sparkles size={18} />}
              {busy ? "Traitement en cours..." : "Lancer le traitement"}
            </button>
          </form>

          <form onSubmit={poserQuestion} className="question-form">
            <Field
              label="Poser une question sur le document"
              value={aiQuestion}
              onChange={setAiQuestion}
              placeholder="Écris ta question..."
            />
            <button className="primary-button" disabled={busy || !aiFile}>
              <Send size={17} /> Envoyer
            </button>
          </form>
        </div>

        {aiResult && (
          <div className="result-card">
            <h3>Résultat</h3>
            <pre>{aiResult}</pre>
            <button
              className="small-button"
              onClick={() => navigator.clipboard.writeText(aiResult)}
            >
              Copier le résultat
            </button>
          </div>
        )}
      </>
    );
  }

  function AdminPage() {
    if (!isAdmin) {
      return (
        <EmptyState
          icon={ShieldCheck}
          text="Cette section est réservée à l'administration."
        />
      );
    }

    return (
      <>
        <SectionTitle title="Administration" />

        <div className="admin-grid">
          <button onClick={() => setModal("subject")}>
            <Plus size={24} />
            <strong>Créer une matière</strong>
            <span>Ajouter une nouvelle matière</span>
          </button>

          <button onClick={() => setModal("course")}>
            <FilePlus2 size={24} />
            <strong>Publier un cours</strong>
            <span>Ajouter un document PDF</span>
          </button>

          <button onClick={() => setModal("exam")}>
            <ClipboardList size={24} />
            <strong>Ajouter un examen</strong>
            <span>Ajouter un sujet et sa correction</span>
          </button>
        </div>

        <SectionTitle title="Matières enregistrées" />

        <div className="list-card">
          {subjects.map((subject) => (
            <div className="list-row" key={subject.id}>
              <BookOpen size={20} />
              <div>
                <strong>{subject.nom}</strong>
                <small>
                  {subject.filiere} · {subject.niveau} · {subject.semestre}
                </small>
              </div>
              <button
                className="icon-button danger"
                onClick={() => supprimerElement("matieres", subject.id)}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
      </>
    );
  }

  function SettingsPage() {
    return (
      <>
        <SectionTitle title="Paramètres" />

        <div className="settings-card">
          <UserRound size={24} />
          <div>
            <strong>{displayName}</strong>
            <p>{user?.email}</p>
          </div>
        </div>

        <button
          className="settings-action"
          onClick={() => setDark(!dark)}
        >
          <Settings size={20} />
          <span>Mode sombre</span>
          <strong>{dark ? "Activé" : "Désactivé"}</strong>
        </button>

        <button className="settings-action logout" onClick={deconnexion}>
          <LogOut size={20} />
          <span>Se déconnecter</span>
        </button>
      </>
    );
  }

  function Modal({ title, children, onClose }) {
    return (
      <div className="modal-overlay" onMouseDown={onClose}>
        <div
          className="modal-card"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>{title}</h2>
            <button onClick={onClose}><X size={22} /></button>
          </div>
          {children}
        </div>
      </div>
    );
  }

  function SubjectModal() {
    return Modal({
      title: "Créer une matière",
      onClose: () => setModal(""),
      children: (
        <form onSubmit={ajouterMatiere}>
          <Field
            label="Nom de la matière"
            value={subjectForm.nom}
            onChange={(v) => setSubjectForm({ ...subjectForm, nom: v })}
            required
          />

          <Field
            label="Université"
            value={subjectForm.universite}
            onChange={(v) => setSubjectForm({ ...subjectForm, universite: v })}
          />

          <Field
            label="Filière"
            value={subjectForm.filiere}
            onChange={(v) => setSubjectForm({ ...subjectForm, filiere: v })}
          />

          <SelectField
            label="Année d'étude"
            value={subjectForm.niveau}
            onChange={(v) => setSubjectForm({ ...subjectForm, niveau: v })}
            options={[
              "Première année",
              "Deuxième année",
              "Troisième année",
              "Quatrième année",
              "Cinquième année",
              "Sixième année"
            ]}
          />

          <SelectField
            label="Semestre"
            value={subjectForm.semestre}
            onChange={(v) => setSubjectForm({ ...subjectForm, semestre: v })}
            options={[
              "Premier semestre",
              "Deuxième semestre"
            ]}
          />

          <button className="primary-button full" disabled={busy}>
            {busy ? "Création..." : "Créer la matière"}
          </button>
        </form>
      )
    });
  }

  function CourseModal() {
    return Modal({
      title: "Publier un cours",
      onClose: () => setModal(""),
      children: (
        <form onSubmit={ajouterLecon}>
          <Field
            label="Titre de la leçon"
            value={courseForm.titre}
            onChange={(v) => setCourseForm({ ...courseForm, titre: v })}
            required
          />

          <SelectField
            label="Matière"
            value={courseForm.matiereId}
            onChange={(v) => setCourseForm({ ...courseForm, matiereId: v })}
            options={subjects.map((s) => ({
              value: s.id,
              label: s.nom
            }))}
          />

          <label className="field">
            <span>Document PDF</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setLessonFile(e.target.files?.[0] || null)}
            />
          </label>

          {lessonFile && (
            <p className="file-selected">
              <FileCheck size={17} /> {lessonFile.name}
            </p>
          )}

          {uploading && (
            <div className="upload-progress">
              <div className="upload-progress-info">
                <span>Envoi du document</span>
                <strong>{uploadProgress}%</strong>
              </div>
              <div className="upload-progress-track">
                <div
                  className="upload-progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <Field
            label="Ou lien PDF externe"
            value={courseForm.url}
            onChange={(v) => setCourseForm({ ...courseForm, url: v })}
            placeholder="https://..."
          />

          <label className="field">
            <span>Description</span>
            <textarea
              value={courseForm.description}
              onChange={(e) =>
                setCourseForm({
                  ...courseForm,
                  description: e.target.value
                })
              }
              rows={3}
            />
          </label>

          <button className="primary-button full" disabled={busy}>
            {busy ? "Publication en cours..." : "Publier le cours"}
          </button>
        </form>
      )
    });
  }

  function ExamModal() {
    return Modal({
      title: "Ajouter un examen",
      onClose: () => setModal(""),
      children: (
        <form onSubmit={ajouterExamen}>
          <Field
            label="Titre de l'examen"
            value={examForm.titre}
            onChange={(v) => setExamForm({ ...examForm, titre: v })}
            required
          />

          <SelectField
            label="Matière"
            value={examForm.matiereId}
            onChange={(v) => setExamForm({ ...examForm, matiereId: v })}
            options={subjects.map((s) => ({
              value: s.id,
              label: s.nom
            }))}
          />

          <Field
            label="Année"
            value={examForm.annee}
            onChange={(v) => setExamForm({ ...examForm, annee: v })}
            placeholder="Ex : 2025-2026"
          />

          <label className="field">
            <span>Fichier PDF du sujet</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setExamFile(e.target.files?.[0] || null)}
            />
          </label>

          <Field
            label="Ou lien du sujet"
            value={examForm.sujetUrl}
            onChange={(v) => setExamForm({ ...examForm, sujetUrl: v })}
            placeholder="https://..."
          />

          <label className="field">
            <span>Fichier PDF de la correction</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setCorrectionFile(e.target.files?.[0] || null)}
            />
          </label>

          <Field
            label="Ou lien de la correction"
            value={examForm.correctionUrl}
            onChange={(v) => setExamForm({ ...examForm, correctionUrl: v })}
            placeholder="https://..."
          />

          <button className="primary-button full" disabled={busy}>
            {busy ? "Enregistrement..." : "Ajouter l'examen"}
          </button>
        </form>
      )
    });
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <Stethoscope size={38} />
        <h2>DN Med Study</h2>
        <LoaderCircle className="spin" />
        <p>Chargement de ton espace...</p>
      </div>
    );
  }

  const pageRenderers = {
    home: Dashboard,
    courses: CoursesPage,
    exams: ExamsPage,
    revision: RevisionPage,
    ai: AIPage,
    admin: AdminPage,
    settings: SettingsPage
  };

  return (
    <main className={dark ? "app-shell dark" : "app-shell"}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Stethoscope size={25} /></div>
          <div>
            <strong>DN Med Study</strong>
            <small>Plateforme médicale</small>
          </div>
        </div>

        <nav>
          {NAVIGATION.filter((item) =>
            item.id !== "admin" || isAdmin
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={active === id ? "nav-item active" : "nav-item"}
              onClick={() => {
                setActive(id);
                setMobileMenu(false);
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
              {active === id && <ChevronRight size={17} />}
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="avatar"><UserRound size={20} /></div>
          <div>
            <strong>{displayName}</strong>
            <small>{isAdmin ? "Administrateur" : "Étudiant"}</small>
          </div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu-button"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            <Menu size={23} />
          </button>

          <div className="topbar-title">
            <span>DN MED STUDY</span>
            <strong>{NAVIGATION.find((n) => n.id === active)?.label}</strong>
          </div>

          <button
            className="icon-button"
            onClick={() => chargerDonnees()}
            title="Actualiser"
          >
            <RefreshCw size={19} />
          </button>
        </header>

        {mobileMenu && (
          <div className="mobile-dropdown">
            {NAVIGATION.filter((item) =>
              item.id !== "admin" || isAdmin
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setActive(id);
                  setMobileMenu(false);
                }}
              >
                <Icon size={19} /> {label}
              </button>
            ))}
          </div>
        )}

        <div className="page-wrapper">
          {(pageRenderers[active] || Dashboard)()}
        </div>
      </section>

      <nav className="mobile-bottom-nav">
        {NAVIGATION.filter((n) =>
          ["home", "courses", "exams", "ai"].includes(n.id)
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={active === id ? "active" : ""}
            onClick={() => setActive(id)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {modal === "subject" && SubjectModal()}
      {modal === "course" && CourseModal()}
      {modal === "exam" && ExamModal()}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Arial, Helvetica, sans-serif;
          background: #f4f7fb;
          color: #172337;
        }

        button, input, select, textarea {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .app-shell {
          min-height: 100vh;
          display: flex;
          background: #f4f7fb;
          color: #172337;
        }

        .sidebar {
          width: 255px;
          min-width: 255px;
          background: #fff;
          border-right: 1px solid #e7edf4;
          padding: 25px 15px;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          position: fixed;
          inset: 0 auto 0 0;
          z-index: 10;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 10px 30px;
        }

        .brand-icon {
          width: 45px;
          height: 45px;
          border-radius: 13px;
          background: #e9f1ff;
          color: #2563eb;
          display: grid;
          place-items: center;
        }

        .brand strong, .brand small {
          display: block;
        }

        .brand strong {
          font-size: 17px;
        }

        .brand small {
          color: #8491a5;
          margin-top: 4px;
          font-size: 11px;
        }

        .sidebar nav {
          display: grid;
          gap: 7px;
        }

        .nav-item {
          border: 0;
          background: transparent;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 13px 14px;
          border-radius: 11px;
          text-align: left;
          width: 100%;
        }

        .nav-item span {
          flex: 1;
        }

        .nav-item.active {
          color: #2563eb;
          background: #edf4ff;
          font-weight: 700;
        }

        .sidebar-user {
          margin-top: auto;
          padding: 18px 8px 0;
          border-top: 1px solid #edf0f5;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar {
          width: 38px;
          height: 38px;
          background: #e9f1ff;
          color: #2563eb;
          border-radius: 50%;
          display: grid;
          place-items: center;
        }

        .sidebar-user strong, .sidebar-user small {
          display: block;
        }

        .sidebar-user small {
          color: #8491a5;
          margin-top: 4px;
        }

        .main-area {
          flex: 1;
          margin-left: 255px;
          min-width: 0;
        }

        .topbar {
          height: 76px;
          background: #fff;
          border-bottom: 1px solid #e7edf4;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 35px;
          position: sticky;
          top: 0;
          z-index: 5;
        }

        .topbar-title span {
          display: block;
          font-size: 10px;
          color: #8b99aa;
          letter-spacing: 1.4px;
          margin-bottom: 5px;
        }

        .topbar-title strong {
          font-size: 18px;
        }

        .page-wrapper {
          max-width: 1400px;
          margin: auto;
          padding: 32px 35px 70px;
        }

        .welcome {
          padding: 35px;
          background: linear-gradient(120deg, #123b7a, #2563eb);
          color: white;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 25px;
        }

        .welcome h1 {
          font-size: 28px;
          margin: 8px 0;
        }

        .welcome p {
          color: #dce8ff;
          margin-bottom: 0;
        }

        .eyebrow {
          font-size: 11px;
          letter-spacing: 2px;
        }

        .welcome-icon {
          width: 75px;
          height: 75px;
          border-radius: 20px;
          background: #ffffff22;
          display: grid;
          place-items: center;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e9eef5;
          border-radius: 15px;
          padding: 20px;
          display: grid;
          gap: 9px;
        }

        .stat-icon {
          color: #2563eb;
        }

        .stat-card strong {
          font-size: 27px;
        }

        .stat-card span {
          color: #8290a3;
          font-size: 13px;
        }

        .section-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 30px 0 16px;
          gap: 10px;
        }

        .section-title h2 {
          font-size: 19px;
          margin: 0;
        }

        .section-title button {
          border: 0;
          color: #2563eb;
          background: #edf4ff;
          border-radius: 9px;
          padding: 10px 13px;
          font-weight: 700;
        }

        .quick-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 13px;
        }

        .quick-card {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 19px;
          background: white;
          border: 1px solid #e9eef5;
          border-radius: 13px;
          color: #2563eb;
          text-align: left;
        }

        .quick-card span {
          flex: 1;
          color: #26364c;
          font-weight: 700;
        }

        .list-card {
          background: white;
          border: 1px solid #e9eef5;
          border-radius: 15px;
          padding: 8px 18px;
        }

        .list-row, .exam-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 0;
          border-bottom: 1px solid #edf0f5;
        }

        .list-row:last-child, .exam-row:last-child {
          border-bottom: 0;
        }

        .list-row > div {
          flex: 1;
          min-width: 0;
        }

        .list-row strong, .list-row small {
          display: block;
        }

        .list-row small {
          color: #8491a5;
          margin-top: 5px;
        }

        .list-row > svg {
          color: #2563eb;
        }

        .list-row a, .list-row button {
          color: #2563eb;
          background: transparent;
          border: 0;
        }

        .filters {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 13px;
          background: white;
          border: 1px solid #e1e8f0;
          border-radius: 10px;
          min-height: 46px;
          flex: 1;
          color: #8290a3;
          margin-bottom: 15px;
        }

        .search-box input {
          border: 0;
          outline: 0;
          background: transparent;
          width: 100%;
          min-width: 0;
        }

        .filters select {
          min-width: 190px;
          padding: 10px;
          border: 1px solid #e1e8f0;
          border-radius: 10px;
          background: white;
        }

        .course-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 17px;
        }

        .course-card {
          background: white;
          border: 1px solid #e9eef5;
          border-radius: 15px;
          padding: 20px;
          min-width: 0;
        }

        .course-icon {
          color: #2563eb;
          background: #edf4ff;
          width: 43px;
          height: 43px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .course-card > small {
          display: block;
          color: #2563eb;
          margin-top: 15px;
        }

        .course-card h3 {
          font-size: 16px;
        }

        .course-card p {
          color: #7c899b;
          font-size: 13px;
          line-height: 1.6;
        }

        .primary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #2563eb;
          color: white;
          border: 0;
          border-radius: 10px;
          padding: 12px 16px;
          text-decoration: none;
          font-weight: 700;
        }

        .primary-button:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .full {
          width: 100%;
          margin-top: 15px;
        }

        .delete-button {
          border: 0;
          background: #fff0f0;
          color: #dc2626;
          border-radius: 8px;
          padding: 9px;
          margin-top: 10px;
          display: flex;
          gap: 6px;
        }

        .small-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 8px;
          padding: 9px 12px;
          color: white;
          background: #2563eb;
          text-decoration: none;
          font-size: 12px;
        }

        .small-button.secondary {
          background: #e9f1ff;
          color: #2563eb;
        }

        .exam-info {
          flex: 1;
          min-width: 0;
        }

        .exam-info strong, .exam-info span {
          display: block;
        }

        .exam-info span, .unavailable {
          font-size: 12px;
          color: #8491a5;
          margin-top: 5px;
        }

        .icon-button {
          border: 0;
          background: #edf4ff;
          color: #2563eb;
          width: 39px;
          height: 39px;
          border-radius: 10px;
          display: grid;
          place-items: center;
        }

        .icon-button.danger {
          color: #dc2626;
          background: #fff0f0;
        }

        .empty-state {
          text-align: center;
          padding: 35px 15px;
          color: #94a3b8;
          grid-column: 1 / -1;
        }

        .empty-state svg {
          margin-bottom: 10px;
        }

        .ai-card, .result-card {
          background: white;
          border: 1px solid #e9eef5;
          border-radius: 17px;
          padding: 25px;
        }

        .ai-heading {
          display: flex;
          gap: 15px;
          color: #2563eb;
          margin-bottom: 22px;
        }

        .ai-heading h2 {
          color: #172337;
          font-size: 19px;
          margin: 0 0 7px;
        }

        .ai-heading p {
          color: #8491a5;
          margin: 0;
        }

        .upload-zone {
          border: 2px dashed #cbd8e8;
          border-radius: 14px;
          min-height: 150px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: #2563eb;
          cursor: pointer;
          padding: 20px;
          text-align: center;
        }

        .upload-zone input {
          display: none;
        }

        .upload-zone span {
          color: #8491a5;
          font-size: 12px;
        }

        .ai-actions {
          display: flex;
          gap: 9px;
          margin-top: 18px;
          flex-wrap: wrap;
        }

        .chip, .active-chip {
          border: 1px solid #dce5f0;
          border-radius: 20px;
          padding: 9px 16px;
          background: white;
          color: #64748b;
        }

        .active-chip {
          background: #edf4ff;
          border-color: #2563eb;
          color: #2563eb;
          font-weight: 700;
        }

        .question-form {
          display: flex;
          align-items: end;
          gap: 12px;
          margin-top: 20px;
        }

        .question-form .field {
          flex: 1;
        }

        .result-card {
          margin-top: 20px;
          position: relative;
        }

        .result-card pre {
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          font-family: inherit;
          line-height: 1.7;
          color: #475569;
        }

        .admin-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }

        .admin-grid button {
          display: grid;
          gap: 10px;
          text-align: left;
          background: white;
          color: #2563eb;
          border: 1px solid #e9eef5;
          border-radius: 14px;
          padding: 20px;
        }

        .admin-grid strong {
          color: #172337;
        }

        .admin-grid span {
          color: #8491a5;
          font-size: 12px;
        }

        .settings-card, .settings-action {
          display: flex;
          align-items: center;
          gap: 15px;
          background: white;
          border: 1px solid #e9eef5;
          padding: 18px;
          border-radius: 13px;
          width: 100%;
          margin-bottom: 12px;
          text-align: left;
          color: #2563eb;
        }

        .settings-card p {
          color: #8491a5;
          margin-bottom: 0;
        }

        .settings-action span {
          flex: 1;
          color: #172337;
        }

        .settings-action strong {
          color: #2563eb;
        }

        .settings-action.logout {
          color: #dc2626;
        }

        .settings-action.logout span {
          color: #dc2626;
        }

        .field {
          display: grid;
          gap: 8px;
          margin-bottom: 16px;
          color: #475569;
          font-size: 13px;
        }

        .field input, .field select, .field textarea {
          width: 100%;
          min-height: 45px;
          padding: 11px 12px;
          border: 1px solid #dce5f0;
          border-radius: 9px;
          background: white;
          color: #172337;
          outline: none;
        }

        .field input:focus, .field select:focus, .field textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px #2563eb18;
        }

        .file-selected {
          color: #2563eb;
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-wrap: anywhere;
        }

        .upload-progress {
          margin: 12px 0 18px;
        }

        .upload-progress-info {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 8px;
          color: #526579;
        }

        .upload-progress-track {
          height: 9px;
          width: 100%;
          border-radius: 20px;
          overflow: hidden;
          background: #e2e8f0;
        }

        .upload-progress-fill {
          height: 100%;
          background: #2563eb;
          border-radius: 20px;
          transition: width .2s ease;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: #0f172a99;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 15px;
          overflow-y: auto;
        }

        .modal-card {
          width: min(100%, 540px);
          max-height: 92vh;
          overflow-y: auto;
          background: white;
          border-radius: 17px;
          padding: 23px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 22px;
        }

        .modal-header h2 {
          font-size: 19px;
          margin: 0;
        }

        .modal-header button {
          background: #edf4ff;
          border: 0;
          color: #2563eb;
          width: 35px;
          height: 35px;
          border-radius: 9px;
        }

        .loading-screen {
          min-height: 100vh;
          display: grid;
          place-content: center;
          justify-items: center;
          gap: 13px;
          color: #2563eb;
        }

        .loading-screen h2 {
          color: #172337;
        }

        .loading-screen p {
          color: #8491a5;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .mobile-menu-button, .mobile-dropdown, .mobile-bottom-nav {
          display: none;
        }

        .dark {
          background: #101827;
          color: #e5edf8;
        }

        .dark .main-area,
        .dark .page-wrapper {
          background: #101827;
        }

        .dark .topbar,
        .dark .sidebar,
        .dark .stat-card,
        .dark .quick-card,
        .dark .list-card,
        .dark .course-card,
        .dark .ai-card,
        .dark .result-card,
        .dark .admin-grid button,
        .dark .settings-card,
        .dark .settings-action {
          background: #1c293a;
          border-color: #334155;
          color: #e5edf8;
        }

        .dark .quick-card span,
        .dark .admin-grid strong,
        .dark .settings-action span,
        .dark .ai-heading h2 {
          color: #e5edf8;
        }

        .dark .field input,
        .dark .field select,
        .dark .field textarea {
          background: #1c293a;
          border-color: #475569;
          color: white;
        }

        .dark .nav-item {
          color: #b4c2d4;
        }

        .dark .nav-item.active {
          background: #263d60;
          color: #8bb7ff;
        }

        @media (max-width: 1050px) {
          .course-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .admin-grid {
            grid-template-columns: 1fr 1fr;
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
            height: 65px;
            padding: 0 15px;
          }

          .mobile-menu-button {
            display: grid;
            place-items: center;
            border: 0;
            background: #edf4ff;
            color: #2563eb;
            width: 39px;
            height: 39px;
            border-radius: 10px;
          }

          .page-wrapper {
            padding: 20px 15px 35px;
          }

          .welcome {
            padding: 24px 20px;
          }

          .welcome h1 {
            font-size: 22px;
          }

          .welcome-icon {
            display: none;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }

          .stat-card {
            padding: 15px;
          }

          .stat-card strong {
            font-size: 23px;
          }

          .quick-grid {
            grid-template-columns: 1fr;
          }

          .course-grid {
            grid-template-columns: 1fr;
          }

          .filters {
            flex-direction: column;
          }

          .filters select {
            width: 100%;
          }

          .admin-grid {
            grid-template-columns: 1fr;
          }

          .exam-row {
            flex-wrap: wrap;
          }

          .question-form {
            display: grid;
          }

          .mobile-dropdown {
            display: grid;
            position: absolute;
            top: 65px;
            left: 12px;
            right: 12px;
            background: white;
            border: 1px solid #e7edf4;
            box-shadow: 0 12px 30px #0002;
            border-radius: 13px;
            z-index: 30;
            padding: 8px;
          }

          .mobile-dropdown button {
            border: 0;
            background: transparent;
            display: flex;
            gap: 12px;
            align-items: center;
            padding: 13px;
            color: #475569;
            text-align: left;
          }

          .mobile-bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 67px;
            background: white;
            border-top: 1px solid #e7edf4;
            justify-content: space-around;
            z-index: 20;
            padding-bottom: env(safe-area-inset-bottom);
          }

          .mobile-bottom-nav button {
            display: grid;
            place-content: center;
            justify-items: center;
            gap: 4px;
            border: 0;
            background: transparent;
            color: #8491a5;
            font-size: 10px;
          }

          .mobile-bottom-nav button.active {
            color: #2563eb;
          }

          .modal-overlay {
            align-items: end;
            padding: 0;
          }

          .modal-card {
            width: 100%;
            max-height: 92vh;
            border-radius: 18px 18px 0 0;
            padding: 20px 16px;
          }
        }
      `}</style>
    </main>
  );
            }
