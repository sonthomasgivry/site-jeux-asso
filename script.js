// --- GESTION DU BOUTON SUGGÉRER ---
const btnSuggerer = document.getElementById('btn-suggerer');
const inputRecherche = document.getElementById('recherche-jeu');

if (btnSuggerer && inputRecherche) {
    btnSuggerer.addEventListener('click', async () => {
        const nomSaisi = inputRecherche.value.trim();
        if (!nomSaisi) return;

        btnSuggerer.disabled = true;
        btnSuggerer.innerText = 'Recherche sur BGG...';

        // Valeurs par défaut propres si jamais le jeu est introuvable
        let infoJeu = { 
            nom: nomSaisi, 
            image: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffaed?q=80&w=900&auto=format&fit=crop", 
            joueurs: "N/A", duree: "N/A", age: "N/A", difficulte: "N/A", genre: "Stratégie" 
        };

        try {
            // 1. Recherche BGG via le navigateur + Proxy CORS pour lire le XML brut
            const searchUrl = `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodeURIComponent(nomSaisi)}&exact=0`;
            const searchRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(searchUrl)}`);
            const searchText = await searchRes.text();
            
            // Fini les Regex : on parse le XML comme un vrai document
            const parser = new DOMParser();
            const searchXml = parser.parseFromString(searchText, "text/xml");
            const item = searchXml.querySelector("item");

            if (item) {
                const gameId = item.getAttribute("id");

                // Pause polie de 1.5s pour respecter le Rate Limiting de l'API
                await new Promise(r => setTimeout(r, 1500));

                // 2. Récupération des infos avec l'ID
                const detailsUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`;
                const detailsRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(detailsUrl)}`);
                const detailsText = await detailsRes.text();
                const detailXml = parser.parseFromString(detailsText, "text/xml");

                // Extraction chirurgicale des vraies balises BGG
                infoJeu.nom = detailXml.querySelector('name[type="primary"]')?.getAttribute('value') || nomSaisi;
                
                const imgNode = detailXml.querySelector('image');
                if (imgNode) infoJeu.image = imgNode.textContent;

                const minp = detailXml.querySelector('minplayers')?.getAttribute('value');
                const maxp = detailXml.querySelector('maxplayers')?.getAttribute('value');
                if (minp && maxp) infoJeu.joueurs = (minp === maxp) ? `${minp} joueurs` : `${minp} à ${maxp} joueurs`;

                const time = detailXml.querySelector('playingtime')?.getAttribute('value');
                if (time && time !== "0") infoJeu.duree = `${time} min`;

                const minage = detailXml.querySelector('minage')?.getAttribute('value');
                if (minage && minage !== "0") infoJeu.age = `${minage}+ ans`;

                const weight = detailXml.querySelector('averageweight')?.getAttribute('value');
                if (weight && parseFloat(weight) > 0) infoJeu.difficulte = parseFloat(weight).toFixed(1) + "/5";
            }
        } catch (error) {
            console.error("Erreur avec l'API BGG", error);
            // Si ça échoue, on continue quand même avec les valeurs par défaut au lieu de planter
        }

        btnSuggerer.innerText = 'Envoi vers Notion...';

        // 3. Envoi au serveur Vercel
        try {
            const reponse = await fetch('/api/suggererJeu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(infoJeu)
            });

            if (reponse.ok) {
                inputRecherche.value = '';
                await chargerJeux(); // On actualise la grille une fois que tout est fini
            } else {
                alert("Erreur lors de l'enregistrement du jeu.");
            }
        } catch (err) {
            alert("Erreur de connexion.");
        } finally {
            btnSuggerer.disabled = false;
            btnSuggerer.innerText = 'Suggérer';
        }
    });
}