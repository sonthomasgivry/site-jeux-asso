// Fichier : api/getJeux.js
export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).end();

    const { NOTION_SECRET, DATABASE_ID } = process.env;

    try {
        const notionRes = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_SECRET}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                // LE TRI : Du plus grand nombre de votes au plus petit
                sorts: [
                    {
                        property: 'Votes',
                        direction: 'descending'
                    }
                ]
            })
        });

        if (!notionRes.ok) throw new Error("Erreur Notion getJeux");

        const data = await notionRes.json();
        return res.status(200).json(data.results);
    } catch (error) {
        return res.status(500).json({ error: "Erreur serveur getJeux" });
    }
}