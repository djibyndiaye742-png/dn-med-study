"use client";

import { useState } from "react";

export default function Connexion() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#f1f5f9",
      padding: "20px",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{
        background: "white",
        padding: "35px",
        borderRadius: "18px",
        width: "100%",
        maxWidth: "420px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
      }}>
        <h1 style={{ color: "#123b70", textAlign: "center" }}>
          DN Med Study
        </h1>

        <h2 style={{ textAlign: "center", color: "#172033" }}>
          Connexion étudiant
        </h2>

        <p style={{ textAlign: "center", color: "#64748b" }}>
          Accède à ton espace d’apprentissage médical.
        </p>

        <form onSubmit={(e) => e.preventDefault()}>
          <label>Adresse e-mail</label>
          <input
            type="email"
            placeholder="exemple@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />

          <label>Mot de passe</label>
          <input
            type="password"
            placeholder="Ton mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />

          <button type="submit" style={buttonStyle}>
            Se connecter
          </button>
        </form>

        <p style={{ textAlign: "center", color: "#64748b", marginTop: "22px" }}>
          Pas encore de compte ? Inscription bientôt disponible.
        </p>
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  padding: "13px",
  margin: "9px 0 20px",
  border: "1px solid #cbd5e1",
  borderRadius: "9px",
  fontSize: "15px"
};

const buttonStyle = {
  width: "100%",
  padding: "14px",
  background: "#174b86",
  color: "white",
  border: "none",
  borderRadius: "9px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer"
};
