// Fonction pour récupérer les jeux depuis notre pont Vercel
async function chargerJeux() {
    try {
        const reponse = await fetch('/api/getJeux');
        const jeux = await reponse.json();
        afficherJeux(jeux);
    } catch (erreur) {
        console.error("Erreur lors du chargement des jeux", erreur);
    }
}

// Fonction pour créer les cartes sur la page
function afficherJeux(jeux) {
    const main = document.querySelector('main');
    main.innerHTML = ''; 

    jeux.forEach(jeu => {
        const idPage = jeu.id; 
        
        const nom = jeu.properties['Nom']?.title[0]?.plain_text || 'Jeu inconnu';
        const image = jeu.properties['Image']?.url || 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffaed?q=80&w=900&auto=format&fit=crop';
        const joueurs = jeu.properties['Joueurs']?.rich_text[0]?.plain_text || 'N/A';
        const duree = jeu.properties['Durée']?.rich_text[0]?.plain_text || 'N/A';
        
        // Nouvelles informations BGG récupérées !
        const age = jeu.properties['Âge']?.rich_text[0]?.plain_text || 'N/A';
        const difficulte = jeu.properties['Difficulté']?.rich_text[0]?.plain_text || 'N/A';
        const genre = jeu.properties['Genre']?.multi_select[0]?.name || 'Général';
        
        const votes = jeu.properties['Votes']?.number || 0;

        const article = document.createElement('article');
        article.className = 'carte-jeu';
        article.innerHTML = `
            <img src="${image}" alt="${nom}" class="image-jeu">
            <div class="contenu-carte">
                <span style="background: #e2e8f0; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; color: #475569;">${genre}</span>
                <h2 style="margin-top: 10px; margin-bottom: 5px;">${nom}</h2>
                <p class="details" style="margin-bottom: 5px;">👥 ${joueurs} | ⏳ ${duree} min</p>
                <p class="details">👶 ${age} ans | 🧠 Diff: ${difficulte}</p>
                <button class="btn-vote" data-id="${idPage}" data-votes="${votes}">
                    ▲ Pour <span class="compteur">${votes}</span>
                </button>
            </div>
        `;
        main.appendChild(article);
    });

    activerBoutonsVote();
}

// L'animation et l'envoi du vote
function activerBoutonsVote() {
    const boutonsVote = document.querySelectorAll('.btn-vote');
    boutonsVote.forEach(bouton => {
        bouton.addEventListener('click', async function() {
            if (this.disabled) return;
            this.disabled = true;

            const idPage = this.getAttribute('data-id');
            let votesActuels = parseInt(this.getAttribute('data-votes'));
            let nouveauxVotes = votesActuels + 1;

            this.querySelector('.compteur').innerText = nouveauxVotes;
            this.setAttribute('data-votes', nouveauxVotes);
            this.style.backgroundColor = '#d1e7dd';
            this.style.borderColor = '#badbcc';
            this.style.color = '#0f5132';

            try {
                await fetch('/api/ajouterVote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pageId: idPage, nouveauxVotes: nouveauxVotes })
                });
            } catch (erreur) {
                console.error("Erreur d'enregistrement du vote", erreur);
            }
        });
    });
}

// --- GESTION DE LA BARRE DE RECHERCHE ---
const btnSuggerer = document.getElementById('btn-suggerer');
const inputRecherche = document.getElementById('recherche-jeu');

btnSuggerer.addEventListener('click', async () => {
    const nomJeu = inputRecherche.value.trim();
    if (!nomJeu) return;

    btnSuggerer.disabled = true;
    btnSuggerer.innerText = 'Recherche sur BGG...';

    try {
        // L'astuce anti-CORS : on passe par un relais gratuit (AllOrigins)
        // qui enveloppe la réponse de BGG dans un format autorisé par ton navigateur.
        const urlRecherche = `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodeURIComponent(nomJeu)}&exact=0`;
        const proxySearchUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(urlRecherche)}`;
        
        const searchRes = await fetch(proxySearchUrl);
        const searchData = await searchRes.json();
        const searchXml = searchData.contents; // Le vrai texte de BGG est caché ici !
        
        const idMatch = searchXml.match(/<item[^>]*id="(\d+)"/i);
        if (!idMatch) {
            alert("Jeu introuvable sur BoardGameGeek.");
            btnSuggerer.disabled = false;
            btnSuggerer.innerText = 'Suggérer';
            return;
        }
        const gameId = idMatch[1];

        // 2. Récupération des détails BGG via le même relais
        const urlDetails = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`;
        const proxyDetailsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(urlDetails)}`;
        
        const thingRes = await fetch(proxyDetailsUrl);
        const thingData = await thingRes.json();
        const thingXml = thingData.contents;

        // 3. Tri des informations
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

        btnSuggerer.innerText = 'Enregistrement Notion...';

        // 4. Envoi des données à Vercel
        const reponse = await fetch('/api/suggererJeu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nom: name,
                image: image,
                joueurs: joueurs,
                duree: duree,
                age: age,
                difficulte: difficulte,
                genre: genre
            })
        });

        if (reponse.ok) {
            inputRecherche.value = '';
            chargerJeux();
        } else {
            alert("Erreur lors de l'enregistrement dans la base de données.");
        }
    } catch (erreur) {
        console.error(erreur);
        alert("Erreur de connexion avec BoardGameGeek.");
    } finally {
        btnSuggerer.disabled = false;
        btnSuggerer.innerText = 'Suggérer';
    }
});

// Lancement au démarrage
chargerJeux();