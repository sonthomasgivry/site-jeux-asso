// Fichier : api/suggererJeu.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    console.log("🚀 Requête reçue pour le jeu :", req.body?.nom);

    const { nom: nomSaisi } = req.body;
    if (!nomSaisi) return res.status(400).json({ error: "Nom manquant" });

    const { NOTION_SECRET, DATABASE_ID, GEMINI_API_KEY } = process.env;

    // Message de secours personnalisé quand l'IA fatigue ou atteint son quota
    const messageSecoursIA = "Notre IA ne veut plus travailler, nous mettrons a jour cette carte prochainement pour qu'elle affiche de bonnes informations, en attendant vous pouvez tout de même voter pour ce jeu.";

    let infoJeu = {
        nom: nomSaisi,
        joueurs: "2 à 4 joueurs",
        duree: "60 min",
        age: "10+ ans",
        difficulte: "2/5",
        genre: "Stratégie",
        description: messageSecoursIA
    };

    try {
        // 1. APPEL À L'IA (GEMINI) - Optionnel et sécurisé
        const prompt = `Tu es un expert en jeux de société. Nous sommes en l'an 2026. Pour le jeu "${nomSaisi}" (corrige les éventuelles fautes de frappe ou minuscules) :
        1. Vérifie si le jeu est déjà sorti ou s'il s'agit d'un jeu à venir / en précommande / participatif (Kickstarter).
        2. Réponds UNIQUEMENT au format JSON strict avec exactement ces clés : 
        - "nom": le vrai nom officiel et complet du jeu, 
        - "joueurs": ex "2 à 4 joueurs", 
        - "duree": ex "45 min", 
        - "age": ex "10+ ans", 
        - "difficulte": ex "2.5/5", 
        - "genre": un seul mot descriptif,
        - "description": Si le jeu n'est PAS ENCORE sorti, commence obligatoirement la description par une mention claire de sa date de sortie (ex: "⚠️ Sortie prévue en [Mois/Année]"). Ensuite, ajoute une courte description accrocheuse en 2 phrases maximum. S'il est déjà sorti, fais simplement la description normale sans mention de date.
        
        N'ajoute aucun markdown, aucun texte avant ou తర్వాత, seulement le JSON brut.`;
        
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            let jsonText = geminiData.candidates[0].content.parts[0].text;
            
            // Nettoyage des balises markdown si l'IA en rajoute
            jsonText = jsonText.replace(/```json/g, '').replace(/