
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Configuration Supabase manquante dans Vercel.");
}

if (!/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/.test(supabaseUrl)) {
  throw new Error("L'adresse Supabase est incorrecte.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
