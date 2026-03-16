document.addEventListener('DOMContentLoaded', async () => {
    const loading = document.getElementById('loading');
    const votingSection = document.getElementById('voting-section');
    const finishedSection = document.getElementById('finished-section');
    const categoryName = document.getElementById('category-name');
    const nomineesList = document.getElementById('nominees-list');
    const message = document.getElementById('message');

    let currentCategories = [];
    let currentIndex = 0;

    async function loadCategories() {
        try {
            const resp = await fetch('/api/categories');
            currentCategories = await resp.json();
            
            if (currentCategories.length === 0) {
                loading.textContent = "Aucune catégorie active pour le moment.";
                return;
            }

            await showNextCategory();
        } catch (err) {
            console.error(err);
            loading.textContent = "Erreur lors du chargement des catégories.";
        }
    }

    async function showNextCategory() {
        if (currentIndex >= currentCategories.length) {
            votingSection.classList.add('hidden');
            finishedSection.classList.remove('hidden');
            return;
        }

        const category = currentCategories[currentIndex];
        
        try {
            const resp = await fetch(`/api/categories/${category.id}/nominees`);
            const { nominees, alreadyVoted } = await resp.json();

            if (alreadyVoted) {
                currentIndex++;
                showNextCategory();
                return;
            }

            loading.classList.add('hidden');
            votingSection.classList.remove('hidden');
            categoryName.textContent = category.name;
            nomineesList.innerHTML = '';

            nominees.forEach(nominee => {
                const card = document.createElement('div');
                card.className = 'nominee-card fade-in';
                card.innerHTML = `<div class="nominee-name">${nominee.name}</div>`;
                card.onclick = () => vote(category.id, nominee.id);
                nomineesList.appendChild(card);
            });
        } catch (err) {
            console.error(err);
            message.textContent = "Erreur de chargement des nominés.";
        }
    }

    async function vote(categoryId, nomineeId) {
        try {
            const resp = await fetch('/api/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryId, nomineeId })
            });

            if (resp.ok) {
                currentIndex++;
                votingSection.classList.add('hidden');
                setTimeout(showNextCategory, 300);
            } else {
                const data = await resp.json();
                message.textContent = data.error || "Une erreur est survenue.";
            }
        } catch (err) {
            console.error(err);
            message.textContent = "Erreur lors du vote.";
        }
    }

    loadCategories();
});
