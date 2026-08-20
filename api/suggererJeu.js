// Fichier : api/suggererJeu.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { nom: nomSaisi } = req.body;
    const NOTION_SECRET = process.env.NOTION_SECRET;
    const DATABASE_ID = process.env.DATABASE_ID;

    // Valeurs par défaut propres
    let nom = nomSaisi;
    let image = "https://images.unsplash.com/photo-1610890716171-6b1bb98ffaed?q=80&w=900&auto=format&fit=crop";
    let joueurs = "2-4";
    let duree = "45";
    let age = "10+";
    let difficulte = "2.0/5";
    let genre = "Stratégie";

    try {
        // Vercel interroge BoardGameAtlas en arrière-plan (zéro blocage !)
        const atlasRes = await fetch(`https://api.boardgameatlas.com/api/search?name=${encodeURIComponent(nomSaisi)}&client_id=JLBr5npPhV`);
        const atlasData = await atlasRes.json();
        
        if (atlasData.games && atlasData.games.length > 0) {
            const g = atlasData.games[0];
            nom = g.name || nomSaisi;
            image = g.image_url || image;
            joueurs = `${g.min_players}-${g.max_players}`;
            duree = g.min_playtime ? g.min_playtime.toString() : "45";
            age = g.min_age ? g.min_age.toString() + "+" : "10+";
            difficulte = g.average_user_rating ? g.average_user_rating.toFixed(1) + "/5" : "2.0/5";
            genre = (g.categories && g.categories.length > 0) ? "Jeu de société" : "Stratégie";
        }
    } catch (e) {
        console.log("Erreur Atlas, utilisation des valeurs par défaut.");
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

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur." });
    }
}