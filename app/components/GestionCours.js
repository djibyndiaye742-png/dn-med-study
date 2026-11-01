"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function GestionCours() {
  const [cours, setCours] = useState([]);
  const [form, setForm] = useState({
    titre: "",
    universite: "UCAD",
    filiere: "Médecine",
    niveau: "2e année",
    matiere: "",
    url: ""
  });
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState("");

  async function chargerCours() {
    const resultat = await getDocs(collection(db, "cours"));
    setCours(resultat.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  useEffect(() => {
    chargerCours();
  }, []);

  function modifier(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function ajouterCours(e) {
    e.preventDefault();
    setChargement(true);
    setMessage("");

    try {
      if (!form.url.startsWith("https://")) {
        throw new Error("Le lien PDF doit commencer par https://");
      }

      await addDoc(collection(db, "cours"), {
        ...form,
        dateAjout: serverTimestamp()
      });

      setMessage("Cours ajouté avec succès !");
      setForm({
        titre: "",
        universite: "UCAD",
        filiere: "Médecine",
        niveau: "2e année",
        matiere: "",
        url: ""
      });

      await chargerCours();
    } catch (erreur) {
      setMessage("Erreur : " + erreur.message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Bibliothèque de cours</h2>

      <form onSubmit={ajouterCours} style={{ display: "grid", gap: 12 }}>
        <input name="titre" placeholder="Titre du cours" value={form.titre}
          onChange={modifier} required />

        <select name="universite" value={form.universite} onChange={modifier}>
          {["UCAD", "UGB", "UASZ", "UADB", "Autre"].map(x =>
            <option key={x}>{x}</option>
          )}
        </select>

        <select name="filiere" value={form.filiere} onChange={modifier}>
          {["Médecine", "Pharmacie", "Odontologie"].map(x =>
            <option key={x}>{x}</option>
          )}
        </select>

        <input name="niveau" placeholder="Niveau" value={form.niveau}
          onChange={modifier} required />

        <input name="matiere" placeholder="Matière" value={form.matiere}
          onChange={modifier} required />

        <input name="url" placeholder="Lien du PDF (https://...)" value={form.url}
          onChange={modifier} required />

        <button disabled={chargement}>
          {chargement ? "Enregistrement..." : "Ajouter le cours"}
        </button>
      </form>

      {message && <p>{message}</p>}

      <h3>Les cours disponibles ({cours.length})</h3>

      {cours.map(c => (
        <div key={c.id} style={{ padding: 12, borderBottom: "1px solid #ddd" }}>
          <strong>{c.titre}</strong>
          <p>{c.universite} · {c.filiere} · {c.niveau}</p>
          <p>{c.matiere}</p>
          <a href={c.url} target="_blank" rel="noreferrer">
            Consulter le PDF
          </a>
        </div>
      ))}
    </div>
  );
  }
