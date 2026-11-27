import fs from "node:fs/promises";
import path from "node:path";

const REPO = "https://api.github.com/repos/ashemag/human-atlas/git/trees/main?recursive=1";
const RAW = "https://raw.githubusercontent.com/ashemag/human-atlas/main/";
const DEST = path.resolve("public/models/human-atlas");

async function main() {
  await fs.mkdir(DEST, { recursive: true });

  console.log("Recherche des fichiers Human Atlas...");

  const response = await fetch(REPO);
  if (!response.ok) {
    throw new Error(`Erreur GitHub API : ${response.status}`);
  }

  const tree = await response.json();

  if (!Array.isArray(tree.tree)) {
    throw new Error("Impossible de lire l'arborescence Human Atlas.");
  }

  const files = tree.tree.filter(item =>
    item.type === "blob" &&
    (
      item.path.endsWith(".json") ||
      item.path.endsWith(".bin") ||
      item.path.endsWith(".glb") ||
      item.path.endsWith(".gltf")
    )
  );

  if (!files.length) {
    throw new Error("Aucun fichier anatomique trouvé.");
  }

  console.log(`${files.length} fichiers trouvés.`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filename = path.basename(file.path);

    console.log(`[${i + 1}/${files.length}] ${filename}`);

    const result = await fetch(RAW + file.path);

    if (!result.ok) {
      throw new Error(`Échec du téléchargement : ${file.path}`);
    }

    const buffer = Buffer.from(await result.arrayBuffer());

    if (file.size && buffer.length !== file.size) {
      throw new Error(`Fichier incomplet : ${filename}`);
    }

    await fs.writeFile(path.join(DEST, filename), buffer);
  }

  console.log("Téléchargement terminé !");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
