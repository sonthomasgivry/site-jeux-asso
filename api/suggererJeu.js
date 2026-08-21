// Fichier : api/suggererJeu.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    console.log("🚀 Requête reçue pour le jeu :", req.body?.nom);

    const { nom: nomSaisi } = req.body;
    if (!nomSaisi) return res.status(400).json({ error: "Nom manquant" });

    const { NOTION_SECRET, DATABASE_ID, GEMINI_API_KEY } = process.env;

    let infoJeu = {
        nom: nomSaisi,
        joueurs: "N/A", duree: "N/A", age: "N/A", difficulte: "N/A", genre: "Stratégie",
        description: "Un jeu passionnant à découvrir en association !"
    };

    try {
        // 1. Appel à l'IA pour obtenir les stats propres et le vrai nom du jeu
        const prompt = `Tu es un expert en jeux de société. Pour le jeu "${nomSaisi}", réponds UNIQUEMENT au format JSON avec exactement ces clés : 
        - "nom": le vrai nom officiel et complet du jeu (ex: "7 Wonders" ou "Catan"), 
        - "joueurs": ex "2 à 4 joueurs", 
        - "duree": ex "45 min", 
        - "age": ex "10+ ans", 
        - "difficulte": ex "2.5/5", 
        - "genre": un seul mot descriptif,
        - "description": une courte description accrocheuse du jeu en 2 phrases maximum.
        Ne génère aucun autre texte que le JSON.`;
        
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
            const jsonText = geminiData.candidates[0].content.parts[0].text;
            const stats = JSON.parse(jsonText);
            
            infoJeu.nom = stats.nom || nomSaisi;
            infoJeu.joueurs = stats.joueurs || "N/A";
            infoJeu.duree = stats.duree || "N/A";
            infoJeu.age = stats.age || "N/A";
            infoJeu.difficulte = stats.difficulte || "N/A";
            infoJeu.genre = stats.genre || "Stratégie";
            infoJeu.description = stats.description || "Un super jeu à tester !";
        }

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
            // Le jeu existe déjà ! On stoppe tout et on prévient le front-end
            return res.status(409).json({ error: "Ce jeu est déjà dans la liste !" });
        }

        // 3. ENREGISTREMENT DANS NOTION (si le jeu n'existe pas)
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
        return res.status(500).json({ error: "Erreur interne" });
    }
}