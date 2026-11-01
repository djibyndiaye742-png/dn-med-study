"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { BookOpen, Search, FileText } from "lucide-react";

export default function Bibliotheque() {
  const [cours, setCours] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [universite, setUniversite] = useState("Toutes");
  const [niveau, setNiveau] = useState("Tous");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function chargerCours() {
      try {
        const resultat = await getDocs(
          collection(db, "cours")
        );

        setCours(
          resultat.docs.map(document => ({
            id: document.id,
            ...document.data()
          }))
        );
      } catch (error) {
        console.error("Erreur de chargement :", error);
      } finally {
        setChargement(false);
      }
    }

    chargerCours();
  }, []);

  const coursFiltres = cours.filter(c => {
    const correspondRecherche =
      (c.titre || "").toLowerCase().includes(recherche.toLowerCase()) ||
      (c.matiere || "").toLowerCase().includes(recherche.toLowerCase());

    const correspondUniversite =
      universite === "Toutes" || c.universite === universite;

    const correspondNiveau =
      niveau === "Tous" || c.niveau === niveau;

    return correspondRecherche &&
      correspondUniversite &&
      correspondNiveau;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Bibliothèque universitaire
        </h1>
        <p className="text-gray-500">
          Retrouve tes cours et documents médicaux.
        </p>
      </div>

      <div className="flex items-center gap-2 border rounded-xl p-3">
        <Search size={20} />
        <input
          className="w-full outline-none bg-transparent"
          placeholder="Rechercher un cours ou une matière..."
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          className="border rounded-xl p-3"
          value={universite}
          onChange={e => setUniversite(e.target.value)}
        >
          <option value="Toutes">Toutes les universités</option>
          <option value="UCAD">UCAD</option>
          <option value="UGB">UGB</option>
          <option value="UASZ">UASZ</option>
          <option value="UADB">UADB</option>
        </select>

        <select
          className="border rounded-xl p-3"
          value={niveau}
          onChange={e => setNiveau(e.target.value)}
        >
          <option value="Tous">Tous les niveaux</option>
          <option value="1ère année">1ère année</option>
          <option value="2ème année">2ème année</option>
          <option value="3ème année">3ème année</option>
          <option value="4ème année">4ème année</option>
          <option value="5ème année">5ème année</option>
        </select>
      </div>

      {chargement ? (
        <p>Chargement des cours...</p>
      ) : coursFiltres.length === 0 ? (
        <div className="text-center border rounded-xl p-8">
          <BookOpen size={35} className="mx-auto mb-3" />
          <p className="font-semibold">Aucun cours disponible</p>
          <p className="text-sm text-gray-500">
            Les documents apparaîtront ici dès leur publication.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {coursFiltres.map(c => (
            <div
              key={c.id}
              className="border rounded-xl p-4 space-y-3"
            >
              <FileText size={25} />

              <h3 className="font-bold">{c.titre}</h3>

              <p className="text-sm text-gray-500">
                {c.universite} · {c.niveau}
              </p>

              <p className="text-sm">{c.matiere}</p>

              {c.url && (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center bg-blue-600 text-white rounded-lg p-3"
                >
                  Consulter le PDF
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
    }
