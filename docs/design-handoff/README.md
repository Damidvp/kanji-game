# Handoff : Kanji Game — plateforme de mini-jeux d'apprentissage des kanji

## Aperçu

Kanji Game (domaine visé : `kanji-game.fr`) est une plateforme web permettant à des apprenants francophones du japonais de réviser les 2 136 kanji Jōyō (classés par niveau JLPT, N5 à N1) via des mini-jeux, jouables seul ou à plusieurs (jusqu'à 8 joueurs). La V1 couvre deux mini-jeux (Quiz Kanji, Écriture de kanji), un système de comptes, et une architecture pensée pour accueillir facilement de futurs mini-jeux.

Ce dossier contient :
- Ce README (vue d'ensemble + specs UI/design)
- `SPECIFICATIONS_FONCTIONNELLES.md` — le détail des règles métier, du modèle de données, de l'architecture technique recommandée et des justifications techniques
- `design-reference/` — les maquettes HTML interactives

## À propos des fichiers de design

**Les fichiers dans `design-reference/` sont des maquettes de référence, pas du code de production.** Ils montrent l'apparence et le comportement visés (layout, copywriting, palette, micro-interactions de démonstration comme le quiz cliquable ou le canvas de dessin). Le travail attendu est de **recréer ces écrans dans l'environnement cible** (React confirmé pour le front, voir stack recommandée dans les specs fonctionnelles) en s'appuyant sur ses propres conventions (design system de composants, gestion d'état, routing, etc.) — pas de copier le HTML tel quel.

- `Kanji App.dc.html` : source du design (Design Component). Contient tous les écrans faisant l'objet de cette V1.
- `Kanji Game - Maquette (interactif, hors-ligne).html` : même contenu, empaqueté en un seul fichier autonome — à ouvrir directement dans un navigateur pour interagir avec le quiz et le canvas de dessin (pas de dépendance réseau).

## Fidélité

**Haute-fidélité (hifi)** sur la direction visuelle retenue : couleurs, typographies, espacements et copywriting sont définitifs pour cette V1. Le développeur doit recréer l'UI fidèlement avec les outils du projet cible. Les données affichées (joueurs, scores, historique) sont factices — à remplacer par les vraies données une fois le modèle en place.

## Écrans / vues

### 1. Accueil (landing)
- **But** : présenter la plateforme, orienter vers "jouer sans compte" ou "créer un compte".
- **Layout** : nav pleine largeur (logo + liens + CTA) ; hero avec titre H1 en serif, sous-titre, deux CTA ; bandeau de 3 chiffres clés (2 136 kanji, 5 niveaux, 8 joueurs max).
- **Composants** : logo = kanji "漢" (Shippori Mincho, 26px, 600) + "KANJI GAME" (13px, letter-spacing 0.08em) ; CTA principal fond `#1B1B1B` texte `#F7F3EC` ; CTA secondaire bordure `#1B1B1B`.
- **Contenu exact du H1** : "Apprendre le japonais, c'est aussi jouer."
- Trois explorations de mise en page ont été livrées (hero éditorial plein cadre / split app-like avec preview de quiz / storytelling vertical avec sceau rouge) — au produit de choisir laquelle industrialiser, ou de fusionner des éléments des trois.

### 2. Connexion / Inscription
- **Layout** : deux colonnes 50/50. Colonne gauche foncée (`#1B1B1B`) avec pitch de valeur du compte. Colonne droite claire avec un switch "Connexion / Inscription" (onglets soulignés en rouge `#C0392B` sur l'onglet actif) et le formulaire correspondant.
- **Connexion** : email, mot de passe, "mot de passe oublié", CTA "Se connecter", puis CTA secondaire "Continuer sans compte".
- **Inscription** : pseudo, email, mot de passe, CTA "Créer mon compte".

### 3. Lobby de partie (jusqu'à 8 joueurs)
- **Layout** : bandeau titre + code secret (encadré pointillé rouge) + bouton "Copier le lien". Grille 4×2 de slots joueurs (avatar coloré + initiales, nom, statut prêt/en attente, badge "HÔTE"). Colonne latérale : paramètres (mini-jeu, niveaux JLPT sélectionnables en chips multi-sélection, nombre de questions).
- **États des slots** : rempli (bordure pleine, fond blanc) vs vide (bordure pointillée, "En attente...").
- Voir `SPECIFICATIONS_FONCTIONNELLES.md` pour les règles de création de partie (sélection multi-niveaux, minuteur, partage).

### 4. Mini-jeu : Quiz Kanji (en jeu)
- **Layout** : barre de progression + score en haut. Colonne gauche : kanji géant (Shippori Mincho, ~220px) + lectures on'yomi/kun'yomi. Colonne droite : 4 options de réponse en grille 2×2, feedback coloré au clic (vert `#2E4A3D`/fond `#EAF0EA` si correct, rouge `#C0392B`/fond `#F7E3DF` si faux, options restantes grisées), bouton "Question suivante".

### 5. Mini-jeu : Écriture de kanji (en jeu)
- **Layout** : colonne gauche = indices (on'yomi, kun'yomi, signification) + boutons "Effacer" / "Valider le tracé". Colonne droite = zone de dessin 380×380px, fond blanc, croix pointillée centrale (grille façon papier d'entraînement à l'écriture), kanji de référence en fond à 6% d'opacité, `<canvas>` par-dessus pour capter le tracé (souris + tactile, implémenté dans la maquette).
- Le tracé actuel dans la maquette est un simple "dessin libre" de démonstration — voir specs fonctionnelles pour la mécanique réelle de notation (ordre des traits + reconnaissance de forme).

### 6. Résultats de fin de partie
- **Layout** : podium (top 3, tailles décroissantes selon le rang, couronne 👑 sur le 1er), puis tableau classement complet (rang, avatar, pseudo, score, précision). CTA "Rejouer" / "Retour à l'accueil".

### 7. Profil / statistiques du compte
- **Layout** : en-tête (avatar, pseudo, ancienneté, objectif JLPT). Grille de 4 stats clés (parties jouées, kanji maîtrisés, série de jours, précision moyenne). Barres de progression par niveau JLPT (couleur par niveau, fraction "x/total"). Liste historique récent (jeu, niveau, date, score).

## Interactions & comportement

- Onglets Connexion/Inscription : bascule d'état simple, pas d'animation.
- Quiz : clic sur une option → verrouille le choix, colore la bonne/mauvaise réponse, affiche "Question suivante".
- Écriture : dessin libre au pointeur sur canvas (mousedown/mousemove/touch), bouton "Effacer" vide le canvas.
- Chips de niveau JLPT (lobby) : multi-sélection, état actif = fond coloré plein, état inactif = contour coloré seul.
- Responsive : les écrans sont construits en flex/grid fluide ; aucun breakpoint mobile détaillé n'a été spécifié dans cette itération (voir "Prochaines étapes"). Le produit devra définir les comportements mobiles (empilement vertical, nav en burger menu, etc.) lors de l'implémentation — l'app doit rester utilisable en mobile car les joueurs y accéderont aussi depuis leur téléphone.

## Design tokens

**Couleurs**
- Fond papier : `#F7F3EC`
- Encre / texte principal : `#1B1B1B`
- Texte secondaire : `#5a5652` / `#8a847c` (plus clair)
- Bordures / hairlines : `#E3DCCD` (traits), `#DAD3C6` (inputs)
- Accent rouge (hanko) : `#C0392B` — CTA secondaires, code de partie, alertes de faute
- Niveaux JLPT : N5 `#6B8F71` (vert bambou) · N4 `#3E7CA6` (bleu indigo) · N3 `#C9A227` (or/moutarde) · N2 `#C0752E` (orange brûlé) · N1 `#C0392B` (rouge, le plus dur)
- Feedback quiz : succès fond `#EAF0EA` / bordure `#2E4A3D` — échec fond `#F7E3DF` / bordure `#C0392B`

**Typographie**
- Titres, kanji, chiffres clés : `Shippori Mincho` (serif JP/latin), graisses 400/500/600/700
- Interface, texte courant : `Zen Kaku Gothic New` (sans-serif JP/latin), graisses 400/500/700/900
- Échelle utilisée : H1 hero 46–58px · H2 30–36px · corps 14–17px · labels/petits caps 12–13px avec `letter-spacing: 0.04–0.08em`

**Espacements / structure**
- Largeur de référence desktop : 1440px (cadre de maquette)
- Cartes/stat blocks : padding 20–30px, bordure 1px `#E3DCCD`, pas d'ombre portée (design "plat", seule l'ombre du cadre de maquette existe et ne doit pas être reproduite en prod)
- Rayon de bordure : volontairement faible (2–4px) sur boutons/cartes — esthétique "papier", pas de style "bulle" arrondie

## Assets

Aucune image externe : les kanji sont du texte (police serif), les avatars sont des ronds colorés avec initiales (pas de photo). Si des photos/captures produit sont nécessaires plus tard, prévoir des emplacements dédiés — aucun n'est présent dans cette V1.

## Fichiers

- `design-reference/Kanji App.dc.html` — source du design
- `design-reference/Kanji Game - Maquette (interactif, hors-ligne).html` — version autonome, ouvrable directement dans un navigateur

## Prochaines étapes suggérées (hors V1, à cadrer plus tard)
- Comportement responsive mobile détaillé (breakpoints, nav mobile)
- Écrans admin pour la révision des traductions FR
- Nouveaux mini-jeux (liste à définir avec l'utilisateur)
