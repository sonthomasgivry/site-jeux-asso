// --- 4. GESTION DU BOUTON SUGGÉRER ---
const btnSuggerer = document.getElementById('btn-suggerer');
const inputRecherche = document.getElementById('recherche-jeu');

if (btnSuggerer && inputRecherche) {
    btnSuggerer.addEventListener('click', async () => {
        const nomSaisi = inputRecherche.value.trim();
        if (!nomSaisi) return;

        btnSuggerer.disabled = true;
        btnSuggerer.innerText = 'Création par l\'IA en cours...';

        try {
            // On envoie juste le nom tapé au serveur Vercel. Il s'occupe de tout le reste !
            const reponse = await fetch('/api/suggererJeu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nom: nomSaisi })
            });

            if (reponse.ok) {
                inputRecherche.value = '';
                await chargerJeux(); // On recharge la grille
            } else {
                alert("Erreur lors de la création du jeu.");
            }
        } catch (err) {
            alert("Erreur de connexion au serveur.");
        } finally {
            btnSuggerer.disabled = false;
            btnSuggerer.innerText = 'Suggérer';
        }
    });
}