// Fichier : api/suggererJeu.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    console.log("🚀 Requête reçue pour le jeu :", req.body?.nom);

    const { nom: nomSaisi } = req.body;
    if (!nomSaisi) return res.status(400).json({ error: "Nom manquant" });

    const { NOTION_SECRET, DATABASE_ID, GEMINI_API_KEY } = process.env;

    // Image de secours propre et garantie 100% fonctionnelle
    let imageFinale = "https://images.unsplash.com/photo-1610890716171-6b1bb98ffaed?q=80&w=900&auto=format&fit=crop";

    let infoJeu = {
        nom: nomSaisi,
        joueurs: "N/A", duree: "N/A", age: "N/A", difficulte: "N/A", genre: "Stratégie",
        image: imageFinale
    };

    try {
        const prompt = `Tu es un expert en jeux de société. Pour le jeu "${nomSaisi}", réponds UNIQUEMENT au format JSON avec exactement ces clés : 
        - "nom": le vrai nom complet du jeu, 
        - "joueurs": ex "2 à 4 joueurs", 
        - "duree": ex "45 min", 
        - "age": ex "10+ ans", 
        - "difficulte": ex "2.5/5", 
        - "genre": un seul mot descriptif,
        - "image": l'URL directe d'une image publique (comme une image Wikimedia Commons si elle existe). IMPORTANT : N'invente JAMAIS une URL de site marchand (comme Philibert ou autre) car elle donnerait une erreur 404. Si tu n'as pas de lien direct d'image parfaitement stable et valide, laisse cette clé vide ou mets une chaîne vide "".
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
            
            // Si l'IA a donné un vrai lien valide, on l'utilise via le proxy weserv, sinon on garde l'image de secours Unsplash
            if (stats.image && stats.image.startsWith('http')) {
                infoJeu.image = `https://images.weserv.nl/?url=${encodeURIComponent(stats.image)}`;
            }
            
            console.log("✅ Stats et image traitées :", infoJeu.image);
        } else {
            console.error("❌ Erreur API Gemini :", await geminiRes.text());
        }
    } catch (e) {
        console.error("❌ Crash dans le bloc Gemini :", e);
    }

    try {
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
                    'Image': { url: infoJeu.image },
                    'Joueurs': { rich_text: [{ text: { content: infoJeu.joueurs } }] },
                    'Durée': { rich_text: [{ text: { content: infoJeu.duree } }] },
                    'Âge': { rich_text: [{ text: { content: infoJeu.age } }] },
                    'Difficulté': { rich_text: [{ text: { content: infoJeu.difficulte } }] },
                    'Genre': { multi_select: [{ name: infoJeu.genre }] },
                    'Votes': { number: 1 } 
                }
            })
        });

        if (!notionRes.ok) {
            const errNotion = await notionRes.text();
            console.error("❌ Erreur Notion :", errNotion);
            throw new Error("Notion a refusé l'enregistrement");
        }
        
        console.log("✅ Enregistrement Notion réussi !");
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("❌ Crash final Notion :", error);
        return res.status(500).json({ error: "Erreur enregistrement Notion" });
    }
}