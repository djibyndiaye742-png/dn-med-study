
"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Connexion() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      window.location.href = "/";
    }

    setLoading(false);
  }

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#f1f5f9",
      padding: 20,
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{
        background: "white",
        padding: 35,
        borderRadius: 18,
        width: "100%",
        maxWidth: 420,
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
      }}>
        <h1 style={{ color: "#123b70", textAlign: "center" }}>
          DN Med Study
        </h1>

        <h2 style={{ textAlign: "center" }}>
          Connexion étudiant
        </h2>

        <p style={{ textAlign: "center", color: "#64748b" }}>
          Accède à ton espace d’apprentissage médical.
        </p>

        <form onSubmit={handleLogin}>
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

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        {message && (
          <p style={{ color: "#dc2626", textAlign: "center" }}>
            {message}
          </p>
        )}
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  padding: 13,
  margin: "9px 0 20px",
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  fontSize: 15
};

const buttonStyle = {
  width: "100%",
  padding: 14,
  background: "#174b86",
  color: "white",
  border: "none",
  borderRadius: 9,
  fontSize: 16,
  fontWeight: "bold",
  cursor: "pointer"
};

