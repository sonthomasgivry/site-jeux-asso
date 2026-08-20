// Fichier : api/getJeux.js
export default async function handler(req, res) {
    // Vercel gardera ces infos secrètes pour nous
    const NOTION_SECRET = process.env.NOTION_SECRET;
    const DATABASE_ID = process.env.DATABASE_ID;

    try {
        // On tape à la porte de Notion
        const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_SECRET}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        // On renvoie les données à ton site web
        res.status(200).json(data.results);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la connexion à Notion' });
    }
}