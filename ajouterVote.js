// Fichier : api/ajouterVote.js
export default async function handler(req, res) {
    // On s'assure que c'est bien une demande d'envoi de données (POST)
    if (req.method !== 'POST') return res.status(405).end();

    const NOTION_SECRET = process.env.NOTION_SECRET;
    
    // On récupère l'identifiant de la ligne du jeu et le nouveau total de votes
    const { pageId, nouveauxVotes } = req.body;

    try {
        // On demande à Notion de mettre à jour uniquement la colonne "Votes" de cette ligne précise
        const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${NOTION_SECRET}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                properties: {
                    'Votes': {
                        number: nouveauxVotes
                    }
                }
            })
        });

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors du vote' });
    }
}