// Fichier : api/suggererJeu.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { nomJeu } = req.body;
    const NOTION_SECRET = process.env.NOTION_SECRET;
    const DATABASE_ID = process.env.DATABASE_ID;

    try {
        // La clé absolue : une carte d'identité 100% honnête pour rassurer BGG.
        const headersBGG = {
            'User-Agent': 'BoiteAIdees-AssoJeux/1.0 (Contact: admin@site-jeux-asso.vercel.app)',
            'Accept': 'text/xml'
        };

        // 1. Recherche BGG 
        const urlRecherche = `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodeURIComponent(nomJeu)}&exact=0`;
        const searchRes = await fetch(urlRecherche, { headers: headersBGG });
        const searchXml = await searchRes.text();
        
        // Si BGG nous bloque, on gère l'erreur proprement
        if (searchXml.includes('Unauthorized')) {
             return res.status(502).json({ error: "Bloqué par la sécurité de BGG." });
        }

        const idMatch = searchXml.match(/<item[^>]*id="(\d+)"/i);
        if (!idMatch) return res.status(404).json({ error: "Jeu introuvable sur BGG." });
        const gameId = idMatch[1];

        // 2. Pause de politesse exigée par BGG pour ne pas surcharger leurs serveurs
        await new Promise(resolve => setTimeout(resolve, 600));

        // 3. Récupérer les détails
        const urlDetails = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`;
        const detailsRes = await fetch(urlDetails, { headers: headersBGG });
        const thingXml = await detailsRes.text();

        // 4. Extractions des informations
        const nameMatch = thingXml.match(/<name type="primary"[^>]*value="([^"]+)"/i);
        const name = nameMatch ? nameMatch[1] : nomJeu;
        
        const imageMatch = thingXml.match(/<image>(.*?)<\/image>/i);
        const image = imageMatch ? imageMatch[1] : "https://images.unsplash.com/photo-1610890716171-6b1bb98ffaed?q=80&w=900&auto=format&fit=crop";

        const minpMatch = thingXml.match(/<minplayers[^>]*value="(\d+)"/i);
        const maxpMatch = thingXml.match(/<maxplayers[^>]*value="(\d+)"/i);
        const joueurs = (minpMatch && maxpMatch) ? `${minpMatch[1]}-${maxpMatch[1]}` : "N/A";

        const timeMatch = thingXml.match(/<playingtime[^>]*value="(\d+)"/i);
        const duree = timeMatch ? timeMatch[1] : "N/A";

        const ageMatch = thingXml.match(/<minage[^>]*value="(\d+)"/i);
        const age = ageMatch ? ageMatch[1] + "+" : "N/A";

        const weightMatch = thingXml.match(/<averageweight[^>]*value="([\d.]+)"/i);
        const difficulte = weightMatch ? parseFloat(weightMatch[1]).toFixed(1) + "/5" : "N/A";

        const genreMatch = thingXml.match(/<link type="boardgamecategory"[^>]*value="([^"]+)"/i);
        const genre = genreMatch ? genreMatch[1] : "Général";

        // 5. Envoyer toutes ces informations bien rangées dans Notion
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

        if (!notionRes.ok) {
            const erreurNotion = await notionRes.text();
            console.error("--- ERREUR NOTION DÉTAILLÉE ---");
            console.error(erreurNotion);
            return res.status(500).json({ error: "Erreur avec Notion" });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur." });
    }
}