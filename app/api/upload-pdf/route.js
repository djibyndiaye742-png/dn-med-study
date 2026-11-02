import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { firebaseAdminAuth } from "@/lib/firebase-admin";


export const runtime = "nodejs";


const BUCKET = "cours-pdf";
const ADMIN_EMAIL = "djibyndiaye@gmail.com";


export async function POST(request) {
try {
const authorization = request.headers.get("authorization");


if (!authorization?.startsWith("Bearer ")) {
  return NextResponse.json(
    { error: "Authentification requise." },
    { status: 401 }
  );
}

const token = authorization.slice(7);
const decoded = await firebaseAdminAuth.verifyIdToken(token);

if (
  !decoded.email ||
  decoded.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
) {
  return NextResponse.json(
    { error: "Seul l'administrateur peut envoyer des PDF." },
    { status: 403 }
  );
}

const { fileName, contentType, fileSize } = await request.json();

if (
  !fileName ||
  contentType !== "application/pdf" ||
  !Number.isFinite(fileSize) ||
  fileSize <= 0 ||
  fileSize > 50 * 1024 * 1024
) {
  return NextResponse.json(
    { error: "Fichier PDF invalide ou supérieur à 50 Mo." },
    { status: 400 }
  );
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

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
  console.error("Supabase upload authorization:", error.message);
  return NextResponse.json(
    { error: "Impossible de préparer l'envoi du PDF." },
    { status: 500 }
  );
}

return NextResponse.json({
  success: true,
  path,
  token: data.token,
  bucket: BUCKET,
});



} catch (error) {
console.error("Upload authorization:", error.message);


return NextResponse.json(
  { error: "Erreur lors de la préparation de l'envoi." },
  { status: 500 }
);



}
}


