// --- 1. CHARGEMENT DES JEUX ---
async function chargerJeux() {
    const main = document.querySelector('main');
    main.innerHTML = '<p style="text-align: center; width: 100%; color: #666;">⏳ Chargement des jeux suggérés...</p>';
    
    try {
        const reponse = await fetch('/api/getJeux');
        if (!reponse.ok) throw new Error("Erreur réseau");
        
        const jeux = await reponse.json();
        
        if (!Array.isArray(jeux) || jeux.length === 0) {
            main.innerHTML = '<p style="text-align:center; width: 100%; padding: 20px;">Aucun jeu pour le moment. Fais une suggestion !</p>';
            return;
        }
        
        afficherJeux(jeux);
    } catch (erreur) {
        console.error("Erreur lors du chargement des jeux", erreur);
        main.innerHTML = '<p style="text-align:center; width: 100%; padding: 20px; color: red;">Erreur de chargement des jeux depuis Notion.</p>';
    }
}

// --- 2. AFFICHAGE DES CARTES ---
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

// --- 3. GESTION DES VOTES ---
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

// --- 4. GESTION DE LA BARRE DE RECHERCHE ET DU BOUTON SUGGESTION ---
const btnSuggerer = document.getElementById('btn-suggerer');
const inputRecherche = document.getElementById('recherche-jeu');

if (btnSuggerer && inputRecherche) {
    btnSuggerer.addEventListener('click', async () => {
        const nomSaisi = inputRecherche.value.trim();
        if (!nomSaisi) return;

        btnSuggerer.disabled = true;
        btnSuggerer.innerText = 'Recherche & Ajout...';

        try {
            const reponse = await fetch('/api/suggererJeu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nom: nomSaisi })
            });

            if (reponse.ok) {
                inputRecherche.value = '';
                chargerJeux(); // Recharge la grille proprement
            } else {
                const err = await reponse.json();
                alert("Erreur : " + (err.error || "Inconnue"));
            }
        } catch (err) {
            alert("Erreur de connexion.");
        } finally {
            btnSuggerer.disabled = false;
            btnSuggerer.innerText = 'Suggérer';
        }
    });
}

// --- 5. LANCEMENT AU DÉMARRAGE ---
chargerJeux();