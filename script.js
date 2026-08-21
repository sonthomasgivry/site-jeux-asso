// --- 1. CHARGEMENT INITIAL ET FORMULAIRE DE SUGGESTION ---
document.addEventListener('DOMContentLoaded', () => {
    chargerJeux();

    const btn = document.querySelector('#btn-suggerer');
    const input = document.querySelector('#recherche-jeu');

    if (btn && input) {
        btn.addEventListener('click', async () => {
            const nomJeu = input.value.trim();
            if (!nomJeu) return;

            btn.innerText = "Recherche en cours...";
            btn.disabled = true;

            try {
                const res = await fetch('/api/suggererJeu', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nom: nomJeu })
                });
                
                if (res.ok) {
                    input.value = '';
                    chargerJeux(); // Recharge la liste des jeux
                } else if (res.status === 409) {
                    alert("Ce jeu est déjà présent dans la liste des suggestions ! Vous pouvez voter pour lui directement.");
                    input.value = '';
                } else {
                    alert("Erreur lors de l'ajout du jeu.");
                }
            } catch (err) {
                console.error("Erreur suggestion :", err);
            } finally {
                btn.innerText = "Suggérer";
                btn.disabled = false;
            }
        });
    }
});

// --- 2. RÉCUPÉRATION DES JEUX (Triés par Notion) ---
async function chargerJeux() {
    try {
        const res = await fetch('/api/getJeux');
        const jeux = await res.json();
        afficherJeux(jeux);
    } catch (e) {
        console.error("Erreur chargement jeux", e);
    }
}

// --- 3. AFFICHAGE DES CARTES (Avec Description IA) ---
function afficherJeux(jeux) {
    const main = document.querySelector('main');
    if (!main) return;
    main.innerHTML = ''; 

    // Liste des ID déjà votés par l'utilisateur (Anti-spam)
    const jeuxVotes = JSON.parse(localStorage.getItem('jeux_votes_association') || '[]');

    jeux.forEach(jeu => {
        const idPage = jeu.id; 
        
        const nom = jeu.properties['Nom']?.title[0]?.plain_text || 'Jeu inconnu';
        const description = jeu.properties['Description']?.rich_text[0]?.plain_text || 'Aucune description disponible.';
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
            <div class="contenu-carte" style="padding: 20px;">
                <span style="background: #e2e8f0; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; color: #475569;">${genre}</span>
                <h2 style="margin-top: 10px; margin-bottom: 8px;">${nom}</h2>
                <p style="font-size: 14px; color: #4b5563; font-style: italic; margin-bottom: 12px; line-height: 1.4;">"${description}"</p>
                <p class="details" style="margin-bottom: 5px; font-size: 13px;">👥 ${joueurs} | ⏳ ${duree}</p>
                <p class="details" style="font-size: 13px; margin-bottom: 15px;">👶 ${age} | 🧠 Diff: ${difficulte}</p>
                <button class="btn-vote" data-id="${idPage}" data-votes="${votes}" ${dejaVote ? 'disabled style="background-color: #d1e7dd; border-color: #badbcc; color: #0f5132; cursor: not-allowed;"' : ''}>
                    ▲ ${dejaVote ? 'Déjà voté' : 'Pour'} <span class="compteur">${votes}</span>
                </button>
            </div>
        `;
        main.appendChild(article);
    });

    activerBoutonsVote();
}

// --- 4. GESTION DES VOTES (Anti-spam) ---
function activerBoutonsVote() {
    document.querySelectorAll('.btn-vote').forEach(bouton => {
        if (bouton.disabled) return;

        bouton.addEventListener('click', async function() {
            this.disabled = true;

            const idPage = this.getAttribute('data-id');
            let votesActuels = parseInt(this.getAttribute('data-votes'));
            let nouveauxVotes = votesActuels + 1;

            // Mise à jour visuelle immédiate
            this.innerHTML = `▲ Déjà voté <span class="compteur">${nouveauxVotes}</span>`;
            this.style.backgroundColor = '#d1e7dd';
            this.style.color = '#0f5132';
            this.style.cursor = 'not-allowed';

            // Sauvegarde locale pour l'anti-spam
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
                
                // Rafraîchissement discret pour trier la liste selon le nouveau score
                setTimeout(chargerJeux, 500);
            } catch (e) {
                console.error("Erreur vote :", e);
            }
        });
    });
}