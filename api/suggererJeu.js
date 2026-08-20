// Fichier : api/suggererJeu.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { nomJeu } = req.body;
    const NOTION_SECRET = process.env.NOTION_SECRET;
    const DATABASE_ID = process.env.DATABASE_ID;

    try {
        // 1. Chercher le jeu sur BoardGameGeek
        const searchUrl = `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodeURIComponent(nomJeu)}&exact=0`;
        const searchRes = await fetch(searchUrl);
        const searchXml = await searchRes.text();
        
        // On récupère l'identifiant (ID) du premier jeu trouvé
        const idMatch = searchXml.match(/<item type="boardgame" id="(\d+)"/);
        if (!idMatch) {
            return res.status(404).json({ error: "Jeu introuvable sur BoardGameGeek." });
        }
        const gameId = idMatch[1];

        // 2. Récupérer les détails complets de ce jeu
        const thingUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`;
        const thingRes = await fetch(thingUrl);
        const thingXml = await thingRes.text();

        // 3. Extraire les informations spécifiques
        const nameMatch = thingXml.match(/<name type="primary" sortindex="\d+" value="([^"]+)"/);
        const name = nameMatch ? nameMatch[1] : nomJeu;
        
        const imageMatch = thingXml.match(/<image>(.*?)<\/image>/);
        const image = imageMatch ? imageMatch[1] : "https://images.unsplash.com/photo-1610890716171-6b1bb98ffaed?q=80&w=900&auto=format&fit=crop";

        const minpMatch = thingXml.match(/<minplayers value="(\d+)"/);
        const maxpMatch = thingXml.match(/<maxplayers value="(\d+)"/);
        const joueurs = (minpMatch && maxpMatch) ? `${minpMatch[1]}-${maxpMatch[1]}` : "N/A";

        const timeMatch = thingXml.match(/<playingtime value="(\d+)"/);
        const duree = timeMatch ? timeMatch[1] : "N/A";

        const ageMatch = thingXml.match(/<minage value="(\d+)"/);
        const age = ageMatch ? ageMatch[1] + "+" : "N/A";

        const weightMatch = thingXml.match(/<averageweight value="([\d.]+)"/);
        const difficulte = weightMatch ? parseFloat(weightMatch[1]).toFixed(1) + "/5" : "N/A";

        const genreMatch = thingXml.match(/<link type="boardgamecategory" id="\d+" value="([^"]+)"/);
        const genre = genreMatch ? genreMatch[1] : "Général";

        // 4. Envoyer toutes ces informations bien rangées dans Notion
        await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_SECRET}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                parent: { database_id: DATABASE_ID },
                properties: {
                    'Nom': { title: [{ text: { content: name } }] },
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

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la suggestion." });
    }
}