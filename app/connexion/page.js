
"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Connexion() {
  const [mode, setMode] = useState("signup");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setSuccess(false);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setMessage("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (mode === "signup") {
      if (!nom.trim() || !prenom.trim()) {
        setMessage("Veuillez renseigner votre nom et prénom.");
        return;
      }

      if (password.length < 8) {
        setMessage("Le mot de passe doit contenir au moins 8 caractères.");
        return;
      }

      if (password !== confirmPassword) {
        setMessage("Les mots de passe ne correspondent pas.");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              nom: nom.trim(),
              prenom: prenom.trim(),
            },
            emailRedirectTo: `${window.location.origin}/connexion`,
          },
        });

        if (error) throw error;

        if (data.session) {
          window.location.href = "/";
          return;
        }

        setSuccess(true);
        setMessage(
          "Inscription enregistrée. Consultez votre boîte e-mail pour confirmer votre adresse."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) throw error;

        window.location.href = "/";
        return;
      }
    } catch (error) {
      setMessage(error.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  const field = {
    width: "100%",
    padding: "13px",
    marginTop: "7px",
    marginBottom: "16px",
    border: "1px solid #d1d5db",
    borderRadius: "9px",
    fontSize: "15px",
    boxSizing: "border-box",
  };

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "20px",
      background: "#f1f5f9",
      fontFamily: "Arial, sans-serif",
    }}>
      <section style={{
        background: "white",
        padding: "30px",
        borderRadius: "18px",
        width: "100%",
        maxWidth: "430px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.07)",
      }}>
        <h1 style={{
          textAlign: "center",
          color: "#123b70",
          marginBottom: "8px",
        }}>
          DN Med Study
        </h1>

        <p style={{
          textAlign: "center",
          color: "#64748b",
          marginBottom: "25px",
        }}>
          Votre espace d'apprentissage médical
        </p>

        <h2 style={{ textAlign: "center", color: "#172554" }}>
          {mode === "signup" ? "Créer un compte étudiant" : "Connexion"}
        </h2>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <>
              <label>Nom</label>
              <input
                style={field}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Votre nom"
                required
              />

              <label>Prénom</label>
              <input
                style={field}
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Votre prénom"
                required
              />
            </>
          )}

          <label>Adresse e-mail</label>
          <input
            style={field}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="exemple@email.com"
            autoComplete="email"
            required
          />

          <label>Mot de passe</label>
          <input
            style={field}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8 caractères minimum"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
          />

          {mode === "signup" && (
            <>
              <label>Confirmer le mot de passe</label>
              <input
                style={field}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez votre mot de passe"
                autoComplete="new-password"
                required
              />
            </>
          )}

          {message && (
            <p style={{
              padding: "12px",
              borderRadius: "8px",
              background: success ? "#ecfdf3" : "#fef2f2",
              color: success ? "#067647" : "#b42318",
              fontSize: "14px",
              lineHeight: "1.5",
            }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "9px",
              background: loading ? "#64748b" : "#174b86",
              color: "white",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading
              ? "Veuillez patienter..."
              : mode === "signup"
                ? "Créer mon compte"
                : "Se connecter"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "22px" }}>
          {mode === "signup" ? "Déjà inscrit ?" : "Pas encore de compte ?"}
          {" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setMessage("");
              setSuccess(false);
            }}
            style={{
              border: "none",
              background: "none",
              color: "#174b86",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {mode === "signup" ? "Se connecter" : "Créer un compte"}
          </button>
        </p>
      </section>
    </main>
  );
}
