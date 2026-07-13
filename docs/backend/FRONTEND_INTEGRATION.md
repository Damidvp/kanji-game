# Intégration frontend ↔ backend réel (phase 3)

> **Ce document est autonome** : écrit pour une session Claude Code qui n'a pas accès à l'historique de conversation ayant servi à construire le backend. Il décrit l'état exact de l'API réelle (testée et validée manuellement, pas juste le contrat "indicatif" d'origine) et ce qu'il reste à faire pour brancher le frontend dessus.
>
> Avant de coder, lire aussi `docs/backend/SPECIFICATIONS_BACKEND.md` (règles métier, formules de score, schéma DB — toujours valable) et `docs/design-handoff/SPECIFICATIONS_FONCTIONNELLES.md` (specs produit d'origine). Ce document-ci se concentre sur *comment brancher le frontend existant sur l'API telle qu'elle a réellement été construite*.

## 1. État actuel

Le backend Spring Boot (`backend/`) est **fonctionnellement complet et testé de bout en bout en local** :
- Base PostgreSQL locale avec les 2140 kanji Jōyō importés (niveaux JLPT, lectures, significations — FR = EN pour l'instant, pas de DeepL).
- Auth JWT (signup/login/profil).
- Salons de jeu en REST (créer/rejoindre/prêt/quitter/exclure/lancer/rejouer).
- Moteur de jeu temps réel en WebSocket/STOMP (manches, réponses, scoring, résultats, retour au lobby) — testé sur un salon Quiz complet de 10 manches, avance immédiate ET par timeout serveur, scores vérifiés en base.

Le frontend (`frontend/`) est toujours sur ses données mockées (`frontend/src/mocks/*.ts`), inchangé depuis la phase 1. **L'objectif de cette phase : remplacer ces mocks par de vrais appels à l'API, sans changer l'UI/UX déjà validée.**

## 2. Démarrer le backend en local

Environnement mis en place sans droits administrateur (contrainte de la machine de Damien) — tout vit sous `C:\devtools`, rien n'est sur le PATH système par défaut :

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
$env:MAVEN_HOME = "C:\devtools\apache-maven-3.9.16"
$env:Path = "$env:JAVA_HOME\bin;$env:MAVEN_HOME\bin;$env:Path"
```

**PostgreSQL** (binaires portables dans `C:\devtools\pgsql`, pas un service Windows — à démarrer manuellement à chaque session) :
```powershell
C:\devtools\pgsql\bin\pg_ctl.exe -D C:\devtools\pgsql-data -l C:\devtools\pgsql-data\server.log start
```
Base `kanjigame`, auth `trust` (pas de mot de passe en local). Vérifier : `C:\devtools\pgsql\bin\pg_isready.exe -p 5432`.

**Backend** (depuis la racine du repo) :
```powershell
mvn -f backend/pom.xml spring-boot:run
```
⚠️ Ne **jamais** utiliser `backend\mvnw.cmd` — son wrapper PowerShell interne est cassé par l'apostrophe du chemin parent (`Plateforme d'apprentissage des kanji`). Toujours passer par le Maven installé dans `C:\devtools\apache-maven-3.9.16`.

Le serveur écoute sur `http://localhost:8080`. Health check rapide : `GET http://localhost:8080/api/kanji?levels=N5` doit renvoyer une liste de 79 kanji.

**Frontend** (aucun changement de config nécessaire, CORS déjà ouvert pour `http://localhost:5173`) :
```powershell
npm run dev --prefix frontend
```

## 3. Contrat API REST (tel qu'implémenté, pas juste indicatif)

Toutes les routes `/api/**` sont ouvertes (pas d'auth requise) **sauf** `/api/profile/**` qui exige un header `Authorization: Bearer <token>`.

### Auth

| Route | Body | Réponse |
|---|---|---|
| `POST /api/auth/signup` | `{pseudo, email, password}` | `{token}` — 409 si email/pseudo déjà pris |
| `POST /api/auth/login` | `{email, password}` | `{token}` — 401 si invalide |
| `GET /api/profile/me` | (Bearer requis) | `{pseudo, email, objectiveLevel}` — **`objectiveLevel` est `null` par défaut**, PAS encore les stats (`gamesPlayed`/`averageScore`/`perLevel` de `frontend/src/mocks/profile.ts`) — voir §5 gaps |
| `PUT /api/profile/objective-level` | (Bearer requis) `{objectiveLevel: "N5"\|"N4"\|"N3"\|"N2"\|"N1"}` | `{pseudo, email, objectiveLevel}` |

Le token JWT est valide 24h. Pas de refresh token, pas de logout côté serveur (juste supprimer le token côté client).

### Kanji

| Route | Réponse |
|---|---|
| `GET /api/kanji?levels=N5,N4` | `[{character, onyomi, kunyomi, meaningFr, jlptLevel}]` — forme **identique** à `MockKanji` de `frontend/src/mocks/kanji.ts` (chaînes jointes, pas des tableaux). `levels` omis = tous niveaux. |

### Salons

**Concept clé : `sessionToken`**. Le frontend doit générer un identifiant côté client (`crypto.randomUUID()`), le stocker en `localStorage`, et l'envoyer dans **chaque** requête salon (création, join, ready, leave, kick, start, replay) et **chaque** message WebSocket. C'est ce qui identifie un participant — avec ou sans compte. Renvoyer le même token après un refresh de page permet de "reconnecter" le même participant (idempotent, pas de doublon).

| Route | Body | Retour | Notes |
|---|---|---|---|
| `POST /api/rooms` | `{gameMode: "QUIZ"\|"ECRITURE", levels: ["N5","N4"], questionCount: 10-100, timePerQuestion: 10-90, guestName?, sessionToken}` | `{code, slug}` | `guestName` requis si pas de header `Authorization`. L'appelant devient hôte. |
| `GET /api/rooms/{code}?sessionToken=...` | — | `RoomState` (voir ci-dessous) | `sessionToken` en query, optionnel — sert juste à calculer `isYou`. |
| `POST /api/rooms/{code}/join` | `{guestName?, sessionToken}` | `RoomState` | Idempotent : rejouer avec le même `sessionToken` reconnecte sans dupliquer. 409 si complet (8 max) ou partie déjà lancée. 403 si exclu. |
| `POST /api/rooms/{code}/ready` | `{sessionToken, ready: bool}` | `RoomState` | |
| `POST /api/rooms/{code}/leave` | `{sessionToken}` | `RoomState` | |
| `POST /api/rooms/{code}/kick` | `{sessionToken (hôte), targetParticipantId}` | `RoomState` | 403 si pas hôte, 409 si pas en LOBBY. |
| `POST /api/rooms/{code}/start` | `{sessionToken (hôte)}` | `RoomState` | 403 si pas hôte, 409 si déjà lancé. **Déclenche la 1ère manche côté WebSocket** — s'abonner aux topics WS *avant* d'appeler `/start`. |
| `POST /api/rooms/{code}/replay` | `{sessionToken}` | `RoomState` | N'importe quel participant actif peut relancer (pas hôte-only), uniquement si `status == RESULTS`. Remet `status=LOBBY`, `ready=false` pour tous. |
| `PATCH /api/rooms/{code}/settings` | `{sessionToken (hôte), gameMode, levels, questionCount, timePerQuestion}` (remplacement complet, pas de patch partiel) | `RoomState` | Ajouté en phase d'intégration frontend (absent du contrat initial) : permet à l'hôte de modifier les paramètres du salon depuis le Lobby, comme dans l'UI déjà validée. 403 si pas hôte, 409 si `status != LOBBY`. Diffusé sur `/topic/room/{code}` comme les autres actions. |

`RoomState` :
```json
{
  "code": "AB3F9K", "slug": "quiz-yuki-e19",
  "gameMode": "QUIZ", "levels": ["N5","N4"],
  "questionCount": 20, "timePerQuestionSeconds": 30,
  "status": "LOBBY", "currentRoundIndex": 0,
  "participants": [
    { "id": 1, "name": "Yuki", "initials": "YU", "color": "var(--color-n1)",
      "isHost": true, "ready": false, "status": "IN_LOBBY",
      "objectiveLevel": null, "isYou": true }
  ]
}
```
`color` réutilise directement les 5 tokens CSS existants (`var(--color-n1..n5)`), cycliques jusqu'à 8 joueurs — compatible tel quel avec `LobbyPlayer` de `frontend/src/mocks/lobby.ts`. `status` participant : `IN_LOBBY | VIEWING_RESULTS | PLAYING | LEFT | KICKED` (les `LEFT`/`KICKED` restent dans la liste, à filtrer côté frontend si besoin de ne pas les afficher).

## 4. Contrat WebSocket/STOMP (tel qu'implémenté)

Endpoint : `ws://localhost:8080/ws` en SockJS (utiliser `@stomp/stompjs` + `sockjs-client`, pattern standard). Aucune auth requise à la connexion — le `sessionToken` est envoyé dans le **corps** de chaque message applicatif, pas dans un header STOMP.

**S'abonner à ces topics pour un salon `{code}`** (avant d'appeler `POST /api/rooms/{code}/start` pour ne rien manquer) :

| Topic | Payload | Quand |
|---|---|---|
| `/topic/room/{code}` | `RoomState` (même forme que le REST, `isYou` toujours `false` — c'est un broadcast générique) | À chaque changement d'état du salon (join/ready/leave/kick/start/replay) |
| `/topic/room/{code}/round` | `{roundIndex, kanji: {character, onyomi, kunyomi, strokeCount}, options: string[] \| null, endsAt}` | Nouvelle manche. `options` = 4 propositions **mélangées** pour le Quiz (la bonne n'est jamais indiquée), `null` pour l'Écriture. `endsAt` est un timestamp ISO — c'est l'horloge serveur qui fait foi pour le compte à rebours. |
| `/topic/room/{code}/round-status` | `{roundIndex, answeredParticipantIds: number[], totalActiveParticipants}` | Après chaque réponse reçue — pour afficher qui a répondu sans révéler le contenu |
| `/topic/room/{code}/results` | `{ranking: [{participantId, name, rank, totalPoints, avgStrokeScore}]}` | Fin de partie (dernière manche jouée) |
| `/topic/room/{code}/answer-result/{participantId}` | `{roundIndex, correct: boolean, points}` | **Quiz uniquement.** Envoyé juste après l'enregistrement de la réponse — confirmation privée pour ce joueur (l'UX validée révèle correct/faux + points immédiatement). Ce n'est pas un vrai canal STOMP "utilisateur" (la connexion WS n'est pas authentifiée) : le topic est juste scopé par `participantId`, à s'abonner dès que le client connaît le sien (après le join). Écriture non concernée : le score est déjà calculé côté client par HanziWriter. |

**Envoyer sur ces destinations applicatives** :

| Destination | Body | Effet |
|---|---|---|
| `/app/room/{code}/answer` | Quiz : `{sessionToken, selectedOption}` — Écriture : `{sessionToken, strokeScore: 0-100, strokeMistakes}` | Enregistre la réponse. Ignoré silencieusement si : déjà répondu, hors délai (`endsAt` dépassé), participant inconnu/exclu/parti. Dès que tous les participants actifs ont répondu (ou au timeout), le serveur avance automatiquement — **aucune action requise pour passer à la manche suivante**, le bouton "Question suivante"/auto-avance 10s du frontend actuel est obsolète et à retirer. |
| `/app/room/{code}/enter-lobby` | `{sessionToken}` | À envoyer quand le client affiche effectivement l'écran Lobby après un `RESULTS→LOBBY`. Fait passer *ce* participant de `VIEWING_RESULTS` à `IN_LOBBY` (chacun à son rythme, cf. §7.5 de SPECIFICATIONS_BACKEND.md). |

**Important** : l'état de partie (manche en cours, qui a répondu) est gardé en mémoire côté serveur, pas en base — si le backend redémarre pendant une partie, la partie est perdue (acceptable en dev/démo, à garder en tête).

## 4bis. Bugs trouvés et corrigés pendant cette phase (2026-07-12)

En branchant Quiz/Écriture/Résultats sur le vrai moteur de jeu, trois bugs backend latents (jamais exercés par les tests manuels de la phase précédente, qui ne rejouaient pas une partie dans le même salon) ont été trouvés et corrigés :

- **"Rejouer" dans le même salon plantait** (`UNIQUE(room_id, round_index)` sur `game_round` entrait en collision avec les manches de la partie précédente du même salon). Migration `V2__game_round_play_count.sql` : ajout de `play_count` sur `game_room`/`game_round` (incrémenté à chaque lancement), contrainte devenue `UNIQUE(room_id, play_count, round_index)`. `round_index` reste 0-based par partie, inchangé côté client.
- **Les scores de résultats étaient cumulés sur toutes les parties précédentes du même salon** (même cause racine : `GameAnswerRepository.aggregateScoresByRoom` n'était pas scopé par tentative). Corrigé en même temps, filtré par `play_count`.
- **`POST /{code}/start` pouvait laisser le salon bloqué "lancé mais sans manche"** si la création de la 1ère manche échouait après que le statut soit déjà passé à `IN_PROGRESS` (deux appels `@Transactional` séparés, non atomiques). `RoomController.start` est maintenant lui-même `@Transactional`, rendant les deux étapes atomiques.

Un salon créé avant cette migration reste indéfiniment bloqué en `IN_PROGRESS` si vous relancez `mvn spring-boot:run` après cette phase et retombez sur ce genre d'état : `UPDATE game_room SET status='LOBBY' WHERE code='...'` en direct, ou plus simplement en recréer un.

**Course sur la 1ère manche après le lancement** : `startGame` déclenche le passage à `IN_PROGRESS` (broadcast `/topic/room/{code}`) puis la 1ère manche (broadcast `/topic/room/{code}/round`) séparément — rien ne garantit qu'un client qui vient de se (re)connecter à son WS capte les deux dans l'ordre. `LobbyScreen.tsx` gère ça en n'attendant pas seulement le changement de statut : il attend aussi d'avoir reçu la 1ère manche, puis la transmet à `QuizScreen`/`WritingScreen` via l'état de navigation React Router (`state: { firstRound }`) plutôt que de compter sur leur propre resouscription WS pour la recevoir (elle ne le pourrait pas — pas de `GET /round` pour la rattraper après coup, cf. gap ci-dessous). Le même souci existe pour `/topic/room/{code}/results` en toute fin de partie, réglé pareil (`state: { results }`).

## 5. Ce qui n'est PAS encore fait côté backend (gaps connus)

- **Stats de profil** : `/api/profile/me` ne renvoie que `{pseudo, email, objectiveLevel}`, pas `gamesPlayed`/`averageScore`/`perLevel` attendus par `ProfileScreen.tsx` (cf. `frontend/src/mocks/profile.ts`). La formule de calcul est documentée au §4 de `SPECIFICATIONS_BACKEND.md` (agrégation sur `game_participant`/`game_answer`/`game_round` par `user_id`, métrique = précision en %). À construire si `ProfileScreen` doit être branché sur du réel dans cette phase.
- **Traductions FR** : `meaningFr`/`meaningsFr` = `meaningsEn` partout (pas de clé DeepL configurée). Cosmétique, n'empêche rien de fonctionner.
- **Endpoints admin** (`GET/PUT /api/admin/kanji`) : pas construits.
- **Pas de reconnexion WebSocket automatique testée** : le test manuel de cette phase utilisait une connexion WS stable du début à la fin d'une partie. Le comportement exact si un client perd sa connexion WS puis se reconnecte en pleine manche (est-ce qu'il reçoit l'état de la manche en cours, ou doit-il attendre la prochaine ?) n'a pas été spécifiquement testé — `GET /api/rooms/{code}` donne l'état du salon mais pas la manche en cours (pas de `GET /api/rooms/{code}/round` équivalent). À vérifier/construire si nécessaire.
- **CORS** : configuré pour `http://localhost:5173`, `http://127.0.0.1:5173` et `https://damidvp.github.io`, méthodes `GET/POST/PUT/PATCH/DELETE/OPTIONS`. Si le port Vite change ou qu'un autre environnement de test est utilisé, mettre à jour `backend/src/main/java/fr/kanjigame/config/SecurityConfig.java` (méthode `corsConfigurationSource`).
- **Sécurité JWT** : secret de développement en dur dans `application.yml` (`jwt.secret`, override via variable d'env `JWT_SECRET`) — non bloquant pour du dev local, à changer avant tout déploiement partagé.

## 6. Correspondance mocks → API réelle, fichier par fichier

| Fichier mock | Remplacer par | Écran(s) concerné(s) |
|---|---|---|
| `frontend/src/mocks/kanji.ts` (`mockKanjiPool`, `buildQuizQuestions`, `buildWritingRounds`) | `GET /api/kanji?levels=...` (via `frontend/src/lib/kanji.ts`, utilisé pour les significations FR côté Écriture) ; `buildQuizQuestions`/`buildWritingRounds` **fait, supprimés côté client** — c'est le serveur qui choisit le kanji et génère les options à chaque manche, diffusé sur `/topic/room/{code}/round` | `QuizScreen.tsx`, `WritingScreen.tsx` — **fait** |
| `frontend/src/mocks/lobby.ts` (`mockLobbyPlayers`, `MOCK_LOBBY_CODE`) | `POST /api/rooms`, `GET/POST /api/rooms/{code}/join`, `PATCH /api/rooms/{code}/settings`, `/topic/room/{code}` — **fait**, voir `frontend/src/lib/rooms.ts` + `frontend/src/hooks/useRoomSocket.ts` | `LobbyScreen.tsx` — **fait** |
| `frontend/src/mocks/profile.ts` | `GET /api/profile/me` — **incomplet, voir gap §5** | `ProfileScreen.tsx` — pas encore fait |
| `frontend/src/mocks/jlptLevels.ts` | Gardé tel quel (liste statique N5..N1 + libellés/couleurs) | Plusieurs écrans |

Les bots simulés (délais aléatoires, départs aléatoires) dans `QuizScreen.tsx`/`WritingScreen.tsx` ont été **entièrement supprimés**, remplacés par le vrai WebSocket (`useRoomSocket`, voir §4bis pour la subtilité de la 1ère manche/des résultats). `ResultsScreen.tsx` est branché sur `/topic/room/{code}/results` + `POST /api/rooms/{code}/replay` + `/app/room/{code}/enter-lobby` — **fait**. Simplification assumée : la colonne "PRÉCISION" du tableau de résultats affiche `—` en mode Quiz (le serveur ne renvoie que `totalPoints`, pas un taux de bonnes réponses séparé — voir §4 `answer-result` pour le détail par manche, disponible en direct mais pas agrégé en fin de partie) ; en Écriture, `avgStrokeScore` sert à la fois de score et de précision, comme dans le mock d'origine.

**Écarts constatés par rapport à ce document pendant l'implémentation (2026-07-12)**, arbitrés avec Damien :
- Aucune UI ne collectait de nom pour les invités (le mock utilisait un nom fixe). Ajout minimal : `components/GuestNameModal.tsx`, déclenché une seule fois par `components/PlayButton.tsx` (bouton "Jouer maintenant"/"Commencer à jouer" partagé Accueil+TopNav) puis mémorisé en `localStorage` (`kanji-game:guestName`).
- Le contrat d'origine n'avait pas d'endpoint pour modifier les paramètres du salon après création, alors que le Lobby déjà validé le permet à l'hôte. Ajouté : `PATCH /api/rooms/{code}/settings` (voir §3), hôte uniquement, uniquement en `LOBBY`.
- `sockjs-client` suppose l'objet `global` de Node — nécessite `define: { global: 'globalThis' }` dans `frontend/vite.config.ts` (déjà fait), sinon erreur `ReferenceError: global is not defined` au premier import.

## 7. Ordre d'implémentation suggéré

1. ~~Générer/persister le `sessionToken` (localStorage) au premier lancement de l'app.~~ **Fait, validé 2026-07-12.**
2. ~~Brancher `HomeScreen`/`AuthScreen` sur `/api/auth/*`~~ **Fait, validé 2026-07-12.**
3. ~~Brancher `LobbyScreen` sur les routes REST salons + `/topic/room/{code}`~~ **Fait, validé 2026-07-12.** A aussi nécessité `PATCH /api/rooms/{code}/settings` (absent du contrat d'origine, voir §3) et une petite modale de nom invité (`GuestNameModal`/`PlayButton`, voir plus haut).
4. ~~Client STOMP partagé~~ **Fait, validé 2026-07-12** (`frontend/src/hooks/useRoomSocket.ts` + `useRoomConnection.ts`).
5. ~~Brancher `QuizScreen`/`WritingScreen`~~ **Fait, validé 2026-07-12** (parties Quiz et Écriture jouées jusqu'au bout en réel, y compris via timeout serveur). A nécessité un nouveau canal WS privé (`/answer-result/{participantId}`, voir §4) pour le feedback correct/faux immédiat du Quiz, absent du contrat d'origine.
6. ~~Brancher `ResultsScreen`~~ **Fait, validé 2026-07-12.**
7. ~~`ProfileScreen`~~ **Fait, validé 2026-07-12** — `objectiveLevel` branché sur `GET/PUT /api/profile/*` (comptes réels) et confirmé persistant après rechargement complet ; invités inchangés (localStorage, pas de compte). `gamesPlayed`/`averageScore`/`perLevel` restent mockés (gap §5, stats non construites côté backend).

**Les 7 étapes de ce document sont maintenant faites.** Ce qui reste ouvert pour une session future : les stats de profil réelles (§5), les endpoints admin, la reconnexion WebSocket en pleine manche, et éventuellement durcir encore le protocole de manche (voir §4bis — le contournement `firstRound`/`results` via navigation React Router fonctionne mais un vrai `GET /api/rooms/{code}/round` réglerait aussi le cas "rafraîchir la page en pleine partie", non traité ici).

Comme pour les phases précédentes : construire un écran, le vérifier soi-même dans le navigateur avec le backend réellement lancé (pas juste compiler), proposer à Damien pour validation avant de passer au suivant.
