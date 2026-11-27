import fs from "node:fs/promises";
import path from "node:path";

const BASE =
  "https://raw.githubusercontent.com/ashemag/human-atlas/main/public";

const DEST = path.resolve("public/models");

async function get(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Téléchargement impossible : ${url}`);
  }

  return response;
}

async function main() {
  await fs.mkdir(DEST, { recursive: true });

  console.log("Téléchargement du manifeste...");

  const response = await get(`${BASE}/models/atlas.json`);
  const atlas = await response.json();

  if (
    atlas.parts?.length !== 2234 ||
    atlas.concepts?.length !== 3432 ||
    !Array.isArray(atlas.chunks)
  ) {
    throw new Error("Manifeste anatomique invalide.");
  }

  await fs.writeFile(
    path.join(DEST, "atlas.json"),
    JSON.stringify(atlas)
  );

  console.log("2 234 structures anatomiques détectées.");

  for (let i = 0; i < atlas.chunks.length; i++) {
    const chunk = atlas.chunks[i];
    const filename = path.basename(chunk.url);

    console.log(
      `Téléchargement ${i + 1}/${atlas.chunks.length} : ${filename}`
    );

    const file = await get(`${BASE}${chunk.url}`);
    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length !== chunk.bytes) {
      throw new Error(`Taille incorrecte : ${filename}`);
    }

    await fs.writeFile(
      path.join(DEST, filename),
      buffer
    );
  }

  console.log("Tous les modèles anatomiques sont téléchargés.");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
