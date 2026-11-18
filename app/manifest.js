export default function manifest() {
  return {
    id: "/",
    name: "DN Med Study",
    short_name: "DN Med Study",
    description:
      "Plateforme d'études médicales avec cours, QCM, résumés, flashcards et assistant IA.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F5F7FB",
    theme_color: "#10243A",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
