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
        const age = jeu.properties['Âge']?.rich_text[0]?.plain_text || 'N/A';
        const difficulte = jeu.properties['Difficulté']?.rich_text[0]?.plain_text || 'N/A';
        const genre = jeu.properties['Genre']?.multi_select[0]?.name || 'Général';
        const votes = jeu.properties['Votes']?.number || 0;

        const article = document.createElement('article');
        article.className = 'carte-jeu';
        article.innerHTML = `
            <img src="${image}" alt="${nom}" class="image-jeu" onerror="this.src='https://images.unsplash.com/photo-1610890716171-6b1bb98ffaed?q=80&w=900&auto=format&fit=crop'">
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
    const nomSaisi = inputRecherche.value.trim();
    if (!nomSaisi) return;

    btnSuggerer.disabled = true;
    btnSuggerer.innerText = 'Recherche en cours...';

    // On initialise avec des valeurs neutres et vides (plus de faux 2-4 joueurs partout)
    let nom = nomSaisi;
    let image = "https://images.unsplash.com/photo-1610890716171-6b1bb98ffaed?q=80&w=900&auto=format&fit=crop";
    let joueurs = "2-4";
    let duree = "Inconnue";
    let age = "Tout âge";
    let difficulte = "N/A";
    let genre = "Général";

    try {
        const searchUrl = `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodeURIComponent(nomSaisi)}&exact=0`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;
        
        const res = await fetch(proxyUrl);
        const data = await res.json();
        
        if (data && data.contents) {
            const idMatch = data.contents.match(/<item[^>]*id="(\d+)"/i);
            if (idMatch) {
                const gameId = idMatch[1];
                const detailsUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`;
                const proxyDetailsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(detailsUrl)}`;
                
                const detRes = await fetch(proxyDetailsUrl);
                const detData = await detRes.json();
                
                if (detData && detData.contents) {
                    const xml = detData.contents;
                    const nameMatch = xml.match(/<name type="primary"[^>]*value="([^"]+)"/i);
                    if (nameMatch) nom = nameMatch[1];
                    
                    const imageMatch = xml.match(/<image>(.*?)<\/image>/i);
                    if (imageMatch) image = imageMatch[1];

                    const minp = xml.match(/<minplayers[^>]*value="(\d+)"/i);
                    const maxp = xml.match(/<maxplayers[^>]*value="(\d+)"/i);
                    if (minp && maxp) joueurs = `${minp[1]}-${maxp[1]}`;

                    const time = xml.match(/<playingtime[^>]*value="(\d+)"/i);
                    if (time) duree = time[1];

                    const minage = xml.match(/<minage[^>]*value="(\d+)"/i);
                    if (minage) age = minage[1] + "+";

                    const weight = xml.match(/<averageweight[^>]*value="([\d.]+)"/i);
                    if (weight) difficulte = parseFloat(weight[1]).toFixed(1) + "/5";

                    const cat = xml.match(/<link type="boardgamecategory"[^>]*value="([^"]+)"/i);
                    if (cat) genre = cat[1];
                }
            }
        }
    } catch (e) {
        console.log("Erreur lors de la récupération BGG, utilisation des valeurs de base.");
    }

    btnSuggerer.innerText = 'Enregistrement...';

    // Envoi final à Vercel pour Notion
    try {
        const reponse = await fetch('/api/suggererJeu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom, image, joueurs, duree, age, difficulte, genre })
        });

        if (reponse.ok) {
            inputRecherche.value = '';
            chargerJeux(); 
        } else {
            const erreurDétail = await reponse.text();
            alert("Erreur Notion : " + erreurDétail);
        }
    } catch (err) {
        alert("Erreur de connexion.");
    } finally {
        btnSuggerer.disabled = false;
        btnSuggerer.innerText = 'Suggérer';
    }
});

// Lancement au démarrage
chargerJeux();