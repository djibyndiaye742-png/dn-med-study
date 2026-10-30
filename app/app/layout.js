export const metadata = {
  title: "DN Med Study",
  description: "La plateforme intelligente de révision médicale."
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
