// Fichier : api/suggererJeu.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { nom: nomSaisi } = req.body;
    if (!nomSaisi) return res.status(400).json({ error: "Nom manquant" });

    const NOTION_SECRET = process.env.NOTION_SECRET;
    const DATABASE_ID = process.env.DATABASE_ID;

    // Valeurs par défaut propres si jamais BGG ne trouve pas
    let nom = nomSaisi;
    let image = "https://images.unsplash.com/photo-1610890716171-6b1bb98ffaed?q=80&w=900&auto=format&fit=crop";
    let joueurs = "N/A";
    let duree = "N/A";
    let age = "N/A";
    let difficulte = "N/A";
    let genre = "Général";

    try {
        // 1. Recherche de l'ID du jeu sur BGG (Direct Vercel -> BGG)
        const searchUrl = `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodeURIComponent(nomSaisi)}&exact=0`;
        const searchRes = await fetch(searchUrl);
        const searchXml = await searchRes.text();

        const idMatch = searchXml.match(/<item[^>]*id="(\d+)"/i);
        
        if (idMatch) {
            const gameId = idMatch[1];

            // LE SECRET EST ICI : Pause de 1.5s pour respecter le Rate Limiting de BGG
            await new Promise(resolve => setTimeout(resolve, 1500));

            // 2. Récupération des statistiques détaillées
            const detailsUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`;
            const detailsRes = await fetch(detailsUrl);
            const xml = await detailsRes.text();

            // 3. Extraction chirurgicale des données BGG
            const nameMatch = xml.match(/<name type="primary"[^>]*value="([^"]+)"/i);
            if (nameMatch) nom = nameMatch[1];

            const imageMatch = xml.match(/<image>(.*?)<\/image>/i);
            if (imageMatch) image = imageMatch[1];

            const minp = xml.match(/<minplayers[^>]*value="(\d+)"/i);
            const maxp = xml.match(/<maxplayers[^>]*value="(\d+)"/i);
            if (minp && maxp) {
                joueurs = minp[1] === maxp[1] ? `${minp[1]} joueurs` : `${minp[1]}-${maxp[1]} joueurs`;
            }

            const time = xml.match(/<playingtime[^>]*value="(\d+)"/i);
            if (time && time[1] !== "0") duree = `${time[1]} min`;

            const minage = xml.match(/<minage[^>]*value="(\d+)"/i);
            if (minage && minage[1] !== "0") age = `${minage[1]}+ ans`;

            const weight = xml.match(/<averageweight[^>]*value="([\d.]+)"/i);
            if (weight && parseFloat(weight[1]) > 0) difficulte = parseFloat(weight[1]).toFixed(1) + "/5";

            const catMatch = xml.match(/<link type="boardgamecategory"[^>]*value="([^"]+)"/i);
            if (catMatch) genre = "Stratégie"; // Adapté pour être accepté par ta colonne Select Notion
        }
    } catch (error) {
        console.error("Avertissement BGG :", error);
        // On ne plante pas, on passe simplement à la suite avec les valeurs par défaut
    }

    // 4. Envoi propre vers Notion
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
            return res.status(500).json({ error: "Erreur Notion: " + errText });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "Erreur de connexion avec Notion." });
    }
}