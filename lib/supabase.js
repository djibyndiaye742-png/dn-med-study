import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

// Vérification des variables d'environnement
if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL est manquante.");
}

if (!supabaseKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY est manquante.");
}

// Nettoyage de l'URL
const cleanUrl = supabaseUrl.replace(/\/+$/, "");

let parsedUrl;

try {
  parsedUrl = new URL(cleanUrl);
} catch {
  throw new Error("L'URL Supabase est invalide.");
}

// Vérification du format de l'URL
if (
  parsedUrl.protocol !== "https:" ||
  !parsedUrl.hostname.endsWith(".supabase.co") ||
  parsedUrl.pathname !== "" ||
  parsedUrl.search !== "" ||
  parsedUrl.hash !== ""
) {
  throw new Error(
    "URL Supabase incorrecte. Utilise uniquement https://ton-projet.supabase.co"
  );
}

// Création du client Supabase
export const supabase = createClient(
  cleanUrl,
  supabaseKey
);
