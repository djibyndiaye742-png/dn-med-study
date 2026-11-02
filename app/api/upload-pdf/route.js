import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { firebaseAdminAuth } from "@/lib/firebase-admin";


export const runtime = "nodejs";


const BUCKET = "cours-pdf";
const MAX_FILE_SIZE = 50 * 1024 * 1024;


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
const decodedToken = await firebaseAdminAuth.verifyIdToken(token);

const formData = await request.formData();
const file = formData.get("fichier");

if (!file || typeof file.arrayBuffer !== "function") {
  return NextResponse.json(
    { error: "Aucun fichier PDF reçu." },
    { status: 400 }
  );
}

if (file.type !== "application/pdf") {
  return NextResponse.json(
    { error: "Seuls les fichiers PDF sont acceptés." },
    { status: 400 }
  );
}

if (file.size > MAX_FILE_SIZE) {
  return NextResponse.json(
    { error: "Le fichier dépasse la limite de 50 Mo." },
    { status: 413 }
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  throw new Error("Configuration Supabase manquante.");
}

const supabase = createClient(supabaseUrl, secretKey);

const safeName = file.name
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9._-]/g, "_")
  .slice(-120);

const filePath = `${decodedToken.uid}/${Date.now()}_${safeName}`;

const { error: uploadError } = await supabase.storage
  .from(BUCKET)
  .upload(filePath, await file.arrayBuffer(), {
    contentType: "application/pdf",
    upsert: false,
  });

if (uploadError) {
  console.error("Supabase upload:", uploadError.message);
  return NextResponse.json(
    { error: "Échec de l'envoi du PDF." },
    { status: 500 }
  );
}

const { data, error: signedUrlError } = await supabase.storage
  .from(BUCKET)
  .createSignedUrl(filePath, 3600);

if (signedUrlError) {
  console.error("Signed URL:", signedUrlError.message);
  return NextResponse.json(
    { error: "PDF envoyé, mais lien temporaire indisponible." },
    { status: 500 }
  );
}

return NextResponse.json({
  success: true,
  path: filePath,
  bucket: BUCKET,
  signedUrl: data.signedUrl,
  fileName: file.name,
});



} catch (error) {
console.error("Upload PDF:", error.message);


return NextResponse.json(
  { error: "Impossible d'envoyer le PDF. Vérifie ta connexion." },
  { status: 500 }
);



}
}


