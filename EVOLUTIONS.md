# Évolutions & corrections — Frontend Kanji Game

Ce document sert de file d'attente pour les demandes d'évolution et de correction sur le frontend (`frontend/`), à traiter dans une session Claude Code dédiée, séparée de celle qui gère le backend (`docs/backend/SPECIFICATIONS_BACKEND.md`).

## Comment ça fonctionne

**Pour Damien :**
Ajouter une nouvelle entrée sous **"À traiter"**, avec le gabarit ci-dessous. Pas besoin d'être exhaustif ou technique — une description en langage courant de ce qui ne va pas ou de ce qui manque suffit, avec l'écran concerné si possible.

**Pour la session Claude Code qui traite ce fichier :**
1. Lire toutes les entrées sous "À traiter", des plus anciennes aux plus récentes (ordre chronologique = ordre de priorité par défaut, sauf indication contraire de Damien).
2. Pour chaque entrée : comprendre la demande, l'implémenter, **vérifier dans le navigateur** (serveur de dev + Browser pane) avant de considérer que c'est fait — c'est la méthode de travail suivie sur tout ce projet jusqu'ici : construire, tester soi-même, puis proposer au Product Owner.
3. Une fois qu'une entrée a été implémentée et vérifiée, la déplacer de "À traiter" vers "Traité", en ajoutant la date et une ligne résumant ce qui a été fait (pas besoin de détailler le code, juste le résultat côté produit).
4. Committer/pousser au fur et à mesure (une entrée = un commit, comme le reste de l'historique du repo), pas tout d'un coup à la fin.
5. Si une demande est ambiguë ou impacte une décision produit déjà actée (ex. contredit un choix validé précédemment), le signaler à Damien avant d'implémenter plutôt que de deviner.

## Gabarit d'entrée

```
### [Titre court]
- **Écran(s)** : Accueil / Connexion / Lobby / Quiz / Écriture / Résultats / Profil / global
- **Demande** : description de ce qui doit changer

```

---

## À traiter

*(entrées ci-dessous ajoutées le 2026-07-13, suite à deux rounds de tests post-intégration de Damien sur `docs/test-after-integration/TESTS_AFTER_INTEGRATION.txt` — les bugs de ce fichier ont déjà été corrigés, seules les vraies évolutions/nouvelles fonctionnalités restent ici. Lire `docs/backend/FRONTEND_INTEGRATION.md` d'abord pour l'état exact de l'API et du frontend au moment de la rédaction.)*

### Navbar : responsive mobile + mise en avant du pseudo connecté
- **Écran(s)** : global (TopNav)
- **Demande** : Deux points distincts sur `components/TopNav.tsx` :
  1. Certains liens de la navbar (Accueil/Mini-jeux/Niveaux JLPT — actuellement de simples `<span>` non cliquables, voir CSS `.links { display: none }` sous 900px) sont invisibles sur mobile. Prévoir une vraie navigation responsive (menu hamburger ou équivalent).
  2. Une fois connecté, le pseudo actuel se noie visuellement parmi les autres liens de droite. Le mettre en évidence, ex. un message "Bonjour, `<pseudo>`" ou "Bienvenue, `<pseudo>`", pour qu'il soit clair immédiatement qu'on est bien connecté (remonté après un souci où une inscription réussie n'était pas assez visible dans l'UI).

---

## Traité

*(les entrées terminées sont déplacées ici, avec la date)*

### Widget "Quiz Kanji" de la page d'accueil — 2026-07-14
- **Écran(s)** : Accueil
- **Résultat** : l'encart de prévisualisation de `HomeScreen.tsx` reflète désormais la vraie structure de `QuizScreen.tsx` : progression "Question 3 / 10" avec barre, encarts TEMPS RESTANT/SCORE, lectures on/kun côte à côte, et le vrai libellé de question ("Quelle est la bonne signification ?") — au lieu de l'ancien format figé qui ne correspondait plus au moteur de jeu réel.

### Page "Niveaux JLPT" — 2026-07-14
- **Écran(s)** : global (nouvelle page) + navbar + Accueil
- **Résultat** : nouvelle page `/niveaux-jlpt` avec, par niveau, la correspondance CECRL indicative (N5→A1 … N1→C1, table usuelle documentée dans le code — le JLPT n'a pas de correspondance officielle), un court explicatif, et la liste complète des kanji du niveau chargée à la demande via `GET /api/kanji?levels=...` (accordéon, un seul niveau ouvert à la fois — testé y compris sur N1/1161 kanji). Lien navbar et bouton "Voir les niveaux" de l'Accueil pointent désormais vers cette page. Corrigé au passage : le lien "Accueil" de la navbar n'était pas cliquable sur aucune page (bug signalé par Damien pendant la validation).

### Page "Mini-jeux" — 2026-07-14
- **Écran(s)** : global (nouvelle page) + navbar
- **Résultat** : nouvelle page `/mini-jeux` avec une carte par mini-jeu (Quiz Kanji, Écriture de kanji), explicatif court, bouton "Essayer" par jeu qui crée un salon préconfiguré sur le bon mode. `components/PlayButton.tsx` rendu paramétrable sur `gameMode` (réutilisé, pas dupliqué). Lien "Mini-jeux" de la navbar rendu cliquable (les liens "Accueil"/"Niveaux JLPT" restent à traiter avec la refonte responsive de la navbar).

### Réinitialisation de mot de passe par e-mail — 2026-07-14
- **Écran(s)** : Connexion
- **Résultat** : lien "Mot de passe oublié ?" fonctionnel, deux nouveaux écrans (`/mot-de-passe-oublie`, `/reinitialiser-mot-de-passe`). Backend : `POST /api/auth/forgot-password` / `POST /api/auth/reset-password`, table `password_reset_token` (token à usage unique, valable 1h), envoi via l'API Resend (`ResendEmailSender`) — sans clé configurée, le lien est simplement loggé au lieu d'échouer, pour ne pas bloquer le dev local. Anti-énumération : même réponse générique que l'email existe ou non. Testé de bout en bout avec la vraie clé Resend de Damien (email réel reçu et confirmé).

### Édition du profil (pseudo, email, mot de passe) — 2026-07-14
- **Écran(s)** : Profil
- **Résultat** : nouvel endpoint `PUT /api/profile` (pseudo, email, mot de passe actuel obligatoire pour confirmer, nouveau mot de passe optionnel), avec contrôle d'unicité et réémission d'un JWT si l'email change. Côté UI, un bouton "Modifier" unique bascule toute la section profil (pseudo, email, mot de passe, objectif JLPT) en mode édition avec Enregistrer/Annuler, remplaçant les chips JLPT cliquables en instantané (gardées telles quelles pour les invités, qui n'ont pas de compte à éditer).

### Stats de profil réelles — 2026-07-14
- **Écran(s)** : Profil
- **Résultat** : `GET /api/profile/me` (et `PUT /api/profile/objective-level`) renvoient désormais `gamesPlayed`, `averageScore` et `perLevel` calculés à la volée par agrégation SQL sur `game_answer`/`game_round`/`kanji` (précision % comme métrique commune Quiz/Écriture), plus `memberSince` réel. `ProfileScreen.tsx` affiche ces vraies valeurs ; les invités (sans compte) voient un message explicite plutôt que des stats inventées. `frontend/src/mocks/profile.ts` supprimé.
