// Fichier : api/suggererJeu.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    console.log("🚀 Requête reçue pour le jeu :", req.body?.nom);

    const { nom: nomSaisi } = req.body;
    if (!nomSaisi) return res.status(400).json({ error: "Nom manquant" });

    const { NOTION_SECRET, DATABASE_ID, GEMINI_API_KEY, GOOGLE_API_KEY, GOOGLE_CX } = process.env;

    let infoJeu = {
        nom: nomSaisi,
        joueurs: "N/A", duree: "N/A", age: "N/A", difficulte: "N/A", genre: "Stratégie",
        image: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffaed?q=80&w=900&auto=format&fit=crop"
    };

    try {
        // 1. APPEL À L'IA (GEMINI) - Correction du nom du modèle ici (gemini-1.5-flash)
        const prompt = `Donne les informations exactes du jeu de société "${nomSaisi}". Réponds UNIQUEMENT au format JSON avec exactement ces clés : "nom" (vrai nom complet du jeu), "joueurs" (ex: "2 à 4 joueurs"), "duree" (ex: "45 min"), "age" (ex: "10+ ans"), "difficulte" (note de complexité sur 5, ex: "2.5/5"), "genre" (un seul mot descriptif). Ne génère aucun autre texte.`;
        
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
            console.log("✅ Stats IA récupérées avec succès");
        } else {
            console.error("❌ Erreur API Gemini :", await geminiRes.text());
        }
    } catch (e) {
        console.error("❌ Crash dans le bloc Gemini :", e);
    }

    try {
        // 2. APPEL À GOOGLE IMAGES
        const rechercheImage = encodeURIComponent(`${infoJeu.nom} jeu de societe boite`);
        const searchRes = await fetch(`https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${rechercheImage}&searchType=image&num=1`);
        
        if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.items && searchData.items.length > 0) {
                infoJeu.image = searchData.items[0].link;
                console.log("✅ Image Google récupérée avec succès");
            }
        } else {
             console.error("❌ Erreur Google Image :", await searchRes.text());
        }
    } catch (e) {
        console.error("❌ Crash Google Image :", e);
    }

    try {
        // 3. ENVOI FINAL À NOTION
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