
"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../../lib/firebase";

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
        const result = await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

        await updateProfile(result.user, {
          displayName: `${prenom.trim()} ${nom.trim()}`,
        });

        window.location.href = "/";
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        window.location.href = "/";
      }
    } catch (error) {
      const errors = {
        "auth/email-already-in-use": "Cette adresse e-mail possède déjà un compte.",
        "auth/invalid-email": "Adresse e-mail invalide.",
        "auth/weak-password": "Le mot de passe est trop faible.",
        "auth/invalid-credential": "E-mail ou mot de passe incorrect.",
        "auth/user-not-found": "Aucun compte trouvé avec cette adresse.",
        "auth/wrong-password": "Mot de passe incorrect.",
        "auth/too-many-requests": "Trop de tentatives. Réessayez plus tard.",
        "auth/network-request-failed": "Problème de connexion Internet.",
      };

      setMessage(
        errors[error.code] || "Une erreur est survenue. Réessayez."
      );
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
        <h1 style={{ textAlign: "center", color: "#123b70" }}>
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
              <input style={field} value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Votre nom" required />

              <label>Prénom</label>
              <input style={field} value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Votre prénom" required />
            </>
          )}

          <label>Adresse e-mail</label>
          <input style={field} type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="exemple@email.com" required />

          <label>Mot de passe</label>
          <input style={field} type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8 caractères minimum" required />

          {mode === "signup" && (
            <>
              <label>Confirmer le mot de passe</label>
              <input style={field} type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez votre mot de passe" required />
            </>
          )}

          {message && (
            <p style={{
              padding: "12px",
              borderRadius: "8px",
              background: success ? "#ecfdf3" : "#fef2f2",
              color: success ? "#067647" : "#b42318",
              fontSize: "14px",
            }}>
              {message}
            </p>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%",
            padding: "14px",
            border: "none",
            borderRadius: "9px",
            background: "#174b86",
            color: "white",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}>
            {loading ? "Veuillez patienter..." :
              mode === "signup" ? "Créer mon compte" : "Se connecter"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "22px" }}>
          {mode === "signup" ? "Déjà inscrit ?" : "Pas encore de compte ?"}{" "}
          <button type="button" onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setMessage("");
            setSuccess(false);
          }} style={{
            border: "none",
            background: "none",
            color: "#174b86",
            fontWeight: "bold",
            cursor: "pointer",
          }}>
            {mode === "signup" ? "Se connecter" : "Créer un compte"}
          </button>
        </p>
      </section>
    </main>
  );
}
