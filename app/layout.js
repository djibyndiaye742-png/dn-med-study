import "./globals.css";

export const metadata = {
  title: "DN Med Study",
  description: "Plateforme d'études médicales",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
