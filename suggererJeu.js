// Fichier : api/suggererJeu.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { nom: nomSaisi } = req.body;
    if (!nomSaisi) return res.status(400).json({ error: "Nom manquant" });

    const NOTION_SECRET = process.env.NOTION_SECRET;
    const DATABASE_ID = process.env.DATABASE_ID;

    // Valeurs par défaut propres et distinctes pour éviter le faux "tous pareils"
    let nom = nomSaisi;
    let image = "https://images.unsplash.com/photo-1610890716171-6b1bb98ffaed?q=80&w=900&auto=format&fit=crop";
    let joueurs = "2 à 4 joueurs";
    let duree = "30 min";
    let age = "8 ans";
    let difficulte = "Moyen";
    let genre = "Jeu de société";

    try {
        const atlasRes = await fetch(`https://api.boardgameatlas.com/api/search?name=${encodeURIComponent(nomSaisi)}&client_id=JLBr5npPhV`);
        const atlasData = await atlasRes.json();
        
        if (atlasData && atlasData.games && atlasData.games.length > 0) {
            const g = atlasData.games[0];
            if (g.name) nom = g.name;
            if (g.image_url) image = g.image_url;
            if (g.min_players && g.max_players) {
                joueurs = `${g.min_players} à ${g.max_players} joueurs`;
            }
            if (g.min_playtime) duree = `${g.min_playtime} min`;
            if (g.min_age) age = `${g.min_age} ans`;
            if (g.average_learning_complexity) {
                difficulte = `${g.average_learning_complexity.toFixed(1)}/5`;
            }
        }
    } catch (e) {
        console.error("Erreur API externe, utilisation des valeurs par défaut.", e);
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
                    'Nom': { title: [{ text: { content: nom } }] },
                    'Image': { url: image },
                    'Joueurs': { rich_text: [{ text: { content: joueurs } }] },
                    'Durée': { rich_text: [{ text: { content: duree } }] },
                    'Âge': { rich_text: [{ text: { content: age } }] },
                    'Difficulté': { rich_text: [{ text: { content: difficulte } }] },
                    'Genre': { multi_select: [{ name: genre }] },
                    'Votes': { number: 1 } 
                }
            })
        });

        if (!notionRes.ok) {
            const errText = await notionRes.text();
            return res.status(500).json({ error: errText });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "Erreur serveur interne." });
    }
}