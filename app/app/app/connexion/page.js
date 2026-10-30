
"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../../../../lib/firebase";

export default function Connexion() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inscription, setInscription] = useState(false);
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);

  async function gererCompte(e) {
    e.preventDefault();
    setChargement(true);
    setMessage("");

    try {
      if (inscription) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      window.location.href = "/";
    } catch (error) {
      setMessage(error.message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f2f6fb",
      display: "grid",
      placeItems: "center",
      fontFamily: "Arial",
      padding: 20
    }}>
      <form onSubmit={gererCompte} style={{
        background: "white",
        padding: 30,
        borderRadius: 16,
        width: "100%",
        maxWidth: 400,
        boxSizing: "border-box"
      }}>
        <h1 style={{ color: "#1769aa" }}>DN Med Study</h1>
        <h2>{inscription ? "Créer un compte" : "Connexion"}</h2>

        <label>Adresse e-mail</label>
        <input type="email" required value={email}
          onChange={e => setEmail(e.target.value)} style={styleInput} />

        <label>Mot de passe</label>
        <input type="password" required minLength={6}
          value={password}
          onChange={e => setPassword(e.target.value)} style={styleInput} />

        <button type="submit" disabled={chargement} style={styleButton}>
          {chargement ? "Patiente..." : inscription ? "Créer mon compte" : "Se connecter"}
        </button>

        <p>{message}</p>

        <button type="button" onClick={() => {
          setInscription(!inscription);
          setMessage("");
        }} style={{
          background: "none",
          border: "none",
          color: "#1769aa",
          cursor: "pointer"
        }}>
          {inscription ? "J'ai déjà un compte" : "Créer un compte étudiant"}
        </button>
      </form>
    </main>
  );
}

const styleInput = {
  display: "block",
  width: "100%",
  padding: 12,
  margin: "8px 0 18px",
  border: "1px solid #ccd5df",
  borderRadius: 8,
  boxSizing: "border-box"
};

const styleButton = {
  width: "100%",
  padding: 14,
  background: "#1769aa",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer"
};
