"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Connexion() {
  const router = useRouter();

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
      const adresse = email.trim().toLowerCase();

      if (inscription) {
        if (password !== confirmation) {
          throw new Error("Les mots de passe ne correspondent pas.");
        }

        if (password.length < 6) {
          throw new Error(
            "Le mot de passe doit contenir au moins 6 caractères."
          );
        }

        const nomComplet = `${prenom.trim()} ${nom.trim()}`.trim();

        const { data, error } = await supabase.auth.signUp({
          email: adresse,
          password,
          options: {
            data: {
              nom: nom.trim(),
              prenom: prenom.trim(),
              nomComplet,
            },
          },
        });

        if (error) throw error;

        if (!data.user) {
          throw new Error("Impossible de créer le compte.");
        }

        if (!data.session) {
          setMessage(
            "Compte créé. Vérifie ta boîte e-mail pour confirmer ton adresse avant de te connecter."
          );
          setInscription(false);
          setChargement(false);
          return;
        }

        const { error: profileError } = await supabase
          .from("users")
          .upsert(
            {
              id: data.user.id,
              uid: data.user.id,
              nom: nom.trim(),
              prenom: prenom.trim(),
              nomComplet,
              email: adresse,
            },
            { onConflict: "id" }
          );

        if (profileError) {
          console.error("Erreur profil :", profileError);
          throw new Error(
            "Compte créé, mais le profil n'a pas pu être enregistré. Vérifie la table users et ses politiques RLS."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: adresse,
          password,
        });

        if (error) throw error;
      }

      router.replace("/");
      router.refresh();

    } catch (error) {
      console.error("Erreur DN Med Study :", error);

      const erreurs = {
        "Invalid login credentials":
          "E-mail ou mot de passe incorrect.",
        "Email not confirmed":
          "Confirme ton adresse e-mail avant de te connecter.",
        "User already registered":
          "Cette adresse e-mail possède déjà un compte.",
        "Password should be at least 6 characters":
          "Le mot de passe doit contenir au moins 6 caractères.",
      };

      setMessage(
        erreurs[error.message] ||
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
            <input
              required
              placeholder="Prénom"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              style={input}
            />

            <input
              required
              placeholder="Nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              style={input}
            />
          </>
        )}

        <input
          required
          type="email"
          placeholder="Adresse e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={input}
        />

        <input
          required
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={input}
        />

        {inscription && (
          <input
            required
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            style={input}
          />
        )}

        {message && (
          <p style={{ color: "#dc2626", fontSize: 14 }}>
            {message}
          </p>
        )}

        <button
          disabled={chargement}
          type="submit"
          style={button}
        >
          {chargement
            ? "Patientez..."
            : inscription
            ? "Créer mon compte"
            : "Se connecter"}
        </button>

        <p style={{ textAlign: "center" }}>
          {inscription
            ? "Déjà inscrit ?"
            : "Pas encore de compte ?"}{" "}

          <button
            type="button"
            onClick={() => {
              setInscription(!inscription);
              setMessage("");
            }}
            style={switchButton}
          >
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
  background: "#f1f5f9",
};

const form = {
  width: "100%",
  maxWidth: 420,
  background: "white",
  padding: 28,
  borderRadius: 16,
};

const input = {
  width: "100%",
  padding: 13,
  marginTop: 12,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontSize: 15,
};

const button = {
  width: "100%",
  padding: 14,
  marginTop: 20,
  background: "#0f766e",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontWeight: "bold",
};

const switchButton = {
  border: "none",
  background: "none",
  color: "#0f766e",
  fontWeight: "bold",
};
