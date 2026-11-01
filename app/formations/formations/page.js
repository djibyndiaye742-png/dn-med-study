"use client";

import { useState } from "react";

const filieres = [
  {
    nom: "Médecine générale",
    icon: "🩺",
    niveaux: 7,
    description: "Sciences médicales, diagnostic et prise en charge."
  },
  {
    nom: "Odontologie",
    icon: "🦷",
    niveaux: 6,
    description: "Santé bucco-dentaire et chirurgie dentaire."
  },
  {
    nom: "Pharmacie",
    icon: "💊",
    niveaux: 6,
    description: "Médicaments, pharmacologie et sciences pharmaceutiques."
  }
];

const universites = [
  "UCAD - Dakar",
  "UGB - Saint-Louis",
  "UASZ - Ziguinchor",
  "UADB - Bambey",
  "Autres établissements"
];

export default function Formations() {
  const [universite, setUniversite] = useState("");
  const [filiere, setFiliere] = useState(null);
  const [niveau, setNiveau] = useState("");

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f4f7f6",
      padding: "30px 16px",
      fontFamily: "Arial"
    }}>
      <div style={{maxWidth: "950px", margin: "auto"}}>

        <h1 style={{color: "#087b55"}}>
          DN Med Study 🇸🇳
        </h1>

        <p>La connaissance au service de la santé.</p>

        <h2>Catalogue des formations</h2>

        <label>Choisir une université</label>

        <select
          value={universite}
          onChange={e => setUniversite(e.target.value)}
          style={styles.select}
        >
          <option value="">Sélectionner une université</option>
          {universites.map(u => (
            <option key={u}>{u}</option>
          ))}
        </select>

        <h2>Choisir une filière</h2>

        <div style={styles.grid}>
          {filieres.map(f => (
            <button
              key={f.nom}
              onClick={() => {
                setFiliere(f);
                setNiveau("");
              }}
              style={{
                ...styles.card,
                border: filiere?.nom === f.nom
                  ? "2px solid #087b55"
                  : "1px solid #ddd"
              }}
            >
              <div style={{fontSize: "35px"}}>{f.icon}</div>
              <h3>{f.nom}</h3>
              <p>{f.description}</p>
            </button>
          ))}
        </div>

        {filiere && (
          <>
            <h2>Niveaux d'études</h2>

            <div style={styles.grid}>
              {Array.from(
                {length: filiere.niveaux},
                (_, i) => `${i + 1}e année`
              ).map(n => (
                <button
                  key={n}
                  onClick={() => setNiveau(n)}
                  style={{
                    ...styles.card,
                    background: niveau === n ? "#087b55" : "white",
                    color: niveau === n ? "white" : "#222"
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </>
        )}

        {niveau && (
          <div style={styles.result}>
            <h2>Votre espace pédagogique</h2>
            <p>Université : {universite || "À sélectionner"}</p>
            <p>Filière : {filiere.nom}</p>
            <p>Niveau : {niveau}</p>
            <p>Les cours, examens et QCM seront intégrés dans cet espace.</p>
          </div>
        )}

      </div>
    </main>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "15px",
    margin: "20px 0"
  },
  card: {
    padding: "20px",
    borderRadius: "14px",
    background: "white",
    cursor: "pointer",
    textAlign: "left"
  },
  select: {
    display: "block",
    width: "100%",
    padding: "14px",
    margin: "12px 0 25px",
    borderRadius: "10px"
  },
  result: {
    background: "#e0f3e9",
    padding: "20px",
    borderRadius: "14px",
    marginTop: "25px"
  }
};
