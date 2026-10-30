
"use client";

import { useState } from "react";

const features = [
  {
    icon: "📚",
    title: "Cours de médecine",
    description: "Retrouve tes cours et supports pédagogiques."
  },
  {
    icon: "📝",
    title: "QCM interactifs",
    description: "Entraîne-toi et teste tes connaissances."
  },
  {
    icon: "🧠",
    title: "Fiches de révision",
    description: "Révise les notions essentielles rapidement."
  },
  {
    icon: "📂",
    title: "Bibliothèque PDF",
    description: "Centralise tes documents médicaux."
  }
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f5f7fb",
      color: "#14233d",
      fontFamily: "Arial, sans-serif"
    }}>
      <header style={{
        background: "#10294b",
        color: "white",
        padding: "20px 7%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 15
      }}>
        <div style={{fontSize: 23, fontWeight: 800}}>
          DN <span style={{color:"#56b4e9"}}>Med Study</span>
          <div style={{fontSize: 10, color:"#b9c9dc", letterSpacing:2}}>
            LE SAVOIR MÉDICAL À PORTÉE DE MAIN
          </div>
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: "transparent",
            color: "white",
            border: "1px solid #7890aa",
            borderRadius: 8,
            padding: "9px 14px",
            cursor: "pointer"
          }}>
          ☰ Menu
        </button>

        {menuOpen && (
          <nav style={{width:"100%", display:"flex", gap:20, flexWrap:"wrap"}}>
            <a href="#accueil" style={{color:"white"}}>Accueil</a>
            <a href="#services" style={{color:"white"}}>Services</a>
            <a href="/connexion" style={{color:"white"}}>Connexion</a>
          </nav>
        )}
      </header>

      <section id="accueil" style={{
        padding: "75px 7%",
        background: "linear-gradient(120deg,#10294b,#174c78)",
        color: "white"
      }}>
        <div style={{maxWidth:750}}>
          <div style={{
            color:"#8dd5ff",
            fontWeight:700,
            letterSpacing:2,
            fontSize:12,
            marginBottom:20
          }}>
            PLATEFORME D'APPRENTISSAGE MÉDICAL
          </div>

          <h1 style={{
            fontSize:"clamp(34px,6vw,58px)",
            lineHeight:1.12,
            margin:"0 0 22px"
          }}>
            Apprends aujourd'hui.
            <br/>
            Soigne mieux demain.
          </h1>

          <p style={{
            fontSize:17,
            lineHeight:1.8,
            color:"#d6e4f1",
            maxWidth:600
          }}>
            Bienvenue sur DN Med Study, ton espace dédié
            à l'apprentissage, à la révision et à la réussite
            dans les études médicales.
          </p>

          <div style={{
            display:"flex",
            flexWrap:"wrap",
            gap:13,
            marginTop:30
          }}>
            <a href="/connexion" style={{
              background:"#39a9e8",
              color:"white",
              padding:"15px 24px",
              borderRadius:9,
              textDecoration:"none",
              fontWeight:700
            }}>
              Espace étudiant →
            </a>

            <a href="#services" style={{
              border:"1px solid #a8c5df",
              color:"white",
              padding:"15px 24px",
              borderRadius:9,
              textDecoration:"none"
            }}>
              Découvrir la plateforme
            </a>
          </div>
        </div>
      </section>

      <section id="services" style={{
        padding:"65px 7%"
      }}>
        <div style={{textAlign:"center", marginBottom:40}}>
          <div style={{
            color:"#1685c2",
            fontWeight:700,
            fontSize:12,
            letterSpacing:2
          }}>
            NOS RESSOURCES
          </div>

          <h2 style={{fontSize:30, marginBottom:10}}>
            Tout pour progresser
          </h2>

          <p style={{color:"#64748b", lineHeight:1.7}}>
            Les outils essentiels pour accompagner ton parcours médical.
          </p>
        </div>

        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",
          gap:20
        }}>
          {features.map((feature) => (
            <article key={feature.title} style={{
              background:"white",
              padding:25,
              borderRadius:15,
              border:"1px solid #e3eaf2",
              boxShadow:"0 5px 20px rgba(20,40,70,.04)"
            }}>
              <div style={{fontSize:35, marginBottom:15}}>
                {feature.icon}
              </div>
              <h3 style={{fontSize:19}}>
                {feature.title}
              </h3>
              <p style={{
                color:"#64748b",
                lineHeight:1.7,
                fontSize:14
              }}>
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section style={{
        margin:"0 7% 65px",
        padding:35,
        background:"#e6f3fc",
        borderRadius:16,
        textAlign:"center"
      }}>
        <h2>Construis ton avenir médical avec nous.</h2>
        <p style={{color:"#52677f", lineHeight:1.7}}>
          Un espace pensé pour apprendre, comprendre et progresser.
        </p>
        <a href="/connexion" style={{
          display:"inline-block",
          background:"#10294b",
          color:"white",
          textDecoration:"none",
          padding:"14px 25px",
          borderRadius:8,
          marginTop:12,
          fontWeight:700
        }}>
          Accéder à mon espace
        </a>
      </section>

      <footer style={{
        background:"#10294b",
        color:"#cbd8e6",
        padding:25,
        textAlign:"center",
        fontSize:13
      }}>
        <strong style={{color:"white"}}>DN Med Study</strong>
        <p>La connaissance médicale au service de la réussite.</p>
        © 2026 DN Med Study — Tous droits réservés.
      </footer>
    </main>
  );
}

