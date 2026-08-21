// --- 1. CHARGEMENT INITIAL ET FORMULAIRE DE SUGGESTION ---
document.addEventListener('DOMContentLoaded', () => {
    chargerJeux();

    const btn = document.querySelector('#btn-suggerer');
    const inputJeu = document.querySelector('#recherche-jeu');

    if (btn && inputJeu) {
        btn.addEventListener('click', async () => {
            const nomJeu = inputJeu.value.trim();
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
                    inputJeu.value = '';
                    chargerJeux(); 
                } else if (res.status === 409) {
                    alert("Ce jeu est déjà présent dans la liste des suggestions ! Vous pouvez voter pour lui directement.");
                    inputJeu.value = '';
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
    if (!main) return;
    main.innerHTML = ''; 

    const jeuxVotes = JSON.parse(localStorage.getItem('jeux_votes_association') || '[]');

    jeux.forEach(jeu => {
        const idPage = jeu.id; 
        
        const nom = jeu.properties['Nom']?.title[0]?.plain_text || 'Jeu inconnu';
        const description = jeu.properties['Description']?.rich_text[0]?.plain_text || '';
        const imageURL = jeu.properties['Image']?.url || ''; 
        const joueurs = jeu.properties['Joueurs']?.rich_text[0]?.plain_text || 'N/A';
        const duree = jeu.properties['Durée']?.rich_text[0]?.plain_text || 'N/A';
        const age = jeu.properties['Âge']?.rich_text[0]?.plain_text || 'N/A';
        const difficulte = jeu.properties['Difficulté']?.rich_text[0]?.plain_text || 'N/A';
        const genre = jeu.properties['Genre']?.multi_select[0]?.name || 'Général';
        const votes = jeu.properties['Votes']?.number || 0;

        const dejaVote = jeuxVotes.includes(idPage);

        const article = document.createElement('article');
        article.className = 'carte-jeu';

        let elementVisuel = '';
        if (imageURL) {
            elementVisuel = `<img src="${imageURL}" alt="${nom}" style="width: 100%; height: 180px; object-fit: contain; background-color: #f8fafc; border-top-left-radius: 8px; border-top-right-radius: 8px;">`;
        }

        // Style dynamique du bouton selon si on a déjà voté ou non
        const styleBouton = dejaVote 
            ? 'background-color: #d1e7dd; border-color: #badbcc; color: #0f5132;' 
            : 'background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;';

        article.innerHTML = `
            ${elementVisuel}
            <div class="contenu-carte" style="padding: 20px;">
                <span style="background: #e2e8f0; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; color: #475569;">${genre}</span>
                <h2 style="margin-top: 10px; margin-bottom: 8px;">${nom}</h2>
                
                <p style="font-size: 14px; color: #4b5563; font-style: italic; margin-bottom: 12px; line-height: 1.4;">"${description}"</p>

                <p class="details" style="margin-bottom: 5px; font-size: 13px;">👥 ${joueurs} | ⏳ ${duree}</p>
                <p class="details" style="font-size: 13px; margin-bottom: 15px;">👶 ${age} | 🧠 Diff: ${difficulte}</p>
                
                <button class="btn-vote" data-id="${idPage}" data-votes="${votes}" style="cursor: pointer; padding: 8px 16px; border-radius: 6px; font-weight: bold; width: 100%; transition: all 0.2s; ${styleBouton}">
                    ▲ ${dejaVote ? 'Déjà voté' : 'Pour'} <span class="compteur">${votes}</span>
                </button>
            </div>
        `;
        main.appendChild(article);
    });

    activerBoutonsVote();
}

// --- 4. GESTION DES VOTES (Ajout / Retrait réversible) ---
function activerBoutonsVote() {
    document.querySelectorAll('.btn-vote').forEach(bouton => {
        bouton.addEventListener('click', async function() {
            const idPage = this.getAttribute('data-id');
            let votesActuels = parseInt(this.getAttribute('data-votes'));
            
            let jeuxVotes = JSON.parse(localStorage.getItem('jeux_votes_association') || '[]');
            let dejaVote = jeuxVotes.includes(idPage);

            let nouveauxVotes;

            if (dejaVote) {
                // Si on a déjà voté, un clic annule le vote
                nouveauxVotes = Math.max(0, votesActuels - 1);
                jeuxVotes = jeuxVotes.filter(id => id !== idPage); // Retire l'ID du stockage local
            } else {
                // Sinon, on ajoute le vote
                nouveauxVotes = votesActuels + 1;
                jeuxVotes.push(idPage); // Ajoute l'ID au stockage local
            }

            // Met à jour la liste dans le navigateur
            localStorage.setItem('jeux_votes_association', JSON.stringify(jeuxVotes));

            // Mise à jour visuelle immédiate du bouton
            const nouveauDejaVote = jeuxVotes.includes(idPage);
            this.setAttribute('data-votes', nouveauxVotes);
            this.innerHTML = `▲ ${nouveauDejaVote ? 'Déjà voté' : 'Pour'} <span class="compteur">${nouveauxVotes}</span>`;
            
            if (nouveauDejaVote) {
                this.style.backgroundColor = '#d1e7dd';
                this.style.borderColor = '#badbcc';
                this.style.color = '#0f5132';
            } else {
                this.style.backgroundColor = '#f1f5f9';
                this.style.borderColor = '#cbd5e1';
                this.style.color = '#334155';
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