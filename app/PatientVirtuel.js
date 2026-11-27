"use client";

import { useState } from "react";
import {
  Stethoscope, UserRound, Send, RotateCcw,
  ClipboardCheck, LoaderCircle, Activity
} from "lucide-react";
import { supabase } from "../lib/supabase";

const CASES = [
  {
    id: "abdomen",
    title: "Douleur abdominale",
    level: "Débutant",
    description: "Exploration d'une douleur abdominale.",
    patient: "Mamadou, 24 ans",
    complaint: "Bonjour docteur. J'ai mal au ventre depuis ce matin."
  },
  {
    id: "respiration",
    title: "Difficulté respiratoire",
    level: "Intermédiaire",
    description: "Exploration d'une dyspnée.",
    patient: "Aminata, 32 ans",
    complaint: "Docteur, j'ai du mal à respirer depuis hier soir."
  },
  {
    id: "fievre",
    title: "Fièvre et frissons",
    level: "Débutant",
    description: "Patient présentant un syndrome fébrile.",
    patient: "Ibrahima, 28 ans",
    complaint: "J'ai de la fièvre et des frissons depuis deux jours."
  },
  {
    id: "thorax",
    title: "Douleur thoracique",
    level: "Intermédiaire",
    description: "Exploration d'une douleur dans la poitrine.",
    patient: "Ousmane, 55 ans",
    complaint: "J'ai une douleur dans la poitrine depuis ce matin."
  },
  {
    id: "palpitations",
    title: "Palpitations",
    level: "Intermédiaire",
    description: "Patient présentant des palpitations.",
    patient: "Fatou, 26 ans",
    complaint: "Mon cœur bat parfois très rapidement."
  },
  {
    id: "asthme",
    title: "Crise d'asthme",
    level: "Intermédiaire",
    description: "Exploration d'une gêne respiratoire sifflante.",
    patient: "Moussa, 19 ans",
    complaint: "Je siffle quand je respire et j'ai du mal à reprendre mon souffle."
  },
  {
    id: "toux",
    title: "Toux persistante",
    level: "Débutant",
    description: "Patient consultant pour une toux prolongée.",
    patient: "Awa, 38 ans",
    complaint: "Je tousse beaucoup depuis plusieurs semaines."
  },
  {
    id: "diarrhee",
    title: "Diarrhée aiguë",
    level: "Débutant",
    description: "Exploration d'un épisode diarrhéique.",
    patient: "Cheikh, 21 ans",
    complaint: "J'ai la diarrhée depuis hier."
  },
  {
    id: "vomissements",
    title: "Vomissements",
    level: "Débutant",
    description: "Patient présentant des vomissements.",
    patient: "Mariama, 30 ans",
    complaint: "Je vomis depuis cette nuit."
  },
  {
    id: "paludisme",
    title: "Suspicion de paludisme",
    level: "Intermédiaire",
    description: "Patient présentant fièvre et céphalées.",
    patient: "Abdou, 23 ans",
    complaint: "J'ai de la fièvre, des maux de tête et des courbatures."
  },
  {
    id: "cephalees",
    title: "Céphalées",
    level: "Débutant",
    description: "Exploration de maux de tête.",
    patient: "Khadija, 27 ans",
    complaint: "J'ai très mal à la tête depuis hier."
  },
  {
    id: "convulsions",
    title: "Convulsions",
    level: "Avancé",
    description: "Exploration d'un épisode convulsif.",
    patient: "Boubacar, 22 ans",
    complaint: "On m'a amené ici après une crise avec des secousses."
  },
  {
    id: "deficit",
    title: "Déficit moteur",
    level: "Avancé",
    description: "Patient présentant une faiblesse d'un côté du corps.",
    patient: "Amadou, 64 ans",
    complaint: "Depuis ce matin, mon bras et ma jambe droits sont faibles."
  },
  {
    id: "enfant_fievre",
    title: "Fièvre chez l'enfant",
    level: "Débutant",
    description: "Consultation pédiatrique.",
    patient: "Mère de Lamine, enfant de 3 ans",
    complaint: "Docteur, mon enfant a de la fièvre depuis hier."
  },
  {
    id: "dehydration",
    title: "Déshydratation",
    level: "Intermédiaire",
    description: "Évaluation d'une possible déshydratation.",
    patient: "Seynabou, 5 ans",
    complaint: "Ma fille est très fatiguée et refuse de boire."
  },
  {
    id: "douleur_pelvienne",
    title: "Douleur pelvienne",
    level: "Intermédiaire",
    description: "Consultation gynécologique.",
    patient: "Ndeye, 25 ans",
    complaint: "J'ai mal dans le bas du ventre."
  },
  {
    id: "saignement",
    title: "Saignement gynécologique",
    level: "Avancé",
    description: "Exploration d'un saignement inhabituel.",
    patient: "Aïssatou, 29 ans",
    complaint: "J'ai des saignements alors que je ne devrais pas avoir mes règles."
  },
  {
    id: "traumatisme",
    title: "Traumatisme",
    level: "Intermédiaire",
    description: "Patient après un accident.",
    patient: "Modou, 31 ans",
    complaint: "J'ai eu un accident de moto et j'ai mal à la jambe."
  },
  {
    id: "hemorragie",
    title: "Hémorragie",
    level: "Avancé",
    description: "Évaluation d'un saignement important.",
    patient: "Ibrahima, 42 ans",
    complaint: "Je saigne beaucoup depuis une blessure."
  },
  {
    id: "syncope",
    title: "Perte de connaissance",
    level: "Avancé",
    description: "Exploration d'un malaise avec perte de connaissance.",
    patient: "Moussa, 48 ans",
    complaint: "J'ai perdu connaissance quelques instants hier."
  }
];

