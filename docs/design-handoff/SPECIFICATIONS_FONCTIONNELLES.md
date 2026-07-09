# Spécifications fonctionnelles — Kanji Game (V1)

Ce document répond aux points clarifiés avec l'utilisateur et sert de base d'implémentation pour Claude Code. Il complète le `README.md` (specs visuelles/UI).

## 1. Périmètre V1

Inclus :
- 2 mini-jeux : **Quiz Kanji** et **Écriture de kanji**
- Système de comptes (inscription/connexion, profil, statistiques)
- Parties solo et multijoueur (jusqu'à 8 joueurs), avec ou sans compte
- Sélection de niveau(x) JLPT (N5 à N1), multi-sélection possible
- Base de données pour les comptes, les parties/scores, et le référentiel kanji (avec traductions FR)

Explicitement hors V1 mais **à prévoir dans l'architecture** :
- Autres mini-jeux futurs (l'utilisateur en ajoutera la liste plus tard)
- Amélioration de la gestion de compte (ex : réinitialisation mot de passe, OAuth, avatars personnalisés, réglages de confidentialité)

→ Conséquence architecturale : les mini-jeux et le module de compte doivent être conçus comme des modules extensibles, pas comme du code figé (détails section 7).

## 2. Référentiel Kanji

**Source** : [kanjiapi.dev](https://kanjiapi.dev/) — API publique en lecture seule, réponses en anglais (meanings), lectures on'yomi/kun'yomi, numéro Jōyō, niveau JLPT (indirectement déductible ou à mapper — vérifier la couverture des ~2 136 kanji Jōyō avec regroupement des mots (`words`) associés à chaque kanji).

**Stratégie recommandée** : importer/synchroniser une fois (ou périodiquement) les données de kanjiapi.dev vers la base de données du projet, plutôt que d'appeler l'API à chaque affichage :
- Un kanji change rarement — pas besoin de temps réel sur ce référentiel.
- Permet de stocker la **traduction française** à côté (l'API externe ne la fournit pas).
- Évite une dépendance de disponibilité/latence sur un service tiers à chaque partie.

**Table `kanji`** (indicatif) :
- `id`, `character`, `jouyou_number`, `jlpt_level` (N5–N1), `onyomi[]`, `kunyomi[]`, `meanings_en[]` (brut API), `meanings_fr[]` (traduit), `translation_reviewed` (bool), `stroke_count`
- Table liée `kanji_word` (mot(s) dans lesquels le kanji apparaît, y compris le kanji seul comme mot) : `kanji_id`, `word`, `reading`, `meanings_en[]`, `meanings_fr[]`

**Traduction automatique (validée avec l'utilisateur)** :
- Se fait à l'import/synchronisation (pas à l'affichage), via une **API de traduction** (recommandé : DeepL API — meilleure qualité EN→FR que les alternatives gratuites, mais Google Cloud Translation reste une alternative viable si le coût DeepL est bloquant).
- Le résultat est stocké en base dans `meanings_fr[]`.
- Champ `translation_reviewed` : `false` par défaut, passe à `true` quand une traduction a été relue/corrigée manuellement. Prévoir une interface (même minimale, hors V1 UI grand public) permettant de lister les traductions non relues et de les corriger — au moins un endpoint back-office pour V1, une vraie UI pourra suivre.

## 3. Comptes utilisateurs

- **Sans compte (invité)** : peut jouer en solo ou rejoindre une partie multijoueur. **Aucune statistique n'est sauvegardée** — les scores de la partie en cours restent visibles jusqu'à la fermeture/actualisation de la page, puis sont perdus. Pas de migration invité → compte prévue en V1.
- **Avec compte** : email + mot de passe (l'OAuth pourra être ajouté plus tard, cf. section périmètre). Statistiques enregistrées : parties jouées, kanji maîtrisés (seuil à définir, ex : ≥80% de réussite cumulée sur un kanji), précision moyenne, série de jours consécutifs joués, progression par niveau JLPT, historique des parties (jeu, niveau, date, score).
- Un compte peut être host ou simple joueur dans une partie ; les invités aussi peuvent héberger une partie (le code/lien de partage ne nécessite pas de compte).

## 4. Parties & Lobby

**Création d'une partie** (l'hôte définit à la création) :
- Mini-jeu (Quiz Kanji ou Écriture de kanji)
- Niveau(x) JLPT — **multi-sélection obligatoire d'au moins 1 niveau**, plusieurs niveaux combinables (les kanji des niveaux sélectionnés sont mélangés dans le pool de questions)
- Nombre de questions/kanji : de 10 à 100 (pas défini, ex. par paliers de 10)
- Minuteur par question/tracé : **configurable par l'hôte, de 10 à 90 secondes**
- Nombre de joueurs max : 8 (fixe pour la V1)

**Partage** : à la création, le système génère **à la fois** :
- un **lien personnalisé** (ex. `kanji-game.fr/salon/quiz-yuki-8f2`), et
- un **code secret** court (ex. 6 caractères alphanumériques, `AB3F9K`) saisissable manuellement.

Les deux pointent vers le même salon.

**Déroulement du lobby** : les joueurs rejoignent (slot occupé avec avatar/pseudo), passent "prêt", l'hôte lance la partie quand au moins 2 joueurs sont prêts (règle à confirmer côté produit — 1 joueur = mode solo direct, pas de lobby nécessaire).

**Synchronisation en jeu — mode simultané** : à chaque question/kanji, tous les joueurs reçoivent le même contenu en même temps et répondent chacun à leur rythme, dans la limite du minuteur défini par l'hôte (comme un Kahoot). Quand le minuteur expire (ou que tous ont répondu), la manche suivante démarre pour tout le monde en même temps.

## 5. Mini-jeu : Quiz Kanji — règles

- Le kanji est affiché avec **toutes** ses lectures (on'yomi + kun'yomi) et sa signification correcte n'est PAS révélée à l'avance (c'est la question).
- 4 propositions de signification affichées, 1 seule correcte, 3 distracteurs (à tirer parmi les significations d'autres kanji du/des même(s) niveau(x) sélectionné(s), pour rester cohérent en difficulté).
- Nombre de questions : paramétrable par l'hôte/le joueur solo, de 10 à 100.
- Scoring : 1 point par bonne réponse (un bonus de rapidité pourra être envisagé plus tard mais n'est pas demandé pour la V1 — rester simple : score = nombre de bonnes réponses, ou pourcentage de réussite).
- Mode simultané en multijoueur avec minuteur commun (section 4).

## 6. Mini-jeu : Écriture de kanji — règles

C'est le point le plus technique. Règle validée avec l'utilisateur :

> **L'ordre des traits est le critère le plus important. Le reste (forme du tracé) est évalué par une reconnaissance automatique. Chaque tracé reçoit un pourcentage de réussite de 0 à 100%, et le score final du joueur est la moyenne de ces pourcentages sur l'ensemble des kanji de la partie.**

**Approche technique recommandée** : s'appuyer sur des **données de tracé de référence déjà existantes**, plutôt que de réinventer un moteur de reconnaissance de zéro.

- **KanjiVG** : jeu de données ouvert (licence CC BY-SA) qui décrit, pour chaque kanji, le tracé exact de chaque trait sous forme de chemins SVG, **dans l'ordre correct**. C'est la référence de facto pour ce genre de fonctionnalité.
- **HanziWriter** (bibliothèque JS open-source) : construite sur les données KanjiVG (fonctionne aussi bien pour les kanji japonais que les hanzi chinois). Elle propose un **mode "quiz" intégré** : l'utilisateur dessine sur un canvas, la librairie compare chaque trait dessiné au trait de référence attendu **dans l'ordre**, et renvoie une évaluation trait par trait (correspondance de forme + de sens du tracé + de position dans la séquence), avec possibilité de faire re-tenter un trait raté.

**Pourquoi cette approche plutôt que du "from-scratch"** (explication) :
- Un moteur de reconnaissance de tracé manuscrit fiable (OCR de caractère) est un projet de recherche à part entière (réseaux de neurones entraînés sur des dizaines de milliers d'exemples). Pour 2 136 kanji, il n'existe pas d'alternative réaliste à réinventer en interne pour une V1.
- KanjiVG + HanziWriter couvre déjà l'intégralité des kanji Jōyō avec des données de tracé fiables et gratuites, et gère nativement la contrainte "ordre des traits" demandée en priorité par l'utilisateur.

**Calcul du pourcentage** : à partir des résultats de comparaison trait par trait fournis par HanziWriter (traits corrects du premier coup vs. traits nécessitant plusieurs tentatives, erreurs d'ordre), définir une formule simple, ex : `score_kanji = (traits corrects au 1er essai / total des traits) × 100`, avec une pénalité si l'ordre a dû être corrigé. Le score de la manche/partie = moyenne des `score_kanji` sur tous les kanji joués.

**Zone de dessin** : reprendre le principe de la maquette (grille avec croix pointillée centrale, kanji de référence semi-transparent optionnel comme aide — à activer/désactiver selon le niveau de difficulté choisi, par ex. visible en N5 et masqué en N1).

## 7. Extensibilité — mini-jeux futurs & évolutions de compte

Pour que l'ajout d'un 3ᵉ mini-jeu (et les suivants) ne nécessite pas de réécrire le cœur de l'app :

- **Back-end** : modéliser chaque mini-jeu derrière une interface commune (ex. `GameMode`) exposant : génération d'une manche à partir d'un pool de kanji, validation/notation d'une réponse, calcul du score agrégé. Le lobby, le système de salons (code/lien, joueurs, minuteur) et le système de scoring/statistiques restent génériques et ne connaissent pas les détails internes de chaque mini-jeu.
- **Front-end** : un registre de mini-jeux (chaque mini-jeu = un module avec son propre écran de jeu), monté dynamiquement dans l'écran "en jeu" du salon selon le mode choisi au lobby.
- **Compte** : concevoir le module compte (auth, profil, stats) comme un service séparé du reste, pour pouvoir y ajouter facilement OAuth, avatars, préférences, etc. sans toucher aux mini-jeux.

## 8. Recommandation de stack technique (justifiée)

Stack de départ demandée par l'utilisateur : **React** (front) + **Java/Spring** (back). Cette stack est tout à fait adaptée à ce projet ; voici comment la compléter :

- **Front** : React (Vite ou Next.js selon les besoins de SEO sur les pages publiques comme l'accueil — Next.js apporte du rendu serveur utile pour le référencement de la landing, mais une SPA Vite suffit si le SEO n'est pas prioritaire).
- **Back** : Spring Boot, avec Spring Web (API REST) + Spring Data JPA pour la persistance.
- **Base de données** : **PostgreSQL** — relationnel, s'intègre naturellement avec Spring Data JPA, bien adapté à un modèle de données structuré (utilisateurs, parties, scores, référentiel kanji avec relations).

**Temps réel multijoueur — comparatif (demandé en mode "cours")** :

Le besoin : jusqu'à 8 joueurs dans un même salon doivent recevoir en direct la même question, voir les autres joueurs rejoindre/passer "prêt", et démarrer la manche suivante en même temps quand le minuteur commun expire. C'est un problème classique de **diffusion en temps réel à un groupe** (pub/sub), différent d'une simple requête HTTP classique (qui est "à la demande", pas "poussée" vers le client).

1. **WebSocket + STOMP (via `spring-boot-starter-websocket`)** — *recommandé*
   - Un WebSocket est une connexion **persistante et bidirectionnelle** entre le navigateur et le serveur (contrairement à HTTP où chaque requête ouvre puis referme une connexion). Le serveur peut donc "pousser" une info sans que le client la redemande.
   - STOMP est un protocole de messagerie simple posé au-dessus du WebSocket : il ajoute la notion de **canaux/topics** (ex. `/topic/salon/AB3F9K`) auxquels les clients s'abonnent. Le serveur publie un message sur ce topic (ex. "nouvelle question"), et tous les joueurs abonnés le reçoivent instantanément — exactement le modèle "diffusion à un groupe" dont on a besoin.
   - Avantage principal : reste **dans le même stack Spring** déjà choisi, pas de service tiers à gérer, contrôle total sur la logique de salon (le lobby, le minuteur commun, la validation des réponses, tout vit dans le même back-end Java).
   - Inconvénient à anticiper : si le site grossit beaucoup, faire tenir les WebSockets à l'échelle sur plusieurs instances serveur demande un peu plus de travail (ex. Redis comme relais de messages entre instances) — non bloquant pour une V1.

2. **Firebase Realtime Database / Firestore** — alternative rapide à mettre en place, mais duplique la logique métier entre Firebase (temps réel) et Spring (le reste de l'API), et introduit un vendor lock-in Google. Moins cohérent avec le choix Java/Spring déjà fait.

3. **Supabase Realtime** — même remarque : Supabase est surtout intéressant si on lui confie tout le backend (base + auth + temps réel) plutôt qu'en complément d'un backend Spring séparé.

→ **Conclusion** : WebSocket/STOMP avec Spring est le choix le plus cohérent ici, car il reste dans l'écosystème déjà choisi par l'utilisateur et couvre exactement le besoin (diffusion synchrone à un groupe de ≤8 joueurs par salon).

## 9. Points restant à trancher par le produit (non bloquants pour démarrer)

- Seuil exact pour qu'un kanji soit considéré "maîtrisé" dans les statistiques de profil.
- Comportement si un joueur quitte en cours de partie (remplacement du slot ? partie continue à N-1 joueurs ?).
- Règle exacte de lancement du lobby (nombre minimum de joueurs prêts).
- Distracteurs du Quiz : uniquement au sein des niveaux sélectionnés, ou pool élargi si trop peu de kanji sélectionnés (ex. moins de 4 kanji dans le niveau choisi) ?
