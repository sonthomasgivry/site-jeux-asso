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
    main.innerHTML = ''; // On vide les fausses cartes du HTML

    jeux.forEach(jeu => {
        // On récupère les infos depuis les colonnes Notion
        // Attention : il faut que les noms des colonnes soient EXACTEMENT les mêmes
        const nom = jeu.properties['Nom']?.title[0]?.plain_text || 'Jeu inconnu';
        const image = jeu.properties['Image']?.url || 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffaed?q=80&w=900&auto=format&fit=crop';
        const joueurs = jeu.properties['Joueurs']?.rich_text[0]?.plain_text || 'N/A';
        const duree = jeu.properties['Durée']?.rich_text[0]?.plain_text || 'N/A';
        const votes = jeu.properties['Votes']?.number || 0;

        // On fabrique la carte en HTML
        const article = document.createElement('article');
        article.className = 'carte-jeu';
        article.innerHTML = `
            <img src="${image}" alt="${nom}" class="image-jeu">
            <div class="contenu-carte">
                <h2>${nom}</h2>
                <p class="details">👥 ${joueurs} joueurs | ⏳ ${duree} min</p>
                <button class="btn-vote">
                    ▲ Pour <span class="compteur">${votes}</span>
                </button>
            </div>
        `;
        main.appendChild(article);
    });
}

// On lance le chargement au démarrage de la page
chargerJeux();