export default function PatientVirtuel() {
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");

  async function startCase(item) {
    setSelected(item);
    setMessages([
      { role: "assistant", content: item.complaint }
    ]);
    setReport("");
    setError("");
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!question.trim() || loading || !selected) return;

    const text = question.trim();
    const updated = [...messages, { role: "user", content: text }];

    setMessages(updated);
    setQuestion("");
    setLoading(true);
    setError("");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

      if (!token) {
        throw new Error("Session expirée. Reconnecte-toi.");
      }

      const response = await fetch("/api/patient-virtuel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          caseId: selected.id,
          patient: selected.patient,
          messages: updated
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Une erreur est survenue.");
      }

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: result.reply }
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function evaluateCase() {
    if (!selected || loading) return;

    setLoading(true);
    setError("");
    setReport("");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

      if (!token) {
        throw new Error("Reconnecte-toi pour continuer.");
      }

      const response = await fetch("/api/patient-virtuel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          caseId: selected.id,
          patient: selected.patient,
          messages,
          action: "evaluate"
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Évaluation impossible.");
      }

      setReport(result.report);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setSelected(null);
    setMessages([]);
    setReport("");
    setError("");
  }

  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <div style={styles.badge}>
          <Activity size={15} /> SIMULATION CLINIQUE
        </div>
        <h1>Patient virtuel</h1>
        <p>
          Interroge tes patients, recueille les informations
          cliniques et entraîne ton raisonnement médical.
        </p>
      </div>

      {!selected ? (
        <>
          <h2 style={styles.heading}>Choisir un cas clinique</h2>
          <div style={styles.grid}>
            {CASES.map(item => (
              <button
                key={item.id}
                onClick={() => startCase(item)}
                style={styles.card}
              >
                <div style={styles.icon}>
                  <Stethoscope size={25} />
                </div>
                <span style={styles.level}>{item.level}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <strong style={styles.start}>Commencer →</strong>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div style={styles.workspace}>
          <div style={styles.patientHeader}>
            <div style={styles.avatar}>
              <UserRound size={28} />
            </div>
            <div>
              <strong>{selected.patient}</strong>
              <p>Patient en consultation</p>
            </div>
            <button onClick={reset} style={styles.reset}>
              <RotateCcw size={16} /> Nouveau cas
            </button>
          </div>

          <div style={styles.notice}>
            Tu es le médecin. Pose tes questions comme lors
            d'une véritable consultation.
          </div>

          <div style={styles.chat}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  ...styles.message,
                  ...(msg.role === "user"
                    ? styles.userMessage
                    : styles.patientMessage)
                }}
              >
                <small>
                  {msg.role === "user" ? "TOI · MÉDECIN" : "PATIENT"}
                </small>
                <p>{msg.content}</p>
              </div>
            ))}

            {loading && (
              <div style={styles.loading}>
                <LoaderCircle className="spin" size={18} />
                Réponse en cours...
              </div>
            )}
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <form onSubmit={sendMessage} style={styles.form}>
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Pose une question au patient..."
              style={styles.input}
              disabled={loading}
            />
            <button
              type="submit"
              style={styles.send}
              disabled={loading || !question.trim()}
            >
              <Send size={19} />
            </button>
          </form>

          <button
            onClick={evaluateCase}
            disabled={loading || messages.length < 2}
            style={styles.evaluate}
          >
            <ClipboardCheck size={18} />
            Évaluer ma consultation
          </button>

          {report && (
            <div style={styles.report}>
              <h3>Évaluation de ta consultation</h3>
              <div style={{ whiteSpace: "pre-wrap" }}>{report}</div>
              <p style={styles.disclaimer}>
                Évaluation pédagogique indicative, à confronter
                aux enseignements et à la supervision clinique.
              </p>
            </div>
          )}
        </div>
      )}

      <p style={styles.footer}>
        Simulation pédagogique uniquement. Ne remplace pas
        une consultation réelle ni la supervision médicale.
      </p>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "20px",
    color: "#10243A"
  },
  hero: {
    background: "linear-gradient(120deg,#10243A,#155E75)",
    color: "white",
    padding: "35px 28px",
    borderRadius: 22,
    marginBottom: 30
  },
  badge: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#67E8F9",
    fontSize: 12,
    fontWeight: 800
  },
  heading: { fontSize: 22, marginBottom: 18 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 16
  },
  card: {
    textAlign: "left",
    padding: 22,
    borderRadius: 17,
    border: "1px solid #E2E8F0",
    background: "white",
    cursor: "pointer",
    color: "#10243A"
  },
  icon: { color: "#0891B2", marginBottom: 15 },
  level: {
    fontSize: 11,
    color: "#0891B2",
    fontWeight: 800
  },
  start: { color: "#2563EB", display: "block", marginTop: 20 },
  workspace: {
    background: "white",
    border: "1px solid #E2E8F0",
    borderRadius: 18,
    padding: 20
  },
  patientHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap"
  },
  avatar: {
    background: "#E0F2FE",
    color: "#0369A1",
    padding: 13,
    borderRadius: 50
  },
  reset: {
    marginLeft: "auto",
    padding: 10,
    border: "1px solid #CBD5E1",
    borderRadius: 9,
    background: "white"
  },
  notice: {
    background: "#ECFEFF",
    padding: 13,
    borderRadius: 10,
    margin: "20px 0",
    fontSize: 13
  },
  chat: {
    minHeight: 230,
    maxHeight: 430,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 8
  },
  message: {
    padding: 14,
    borderRadius: 13,
    maxWidth: "85%",
    lineHeight: 1.5
  },
  patientMessage: {
    background: "#F1F5F9",
    alignSelf: "flex-start"
  },
  userMessage: {
    background: "#DBEAFE",
    alignSelf: "flex-end"
  },
  form: { display: "flex", gap: 9, marginTop: 15 },
  input: {
    flex: 1,
    minWidth: 0,
    padding: 14,
    border: "1px solid #CBD5E1",
    borderRadius: 10
  },
  send: {
    background: "#0891B2",
    color: "white",
    border: 0,
    borderRadius: 10,
    padding: "0 18px"
  },
  evaluate: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    width: "100%",
    padding: 14,
    marginTop: 15,
    border: 0,
    borderRadius: 10,
    background: "#10243A",
    color: "white",
    fontWeight: 700
  },
  report: {
    marginTop: 20,
    padding: 20,
    borderRadius: 12,
    background: "#F0FDFA",
    border: "1px solid #99F6E4"
  },
  disclaimer: { fontSize: 12, color: "#64748B" },
  error: { color: "#DC2626", fontSize: 13 },
  loading: { display: "flex", gap: 8, color: "#64748B" },
  footer: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 25,
    textAlign: "center"
  }
};
