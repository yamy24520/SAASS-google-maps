# Collecteur Reputix — prototype local

1. Décompressez cette archive dans un dossier permanent.
2. Dans Chrome, ouvrez chrome://extensions, activez le mode développeur puis « Charger l'extension non empaquetée ». Sélectionnez ce dossier.
3. Connectez-vous normalement à Google Maps dans Chrome. Aucun mot de passe ou cookie n'est transmis à Reputix par le collecteur.
4. Ouvrez un établissement puis son onglet Avis. Cliquez sur l'extension et lancez la collecte.
5. Gardez l'onglet ouvert. Le collecteur défile, développe les textes et récupère les liens de partage des avis. Il ne publie aucune réponse.
6. Le fichier JSON est téléchargé à la fin. Importez-le dans Reputix, rubrique Avis ou Réputation.

La collecte indique son motif d'arrêt et le nombre réellement récupéré. Elle peut être partielle (connexion requise, changement de page, absence de nouveaux éléments, délai de 30 minutes). Aucun contournement de CAPTCHA, aucun proxy ni API de scraping.
Les dates relatives affichées par Google sont conservées telles quelles ; l'heure de collecte ne doit pas être interprétée comme la date de publication.
Chaque fiche dispose de son propre identifiant Maps et de ses avis. Un import répété actualise les réponses du propriétaire sans effacer les brouillons IA.
Pour répondre : générer un brouillon dans Reputix, copier puis ouvrir le lien de l'avis. La publication finale se fait manuellement dans Google avec les droits nécessaires.

Ce prototype est lancé par l'utilisateur dans Chrome. Il ne tourne pas automatiquement sur Vercel. Une collecte interrompue conserve les avis déjà parcourus ; utiliser « Exporter maintenant » avant de fermer la page.

## Mode script (sans extension)
Le test sans connexion a récupéré 5 avis sur 1 158 pour Le Saint James. La collecte complète n'est pas validée. Google peut refuser la connexion dans la fenêtre automatisée : dans ce cas, arrêtez cette tentative ; le collecteur ne contourne pas ce blocage.

Dans ce dossier :

    npm install
    node collect.mjs --login

Connectez-vous dans la fenêtre Edge ouverte puis fermez-la. Ensuite :

    node collect.mjs --query "Le Saint James Bergerac" --output ./exports/saint-james.json

Le nom doit identifier une fiche unique. Sinon, le script s'arrête et demande de préciser la recherche. Il conserve la session Google uniquement dans .browser-profile (ne jamais publier ce dossier). Une reconnexion peut être nécessaire si Google expire la session.
Le code de sortie 2 signifie collecte partielle ; 1 signifie erreur ; 0 signifie que le nombre collecté atteint le total annoncé. Cela ne constitue pas une garantie d'exhaustivité de Google.
