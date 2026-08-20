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
        // La NOUVEAUTÉ est ici : on récupère l'ID unique de la ligne dans Notion
        const idPage = jeu.id; 
        
        const nom = jeu.properties['Nom']?.title[0]?.plain_text || 'Jeu inconnu';
        const image = jeu.properties['Image']?.url || 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffaed?q=80&w=900&auto=format&fit=crop';
        const joueurs = jeu.properties['Joueurs']?.rich_text[0]?.plain_text || 'N/A';
        const duree = jeu.properties['Durée']?.rich_text[0]?.plain_text || 'N/A';
        const votes = jeu.properties['Votes']?.number || 0;

        const article = document.createElement('article');
        article.className = 'carte-jeu';
        article.innerHTML = `
            <img src="${image}" alt="${nom}" class="image-jeu">
            <div class="contenu-carte">
                <h2>${nom}</h2>
                <p class="details">👥 ${joueurs} joueurs | ⏳ ${duree} min</p>
                <!-- On cache l'ID et les votes actuels dans le bouton -->
                <button class="btn-vote" data-id="${idPage}" data-votes="${votes}">
                    ▲ Pour <span class="compteur">${votes}</span>
                </button>
            </div>
        `;
        main.appendChild(article);
    });

    // Une fois toutes les cartes créées, on active les boutons
    activerBoutonsVote();
}

// L'animation et l'envoi du vote à Notion
function activerBoutonsVote() {
    const boutonsVote = document.querySelectorAll('.btn-vote');
    
    boutonsVote.forEach(bouton => {
        bouton.addEventListener('click', async function() {
            // On empêche de spammer le bouton
            if (this.disabled) return;
            this.disabled = true;

            // On récupère les infos cachées dans le bouton
            const idPage = this.getAttribute('data-id');
            let votesActuels = parseInt(this.getAttribute('data-votes'));
            let nouveauxVotes = votesActuels + 1;

            // 1. On met à jour l'écran tout de suite pour l'utilisateur
            this.querySelector('.compteur').innerText = nouveauxVotes;
            this.setAttribute('data-votes', nouveauxVotes);
            this.style.backgroundColor = '#d1e7dd';
            this.style.borderColor = '#badbcc';
            this.style.color = '#0f5132';

            // 2. On envoie discrètement la mise à jour à Notion via notre pont
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

// Lancement au démarrage
chargerJeux();