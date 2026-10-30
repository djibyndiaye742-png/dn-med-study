"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

export default function Connexion() {
  const [inscription, setInscription] = useState(true);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);

  async function gererCompte(e) {
    e.preventDefault();
    setMessage("");
    setChargement(true);

    try {
      if (inscription) {
        if (password !== confirmation) {
          throw new Error("Les mots de passe ne correspondent pas.");
        }

        if (password.length < 6) {
          throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
        }

        const resultat = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        const nomComplet = `${prenom.trim()} ${nom.trim()}`;

        await updateProfile(resultat.user, {
          displayName: nomComplet
        });

        await setDoc(doc(db, "users", resultat.user.uid), {
          uid: resultat.user.uid,
          nom: nom.trim(),
          prenom: prenom.trim(),
          nomComplet,
          email: email.trim(),
          createdAt: serverTimestamp()
        });

      } else {
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      }

      window.location.href = "/";
    } catch (error) {
      console.error("Erreur DN Med Study :", error);

      const erreurs = {
        "auth/email-already-in-use": "Cette adresse e-mail est déjà utilisée.",
        "auth/invalid-email": "Adresse e-mail invalide.",
        "auth/invalid-credential": "E-mail ou mot de passe incorrect.",
        "auth/weak-password": "Mot de passe trop faible.",
        "auth/network-request-failed": "Vérifiez votre connexion Internet.",
        "permission-denied": "Firebase refuse l'enregistrement du profil. Vérifiez les règles Firestore.",
        "auth/operation-not-allowed": "Activez la connexion par e-mail dans Firebase."
      };

      setMessage(
        erreurs[error.code] ||
        error.message ||
        "Une erreur inconnue est survenue."
      );
    } finally {
      setChargement(false);
    }
  }

  return (
    <main style={page}>
      <form onSubmit={gererCompte} style={form}>
        <h1 style={{ color: "#0f766e", textAlign: "center" }}>
          DN Med Study
        </h1>

        <h2 style={{ textAlign: "center" }}>
          {inscription ? "Créer un compte étudiant" : "Connexion"}
        </h2>

        {inscription && (
          <>
            <input required placeholder="Prénom"
              value={prenom}
              onChange={e => setPrenom(e.target.value)}
              style={input} />

            <input required placeholder="Nom"
              value={nom}
              onChange={e => setNom(e.target.value)}
              style={input} />
          </>
        )}

        <input required type="email" placeholder="Adresse e-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={input} />

        <input required type="password" placeholder="Mot de passe"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={input} />

        {inscription && (
          <input required type="password" placeholder="Confirmer le mot de passe"
            value={confirmation}
            onChange={e => setConfirmation(e.target.value)}
            style={input} />
        )}

        {message && (
          <p style={{ color: "#dc2626", fontSize: 14 }}>
            {message}
          </p>
        )}

        <button disabled={chargement} type="submit" style={button}>
          {chargement ? "Patientez..." :
            inscription ? "Créer mon compte" : "Se connecter"}
        </button>

        <p style={{ textAlign: "center" }}>
          {inscription ? "Déjà inscrit ?" : "Pas encore de compte ?"}
          {" "}
          <button type="button"
            onClick={() => {
              setInscription(!inscription);
              setMessage("");
            }}
            style={switchButton}>
            {inscription ? "Se connecter" : "S'inscrire"}
          </button>
        </p>
      </form>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
  background: "#f1f5f9"
};

const form = {
  width: "100%",
  maxWidth: 420,
  background: "white",
  padding: 28,
  borderRadius: 16
};

const input = {
  width: "100%",
  padding: 13,
  marginTop: 12,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontSize: 15
};

const button = {
  width: "100%",
  padding: 14,
  marginTop: 20,
  background: "#0f766e",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontWeight: "bold"
};

const switchButton = {
  border: "none",
  background: "none",
  color: "#0f766e",
  fontWeight: "bold"
};
