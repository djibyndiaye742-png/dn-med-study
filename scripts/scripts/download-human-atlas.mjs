import fs from "node:fs/promises";
import path from "node:path";

const BASE =
  "https://raw.githubusercontent.com/ashemag/human-atlas/main";

const OUTPUT = "public/models/human-atlas";

async function download(url, destination, expectedBytes = null) {
  console.log("Téléchargement :", url);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erreur ${response.status} : ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (expectedBytes !== null && buffer.length !== expectedBytes) {
    throw new Error(
      `Taille incorrecte pour ${destination}: ${buffer.length} au lieu de ${expectedBytes} octets`
    );
  }

  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, buffer);

  console.log("OK :", destination, `${buffer.length} octets`);

  return buffer;
}

async function main() {
  await fs.mkdir(OUTPUT, { recursive: true });

  // 1. Récupérer le catalogue anatomique.
  const atlasUrl = `${BASE}/public/models/atlas.json`;
  const atlasPath = path.join(OUTPUT, "atlas.json");

  const atlasBuffer = await download(atlasUrl, atlasPath);
  const atlas = JSON.parse(atlasBuffer.toString("utf8"));

  if (!Array.isArray(atlas.parts) || !Array.isArray(atlas.chunks)) {
    throw new Error("Format du catalogue anatomique inattendu.");
  }

  console.log("Structures :", atlas.parts.length);
  console.log("Concepts :", atlas.concepts?.length ?? "inconnu");
  console.log("Fichiers 3D :", atlas.chunks.length);

  if (atlas.parts.length !== 2234) {
    throw new Error("Le catalogue ne contient pas les 2234 structures attendues.");
  }

  // 2. Télécharger toutes les géométries indiquées par le catalogue.
  for (let i = 0; i < atlas.chunks.length; i += 3) {
    const batch = atlas.chunks.slice(i, i + 3);

    await Promise.all(
      batch.map(async (chunk) => {
        const filename = path.basename(
          new URL(chunk.url, "https://example.com").pathname
        );

        const remoteUrl = `${BASE}/public/models/${filename}`;
        const localPath = path.join(OUTPUT, filename);

        await download(remoteUrl, localPath, chunk.bytes);

        // Adapter les chemins pour DN Med Study.
        chunk.url = `/models/human-atlas/${filename}`;
      })
    );
  }

  // 3. Enregistrer le catalogue avec les nouveaux chemins.
  await fs.writeFile(
    atlasPath,
    JSON.stringify(atlas)
  );

  // 4. Récupérer les crédits et licences.
  await download(
    `${BASE}/public/ATTRIBUTION.md`,
    path.join(OUTPUT, "ATTRIBUTION.md")
  );

  console.log("--------------------------------");
  console.log("TÉLÉCHARGEMENT TERMINÉ");
  console.log("Structures :", atlas.parts.length);
  console.log("Concepts :", atlas.concepts?.length);
  console.log("Fichiers 3D :", atlas.chunks.length);
  console.log("Dossier :", OUTPUT);
  console.log("--------------------------------");
}

main().catch((error) => {
  console.error("ÉCHEC :", error);
  process.exit(1);
});
