
"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Connexion() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Compte créé. Vérifie ta boîte e-mail pour confirmer ton adresse.");
      return;
    }

    window.location.href = "/";
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f1f5f9", padding: 20, fontFamily: "Arial" }}>
      <div style={{ background: "white", padding: 30, borderRadius: 18, width: "100%", maxWidth: 420 }}>
        <h1 style={{ color: "#123b70", textAlign: "center" }}>DN Med Study</h1>
        <h2 style={{ textAlign: "center" }}>
          {mode === "login" ? "Connexion étudiant" : "Créer un compte"}
        </h2>

        <form onSubmit={handleSubmit}>
          <label>Adresse e-mail</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="exemple@email.com" style={inputStyle} />

          <label>Mot de passe</label>
          <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="6 caractères minimum" style={inputStyle} />

          <button disabled={loading} style={buttonStyle}>
            {loading ? "Patiente..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        {message && <p style={{ textAlign: "center", color: "#b42318" }}>{message}</p>}

        <p style={{ textAlign: "center", marginTop: 20 }}>
          {mode === "login" ? "Pas encore de compte ?" : "Déjà inscrit ?"}
          {" "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }} style={{ border: 0, background: "none", color: "#174b86", fontWeight: "bold" }}>
            {mode === "login" ? "Créer un compte" : "Se connecter"}
          </button>
        </p>
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
  border: 0,
  borderRadius: 9,
  fontSize: 16,
  fontWeight: "bold"
};

