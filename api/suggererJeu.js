// Fichier : api/suggererJeu.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    console.log("🚀 Requête reçue pour le jeu :", req.body?.nom);

    const { nom: nomSaisi } = req.body;
    if (!nomSaisi) return res.status(400).json({ error: "Nom manquant" });

    const { NOTION_SECRET, DATABASE_ID, GEMINI_API_KEY } = process.env;

    try {
        // 1. APPEL À L'IA (GEMINI)
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
        
        N'ajoute aucun markdown, aucun texte avant ou après, seulement le JSON brut.`;
        
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            console.error("❌ Erreur API Gemini :", errText);
            return res.status(500).json({ error: "Erreur de l'intelligence artificielle (quota ou clé invalide)." });
        }

        const geminiData = await geminiRes.json();
        let jsonText = geminiData.candidates[0].content.parts[0].text;
        
        // Nettoyage des balises markdown si l'IA en rajoute
        jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const stats = JSON.parse(jsonText);
        
        let infoJeu = {
            nom: stats.nom || nomSaisi,
            joueurs: stats.joueurs || "N/A",
            duree: stats.duree || "N/A",
            age: stats.age || "N/A",
            difficulte: stats.difficulte || "N/A",
            genre: stats.genre || "Stratégie",
            description: stats.description || "Un super jeu à tester !"
        };

        // 2. VÉRIFICATION ANTI-DOUBLON DANS NOTION
        const checkRes = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_SECRET}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filter: {
                    property: 'Nom',
                    title: {
                        equals: infoJeu.nom
                    }
                }
            })
        });

        const checkData = await checkRes.json();
        if (checkData.results && checkData.results.length > 0) {
            return res.status(409).json({ error: "Ce jeu est déjà dans la liste !" });
        }

        // 3. ENREGISTREMENT DANS NOTION
        const notionRes = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_SECRET}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                parent: { database_id: DATABASE_ID },
                properties: {
                    'Nom': { title: [{ text: { content: infoJeu.nom } }] },
                    'Description': { rich_text: [{ text: { content: infoJeu.description } }] },
                    'Joueurs': { rich_text: [{ text: { content: infoJeu.joueurs } }] },
                    'Durée': { rich_text: [{ text: { content: infoJeu.duree } }] },
                    'Âge': { rich_text: [{ text: { content: infoJeu.age } }] },
                    'Difficulté': { rich_text: [{ text: { content: infoJeu.difficulte } }] },
                    'Genre': { multi_select: [{ name: infoJeu.genre }] },
                    'Votes': { number: 1 } 
                }
            })
        });

        if (!notionRes.ok) throw new Error("Erreur Notion");
        
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("❌ Erreur serveur :", error);
        return res.status(500).json({ error: "Erreur interne du serveur" });
    }
}