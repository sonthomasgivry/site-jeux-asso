// Fichier : api/suggererJeu.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { nomJeu } = req.body;
    const NOTION_SECRET = process.env.NOTION_SECRET;
    const DATABASE_ID = process.env.DATABASE_ID;

    try {
        // L'arme secrète : on donne à Vercel la carte d'identité d'un vrai Google Chrome
        const optionsNav = {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        };

        // 1. Chercher le jeu directement sur BGG sans aucun relais !
        const urlRecherche = `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodeURIComponent(nomJeu)}&exact=0`;
        const searchRes = await fetch(urlRecherche, optionsNav);
        const searchXml = await searchRes.text();
        
        // Si BGG nous repère quand même, on le détecte proprement
        if (searchXml.includes('<!DOCTYPE html>') || searchXml.includes('<html')) {
            console.error("Cloudflare a bloqué. Réponse :", searchXml.substring(0, 150));
            return res.status(502).json({ error: "Bloqué par la sécurité de BGG." });
        }

        const idMatch = searchXml.match(/<item[^>]*id="(\d+)"/i);
        if (!idMatch) return res.status(404).json({ error: "Jeu introuvable." });
        const gameId = idMatch[1];

        // 2. Récupérer les détails
        const urlDetails = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`;
        const detailsRes = await fetch(urlDetails, optionsNav);
        const thingXml = await detailsRes.text();

        // 3. Extractions
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

        // 4. Envoyer à Notion
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

        if (!notionRes.ok) throw new Error("Erreur avec Notion");

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Erreur générale :", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
}