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

### Stats de profil réelles
- **Écran(s)** : Profil
- **Demande** : `ProfileScreen.tsx` affiche encore des stats mockées (`gamesPlayed`, `averageScore`, `perLevel` — voir `frontend/src/mocks/profile.ts`). Les calculer réellement côté backend à partir de `game_participant`/`game_answer`/`game_round`, agrégées par `user_id` (donc uniquement pour les comptes, pas les invités). La formule (métrique = précision en %) est déjà documentée au §4 de `docs/backend/SPECIFICATIONS_BACKEND.md`. **Important (demande explicite de Damien)** : calculer à la volée par requête SQL d'agrégation, pas en écrivant une ligne récapitulative supplémentaire en base à chaque partie. `objectiveLevel` est déjà branché sur le réel (`GET/PUT /api/profile/*`), seules les stats manquent.

### Édition du profil (pseudo, email, mot de passe)
- **Écran(s)** : Profil
- **Demande** : Aucun moyen de modifier son pseudo, son adresse e-mail ou son mot de passe une fois le compte créé. Ajouter les endpoints backend correspondants (actuellement seuls `GET/PUT /api/profile/objective-level` existent côté profil) et l'UI associée. Le bouton actuel de sélection du niveau JLPT (chips cliquables) était aussi jugé peu clair comme mécanisme de mise à jour — voir si un pattern d'édition plus explicite (bouton "Modifier" / mode édition) devrait s'appliquer à l'ensemble de la section, pas seulement au niveau JLPT.

### Réinitialisation de mot de passe par e-mail
- **Écran(s)** : Connexion
- **Demande** : Le lien "Mot de passe oublié ?" n'est pas fonctionnel (juste un `title` d'info-bulle). Nécessite l'envoi d'e-mails (choisir un service : SMTP classique, ou un fournisseur type Resend/SendGrid — aucun n'est configuré actuellement), un token de réinitialisation à durée de vie limitée côté backend, et un écran de saisie du nouveau mot de passe. Chantier plus lourd que les autres de cette liste (nouvelle dépendance externe + flux de sécurité complet) — probablement à traiter en dernier ou à cadrer avec Damien avant de commencer.

### Page "Mini-jeux"
- **Écran(s)** : global (nouvelle page) + navbar
- **Demande** : Le lien "Mini-jeux" de la navbar ne mène nulle part actuellement. Créer une page qui présente chaque mini-jeu (Quiz Kanji, Écriture de kanji) avec un petit explicatif, et un bouton "Jouer"/"Essayer" par jeu qui crée un salon (comme `PlayButton` actuel) mais préconfiguré sur le mini-jeu correspondant plutôt que sur Quiz par défaut. Réutiliser `components/PlayButton.tsx` en le rendant paramétrable sur `gameMode`, ou dupliquer sa logique.

### Page "Niveaux JLPT"
- **Écran(s)** : global (nouvelle page) + navbar + Accueil
- **Demande** : Le bouton "Voir les niveaux" de l'Accueil et le lien "Niveaux JLPT" de la navbar doivent mener vers une page dédiée présentant les 5 niveaux JLPT : liste des kanji à étudier par niveau, correspondance avec les niveaux européens (CECRL), petit explicatif par niveau. Les kanji par niveau sont disponibles via `GET /api/kanji?levels=...` (déjà utilisé ailleurs, ex. `frontend/src/lib/kanji.ts`). La correspondance CECRL n'existe nulle part dans le code actuel — à documenter/trouver la table de correspondance usuelle JLPT↔CECRL.

### Widget "Quiz Kanji" de la page d'accueil
- **Écran(s)** : Accueil
- **Demande** : L'encart de prévisualisation "QUIZ KANJI · Question 3/10" sur la page d'accueil (`HomeScreen.tsx`) ne correspond plus à la vraie interface du Quiz une fois celle-ci branchée sur le vrai moteur de jeu (mise en page, données figées/mockées via `mockKanjiPool`). Le mettre à jour pour refléter fidèlement `QuizScreen.tsx` tel qu'il existe réellement aujourd'hui.

### Navbar : responsive mobile + mise en avant du pseudo connecté
- **Écran(s)** : global (TopNav)
- **Demande** : Deux points distincts sur `components/TopNav.tsx` :
  1. Certains liens de la navbar (Accueil/Mini-jeux/Niveaux JLPT — actuellement de simples `<span>` non cliquables, voir CSS `.links { display: none }` sous 900px) sont invisibles sur mobile. Prévoir une vraie navigation responsive (menu hamburger ou équivalent).
  2. Une fois connecté, le pseudo actuel se noie visuellement parmi les autres liens de droite. Le mettre en évidence, ex. un message "Bonjour, `<pseudo>`" ou "Bienvenue, `<pseudo>`", pour qu'il soit clair immédiatement qu'on est bien connecté (remonté après un souci où une inscription réussie n'était pas assez visible dans l'UI).

---

## Traité

*(les entrées terminées sont déplacées ici, avec la date)*
