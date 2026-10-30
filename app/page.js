import Link from "next/link";

export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#f4f7fb",
      fontFamily: "Arial, sans-serif",
      color: "#142b45"
    }}>
      <header style={{
        padding: "22px 7%",
        background: "#ffffff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #e5eaf0"
      }}>
        <h2>🩺 DN Med Study</h2>
        <span>La médecine autrement</span>
      </header>

      <section style={{
        padding: "90px 8%",
        textAlign: "center"
      }}>
        <h1 style={{fontSize: "clamp(36px, 6vw, 64px)"}}>
          Révise plus intelligemment.
        </h1>

        <p style={{
          fontSize: "19px",
          maxWidth: "650px",
          margin: "20px auto",
          lineHeight: 1.7
        }}>
          Ton espace intelligent pour comprendre tes cours,
          créer des fiches et t'entraîner avec des QCM médicaux.
        </p>

        <Link href="/connexion" style={{
          display: "inline-block",
          background: "#1769aa",
          color: "white",
          padding: "15px 28px",
          borderRadius: "10px",
          textDecoration: "none",
          fontWeight: "bold"
        }}>
          Commencer
        </Link>
      </section>
    </main>
  );
}
