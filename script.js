// --- 1. CHARGEMENT DES JEUX (au démarrage) ---
async function chargerJeux() {
    try {
        const res = await fetch('/api/getJeux');
        const jeux = await res.json();
        afficherJeux(jeux);
    } catch (e) {
        console.error("Erreur chargement jeux", e);
    }
}

// --- 2. AFFICHAGE DES CARTES ---
function afficherJeux(jeux) {
    const main = document.querySelector('main');
    main.innerHTML = ''; 

    // Récupère la liste des jeux déjà votés par cet utilisateur sur son navigateur
    const jeuxVotes = JSON.parse(localStorage.getItem('jeux_votes_association') || '[]');

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

        const dejaVote = jeuxVotes.includes(idPage);

        const article = document.createElement('article');
        article.className = 'carte-jeu';
        article.innerHTML = `
            <img src="${image}" alt="${nom}" class="image-jeu" onerror="this.src='https://images.unsplash.com/photo-1610890716171-6b1bb98ffaed?q=80&w=900&auto=format&fit=crop'">
            <div class="contenu-carte">
                <span style="background: #e2e8f0; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; color: #475569;">${genre}</span>
                <h2 style="margin-top: 10px; margin-bottom: 5px;">${nom}</h2>
                <p class="details" style="margin-bottom: 5px;">👥 ${joueurs} | ⏳ ${duree}</p>
                <p class="details">👶 ${age} | 🧠 Diff: ${difficulte}</p>
                <button class="btn-vote" data-id="${idPage}" data-votes="${votes}" ${dejaVote ? 'disabled style="background-color: #d1e7dd; border-color: #badbcc; color: #0f5132; cursor: not-allowed;"' : ''}>
                    ▲ ${dejaVote ? 'Déjà voté' : 'Pour'} <span class="compteur">${votes}</span>
                </button>
            </div>
        `;
        main.appendChild(article);
    });

    activerBoutonsVote();
}

// --- 3. GESTION DES VOTES & ANTI-SPAM ---
function activerBoutonsVote() {
    const boutonsVote = document.querySelectorAll('.btn-vote');
    boutonsVote.forEach(bouton => {
        if (bouton.disabled) return;

        bouton.addEventListener('click', async function() {
            this.disabled = true;

            const idPage = this.getAttribute('data-id');
            let votesActuels = parseInt(this.getAttribute('data-votes'));
            let nouveauxVotes = votesActuels + 1;

            // Mise à jour visuelle immédiate
            this.innerHTML = `▲ Déjà voté <span class="compteur">${nouveauxVotes}</span>`;
            this.setAttribute('data-votes', nouveauxVotes);
            this.style.backgroundColor = '#d1e7dd';
            this.style.borderColor = '#badbcc';
            this.style.color = '#0f5132';
            this.style.cursor = 'not-allowed';

            // Enregistrement dans le navigateur pour bloquer les futurs clics
            const jeuxVotes = JSON.parse(localStorage.getItem('jeux_votes_association') || '[]');
            if (!jeuxVotes.includes(idPage)) {
                jeuxVotes.push(idPage);
                localStorage.setItem('jeux_votes_association', JSON.stringify(jeuxVotes));
            }

            try {
                await fetch('/api/ajouterVote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pageId: idPage, nouveauxVotes: nouveauxVotes })
                });
                
                // Rechargement discret pour trier la liste selon le nouveau score
                setTimeout(() => {
                    chargerJeux();
                }, 500);

            } catch (erreur) {
                console.error("Erreur d'enregistrement du vote", erreur);
            }
        });
    });
}

// Lancement au chargement de la page
document.addEventListener('DOMContentLoaded', chargerJeux);