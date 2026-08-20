// Fichier : api/suggererJeu.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { nom, image, joueurs, duree, age, difficulte, genre } = req.body;
    const NOTION_SECRET = process.env.NOTION_SECRET;
    const DATABASE_ID = process.env.DATABASE_ID;

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
                    'Image': { url: `https://images.weserv.nl/?url=${encodeURIComponent(image)}` },
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
            console.error("ERREUR NOTION BRUTE :", erreurNotion);
            // On renvoie l'erreur réelle reçue de Notion
            return res.status(500).json({ error: erreurNotion });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur." });
    }
}