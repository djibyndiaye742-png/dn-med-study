import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://dn-med-study.vercel.app"),

  title: {
    default: "DN Med Study – Plateforme d'études médicales",
    template: "%s | DN Med Study",
  },

  description:
    "DN Med Study accompagne les étudiants en médecine avec l'intelligence artificielle : résumés de cours, QCM corrigés, flashcards et assistant pédagogique.",

  keywords: [
    "DN Med Study",
    "études médicales",
    "étudiant en médecine",
    "QCM médecine",
    "résumé de cours médicaux",
    "flashcards médecine",
    "intelligence artificielle médecine",
  ],

  applicationName: "DN Med Study",

  robots: {
    index: true,
    follow: true,
  },

  openGraph: {
    title: "DN Med Study – Réussir ses études médicales",
    description:
      "Révise plus efficacement grâce aux résumés, QCM, flashcards et à l'assistant IA.",
    url: "https://dn-med-study.vercel.app",
    siteName: "DN Med Study",
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
