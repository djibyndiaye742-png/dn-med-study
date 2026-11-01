"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { BookOpen, Search, FileText } from "lucide-react";

export default function Bibliotheque() {
  const [cours, setCours] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    async function chargerCours() {
      try {
        const resultat = await getDocs(collection(db, "cours"));

        setCours(
          resultat.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );
      } catch (error) {
        console.error(error);
        setErreur("Impossible de charger les cours.");
      } finally {
        setChargement(false);
      }
    }

    chargerCours();
  }, []);

  const coursFiltres = cours.filter((c) => {
    const texte = `${c.titre || ""} ${c.matiere || ""}`.toLowerCase();
    return texte.includes(recherche.toLowerCase());
  });

  return (
    <main className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Bibliothèque universitaire</h1>
        <p className="text-gray-500 mt-2">
          La connaissance au service de la santé.
        </p>
      </div>

      <div className="flex items-center gap-3 border rounded-xl p-3">
        <Search size={20} />
        <input
          type="search"
          placeholder="Rechercher un cours ou une matière..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="w-full outline-none bg-transparent"
        />
      </div>

      {chargement && <p>Chargement des cours...</p>}

      {erreur && <p className="text-red-600">{erreur}</p>}

      {!chargement && !erreur && coursFiltres.length === 0 && (
        <div className="border rounded-xl p-8 text-center">
          <BookOpen size={40} className="mx-auto mb-3" />
          <h2 className="font-semibold">Aucun cours disponible</h2>
          <p className="text-sm text-gray-500 mt-2">
            Les cours publiés apparaîtront ici.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {coursFiltres.map((cours) => (
          <article key={cours.id} className="border rounded-xl p-4 space-y-3">
            <FileText size={25} />

            <h2 className="font-bold">{cours.titre || "Cours sans titre"}</h2>

            <p className="text-sm text-gray-500">
              {cours.universite || "Université non précisée"} ·{" "}
              {cours.niveau || "Niveau non précisé"}
            </p>

            <p className="text-sm">{cours.matiere || "Matière non précisée"}</p>

            {cours.url && (
              <a
                href={cours.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center rounded-lg bg-blue-600 text-white p-3"
              >
                Consulter le PDF
              </a>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}



