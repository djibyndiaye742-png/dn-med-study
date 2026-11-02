import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { firebaseAdminAuth } from "@/lib/firebase-admin";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";


const BUCKET = "cours-pdf";
const ADMIN_EMAIL = "djibyndiaye742@gmail.com";


export async function POST(request) {
try {
const authorization = request.headers.get("authorization");


if (!authorization || !authorization.startsWith("Bearer ")) {
  return NextResponse.json(
    { error: "Connexion requise." },
    { status: 401 }
  );
}

const token = authorization.substring(7);
const user = await firebaseAdminAuth.verifyIdToken(token);

if (!user.email || user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
  return NextResponse.json(
    { error: "Accès réservé à l'administrateur." },
    { status: 403 }
  );
}

const body = await request.json();
const { fileName, contentType, fileSize } = body;

if (
  typeof fileName !== "string" ||
  !fileName.trim() ||
  contentType !== "application/pdf" ||
  !Number.isFinite(fileSize) ||
  fileSize <= 0 ||
  fileSize > 50 * 1024 * 1024
) {
  return NextResponse.json(
    { error: "Fichier PDF invalide ou trop volumineux." },
    { status: 400 }
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecret) {
  throw new Error("Configuration Supabase manquante.");
}

const supabase = createClient(supabaseUrl, supabaseSecret);

const safeName = fileName
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9._-]/g, "_")
  .slice(-120);

const path = `cours/${Date.now()}_${crypto.randomUUID()}_${safeName}`;

const { data, error } = await supabase.storage
  .from(BUCKET)
  .createSignedUploadUrl(path);

if (error) {
  console.error("Supabase:", error.message);
  return NextResponse.json(
    { error: "Impossible de préparer le transfert." },
    { status: 500 }
  );
}

return NextResponse.json({
  success: true,
  path,
  token: data.token,
  bucket: BUCKET
});



} catch (error) {
console.error("API upload-pdf:", error);


return NextResponse.json(
  { error: "Erreur lors de la préparation du transfert PDF." },
  { status: 500 }
);



}
}


