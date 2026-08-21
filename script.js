// --- 1. CHARGEMENT INITIAL ---
document.addEventListener('DOMContentLoaded', () => {
    chargerJeux();

    // Gestion du formulaire de suggestion
    const form = document.querySelector('#form-suggestion');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.querySelector('#input-jeu');
            const btn = document.querySelector('#btn-suggerer');
            const nomJeu = input.value;

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
                    chargerJeux(); // Recharge la liste après ajout
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

// --- 3. AFFICHAGE DES CARTES ---
function afficherJeux(jeux) {
    const main = document.querySelector('main');
    main.innerHTML = ''; 

    // Liste des ID déjà votés par l'utilisateur
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
        // Le onerror sur l'image évite le clignotement si l'image Notion est inaccessible
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

            // Sauvegarde locale
            const jeuxVotes = JSON.parse(localStorage.getItem('jeux_votes_association') || '[]');
            jeuxVotes.push(idPage);
            localStorage.setItem('jeux_votes_association', JSON.stringify(jeuxVotes));

            try {
                await fetch('/api/ajouterVote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pageId: idPage, nouveauxVotes: nouveauxVotes })
                });
                
                // Rafraîchissement discret pour ré-ordonner la liste
                setTimeout(chargerJeux, 500);
            } catch (e) {
                console.error("Erreur vote :", e);
            }
        });
    });
}