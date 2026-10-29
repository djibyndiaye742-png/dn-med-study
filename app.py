
import streamlit as st
from pypdf import PdfReader
from google import genai

st.set_page_config(
    page_title="DN Med Study",
    page_icon="🩺",
    layout="wide"
)

st.markdown("""
<style>
.stApp {background:#f5f7fb;}
h1 {color:#123b65;}
[data-testid="stSidebar"] {background:#eaf0f8;}
</style>
""", unsafe_allow_html=True)

st.title("🩺 DN Med Study")
st.caption("La plateforme intelligente de révision médicale")

with st.sidebar:
    st.header("📚 Mon espace de révision")
    st.write("Importe ton cours pour commencer.")
    fichier = st.file_uploader(
        "Cours au format PDF",
        type=["pdf"]
    )

texte_cours = ""

if fichier:
    try:
        lecteur = PdfReader(fichier)
        pages = []
        for page in lecteur.pages:
            pages.append(page.extract_text() or "")
        texte_cours = "\n".join(pages).strip()

        if texte_cours:
            st.sidebar.success(
                f"Cours chargé : {len(lecteur.pages)} pages"
            )
        else:
            st.sidebar.warning(
                "Aucun texte extrait. Le PDF est peut-être scanné."
            )
    except Exception as erreur:
        st.sidebar.error(f"Lecture du PDF impossible : {erreur}")

def appeler_ia(prompt):
    try:
        cle = st.secrets["GEMINI_API_KEY"]
        client = genai.Client(api_key=cle)
        reponse = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return reponse.text or "L'IA n'a pas fourni de réponse."
    except KeyError:
        return (
            "Configuration manquante : la clé GEMINI_API_KEY "
            "doit être ajoutée dans les paramètres Secrets "
            "de l'application hébergée."
        )
    except Exception as erreur:
        return (
            "Erreur lors de l'appel à l'IA. "
            "Vérifie la configuration et les quotas. "
            f"Détail : {erreur}"
        )

onglets = st.tabs([
    "🏠 Accueil",
    "💬 Tuteur médical",
    "📝 Fiche de révision",
    "🎯 Générateur de QCM"
])

with onglets[0]:
    st.subheader("Bienvenue sur DN Med Study")
    st.write(
        "Un espace pour comprendre les cours, "
        "préparer les examens et progresser en médecine."
    )

    c1, c2, c3 = st.columns(3)
    c1.metric("Fonction", "Cours PDF")
    c2.metric("Fonction", "QCM")
    c3.metric("Fonction", "Fiches")

    st.info(
        "Commence par importer un cours PDF dans la barre latérale."
    )

with onglets[1]:
    st.subheader("Tuteur médical IA")
    question = st.text_area(
        "Quelle notion souhaites-tu comprendre ?",
        key="question_tuteur"
    )

    if st.button("Poser ma question", key="btn_tuteur"):
        if not question.strip():
            st.warning("Écris d'abord ta question.")
        else:
            contexte = texte_cours[:30000] if texte_cours else (
                "Aucun cours n'a été importé."
            )
            prompt = f"""
Tu es DN Med Study, un tuteur pour étudiants en médecine.
Réponds en français, clairement et avec une structure pédagogique.
Distingue les faits établis des incertitudes.
Ne présente pas ta réponse comme un diagnostic médical.

COURS FOURNI :
{contexte}

QUESTION :
{question}

Explique la réponse et donne un exemple si utile.
"""
            with st.spinner("Préparation de la réponse..."):
                st.markdown(appeler_ia(prompt))

with onglets[2]:
    st.subheader("Créer une fiche de révision")
    if st.button("Générer ma fiche", key="btn_fiche"):
        if not texte_cours:
            st.warning("Importe d'abord un cours PDF.")
        else:
            prompt = f"""
À partir du cours suivant, crée une fiche de révision
médicale en français avec :
- objectifs et définitions ;
- notions essentielles ;
- mécanismes importants ;
- tableaux comparatifs si utiles ;
- points à mémoriser pour l'examen.
N'invente pas d'informations absentes du cours.

COURS :
{texte_cours[:30000]}
"""
            with st.spinner("Création de la fiche..."):
                st.markdown(appeler_ia(prompt))

with onglets[3]:
    st.subheader("Générateur de QCM")
    type_qcm = st.selectbox(
        "Type de QCM",
        ["Élection", "Groupage", "Censure"]
    )
    nombre = st.slider("Nombre de questions", 1, 10, 5)

    if st.button("Générer les QCM", key="btn_qcm"):
        if not texte_cours:
            st.warning("Importe d'abord un cours PDF.")
        else:
            regles = {
                "Élection": (
                    "Une seule proposition correcte par question."
                ),
                "Groupage": (
                    "Une ou plusieurs propositions peuvent être correctes."
                ),
                "Censure": (
                    "Une seule proposition est fausse par question. "
                    "Demande de repérer la proposition fausse."
                )
            }

            prompt = f"""
Crée exactement {nombre} QCM médicaux en français.
Type : {type_qcm}.
Règle : {regles[type_qcm]}

Pour chaque question :
- écris un énoncé clair ;
- propose cinq réponses A, B, C, D et E ;
- indique la ou les bonnes réponses ;
- explique pourquoi chaque réponse est vraie ou fausse.

Base-toi uniquement sur le cours fourni.
Signale toute information insuffisante plutôt que de l'inventer.
Présente le résultat de manière lisible avec des titres.

COURS :
{texte_cours[:30000]}
"""
            with st.spinner("Génération des questions..."):
                st.markdown(appeler_ia(prompt))

st.divider()
st.caption(
    "DN Med Study — Outil pédagogique. "
    "Les réponses générées par IA doivent être vérifiées."
)
