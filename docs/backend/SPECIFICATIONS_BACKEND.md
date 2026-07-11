# Spécifications backend — Kanji Game (phase 2)

> **Ce document est autonome** : il est écrit pour être lu par une session Claude Code qui n'a pas accès à l'historique de conversation ayant servi à construire le frontend. Il résume tout ce qu'il faut savoir pour implémenter le backend Spring Boot + la base de données PostgreSQL, en cohérence avec le frontend React déjà construit dans `frontend/`.
>
> Avant de coder, lire aussi `docs/design-handoff/README.md` et `docs/design-handoff/SPECIFICATIONS_FONCTIONNELLES.md` (specs d'origine, toujours valables sur les grandes lignes). Ce document-ci les complète et les précise à la lumière de ce qui a réellement été construit côté frontend, et tranche certains points qui étaient encore ouverts.

## 1. État actuel du projet

Le frontend (`frontend/`, Vite + React + TypeScript) est terminé pour la V1 telle que définie dans le handoff design : 7 écrans (Accueil, Connexion/Inscription, Lobby, Quiz Kanji, Écriture de kanji, Résultats, Profil), tous fonctionnels avec des **données mockées côté client** (`frontend/src/mocks/`) et **aucun backend réel**. Déployé sur GitHub Pages : https://damidvp.github.io/kanji-game/

Le multijoueur est actuellement **simulé** : dans le Quiz et l'Écriture, 4 "joueurs" mockés répondent avec des délais aléatoires, peuvent aléatoirement "quitter", et le jeu attend que tout le monde ait répondu (ou que le temps soit écoulé) avant de passer à la question suivante, avec une avance automatique après 10s si personne ne clique. Ce comportement doit être reproduit **réellement** par le backend via WebSocket — c'est l'objectif principal de cette phase.

L'objectif de cette phase 2 : remplacer les mocks par un vrai backend Spring Boot + PostgreSQL, sans changer l'UI/UX déjà validée par le Product Owner. Le frontend devra être adapté pour appeler l'API réelle à la place des mocks, mais ses écrans et son design ne changent pas.

## 2. Stack technique

- **Java 21**, **Spring Boot 3.x**
- `spring-boot-starter-web` — API REST
- `spring-boot-starter-data-jpa` — persistance (Hibernate)
- `spring-boot-starter-websocket` — temps réel (STOMP over WebSocket)
- `spring-boot-starter-security` + JWT (ex. `jjwt` ou `spring-security-oauth2-resource-server` en mode JWT stateless) — auth par compte
- `spring-boot-starter-validation`
- **PostgreSQL** comme SGBD (voir §8 pour l'hébergement)
- **Flyway** (`flyway-core`) pour les migrations de schéma — les DDL du §4 sont à transposer en migrations `V1__init.sql`, etc.
- **Maven** (cohérent avec le reste du projet ; `.gitignore` du repo est déjà préparé pour `backend/target/`)
- Le code backend doit vivre dans un nouveau dossier `backend/` à la racine du repo (voir `README.md` racine, qui l'annonce déjà).

## 3. Ce qui reste côté client (ne pas dupliquer côté serveur)

- Le rendu de l'UI, le design system, les composants React : inchangés.
- **HanziWriter** reste 100% client (librairie JS, charge les données de tracé KanjiVG via CDN jsdelivr). Le backend n'a pas besoin de stocker ni de valider les tracés eux-mêmes — le score de l'écriture (voir §7.3) est calculé côté client par HanziWriter, puis **envoyé au serveur comme résultat** (le serveur fait confiance au client pour la forme du tracé, mais **doit** être l'autorité sur le chronométrage, voir §7.2).
- Les polices (Google Fonts) restent chargées côté client.

## 4. Modèle de données relationnel (PostgreSQL)

Schéma normalisé, pensé pour être posé tel quel comme première migration Flyway. Types adaptés à PostgreSQL (`text[]` pour les tableaux de lectures/significations, `timestamptz` pour les dates).

```sql
-- Niveaux JLPT : pas de table dédiée, stockés comme varchar contraint ('N5'..'N1')
-- via CHECK constraint plutôt qu'un enum Postgres, pour rester simple à faire évoluer.

CREATE TABLE app_user (
    id                BIGSERIAL PRIMARY KEY,
    pseudo            VARCHAR(32) NOT NULL UNIQUE,
    email             VARCHAR(255) NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,
    objective_level   VARCHAR(2) CHECK (objective_level IN ('N5','N4','N3','N2','N1')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE kanji (
    id                  BIGSERIAL PRIMARY KEY,
    character           VARCHAR(4) NOT NULL UNIQUE,
    jouyou_number       INTEGER,
    jlpt_level          VARCHAR(2) NOT NULL CHECK (jlpt_level IN ('N5','N4','N3','N2','N1')),
    onyomi              TEXT[] NOT NULL DEFAULT '{}',
    kunyomi             TEXT[] NOT NULL DEFAULT '{}',
    stroke_count        INTEGER,
    meanings_en         TEXT[] NOT NULL DEFAULT '{}',   -- brut, tel que fourni par kanjiapi.dev
    meanings_fr         TEXT[] NOT NULL DEFAULT '{}',   -- traduit (DeepL), voir §6
    translation_reviewed BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_kanji_jlpt_level ON kanji (jlpt_level);

CREATE TABLE kanji_word (
    id            BIGSERIAL PRIMARY KEY,
    kanji_id      BIGINT NOT NULL REFERENCES kanji(id) ON DELETE CASCADE,
    word          VARCHAR(64) NOT NULL,
    reading       VARCHAR(64) NOT NULL,
    meanings_en   TEXT[] NOT NULL DEFAULT '{}',
    meanings_fr   TEXT[] NOT NULL DEFAULT '{}'
);
CREATE INDEX idx_kanji_word_kanji_id ON kanji_word (kanji_id);

CREATE TABLE game_room (
    id                        BIGSERIAL PRIMARY KEY,
    code                      VARCHAR(6) NOT NULL UNIQUE,        -- ex. "AB3F9K"
    slug                      VARCHAR(64) NOT NULL UNIQUE,       -- ex. "quiz-yuki-8f2", pour le lien partageable
    host_user_id              BIGINT REFERENCES app_user(id),    -- NULL si l'hôte est un invité
    host_guest_name           VARCHAR(32),                       -- utilisé si host_user_id IS NULL
    game_mode                 VARCHAR(16) NOT NULL CHECK (game_mode IN ('QUIZ','ECRITURE')),
    question_count            INTEGER NOT NULL CHECK (question_count BETWEEN 10 AND 100),
    time_per_question_seconds INTEGER NOT NULL CHECK (time_per_question_seconds BETWEEN 10 AND 90),
    status                    VARCHAR(16) NOT NULL DEFAULT 'LOBBY' CHECK (status IN ('LOBBY','IN_PROGRESS','RESULTS','CLOSED')),
    current_round_index       INTEGER NOT NULL DEFAULT 0,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE game_room_level (
    room_id     BIGINT NOT NULL REFERENCES game_room(id) ON DELETE CASCADE,
    jlpt_level  VARCHAR(2) NOT NULL CHECK (jlpt_level IN ('N5','N4','N3','N2','N1')),
    PRIMARY KEY (room_id, jlpt_level)
);

CREATE TABLE game_participant (
    id            BIGSERIAL PRIMARY KEY,
    room_id       BIGINT NOT NULL REFERENCES game_room(id) ON DELETE CASCADE,
    user_id       BIGINT REFERENCES app_user(id),        -- NULL si invité
    guest_name    VARCHAR(32),                           -- utilisé si user_id IS NULL
    session_token VARCHAR(64) NOT NULL,                  -- identifiant de session client (localStorage), pour reconnexion
    initials      VARCHAR(2) NOT NULL,
    color         VARCHAR(32) NOT NULL,                  -- token de couleur (ex. "var(--color-n4)") ou hex
    is_host       BOOLEAN NOT NULL DEFAULT false,
    ready         BOOLEAN NOT NULL DEFAULT false,
    status        VARCHAR(16) NOT NULL DEFAULT 'IN_LOBBY' CHECK (status IN ('IN_LOBBY','VIEWING_RESULTS','PLAYING','LEFT','KICKED')),
    joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at       TIMESTAMPTZ
);
CREATE INDEX idx_game_participant_room_id ON game_participant (room_id);
CREATE UNIQUE INDEX idx_game_participant_room_session ON game_participant (room_id, session_token);

CREATE TABLE game_round (
    id           BIGSERIAL PRIMARY KEY,
    room_id      BIGINT NOT NULL REFERENCES game_room(id) ON DELETE CASCADE,
    round_index  INTEGER NOT NULL,
    kanji_id     BIGINT NOT NULL REFERENCES kanji(id),
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at      TIMESTAMPTZ NOT NULL,                   -- started_at + time_per_question_seconds, autorité serveur
    UNIQUE (room_id, round_index)
);

CREATE TABLE game_answer (
    id              BIGSERIAL PRIMARY KEY,
    round_id        BIGINT NOT NULL REFERENCES game_round(id) ON DELETE CASCADE,
    participant_id  BIGINT NOT NULL REFERENCES game_participant(id) ON DELETE CASCADE,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Quiz Kanji :
    selected_option VARCHAR(128),
    is_correct      BOOLEAN,
    points          INTEGER,              -- 1 à 1000, voir formule §7.1
    -- Écriture de kanji :
    stroke_score    INTEGER,              -- 0 à 100 (%), voir formule §7.3
    stroke_mistakes INTEGER,
    UNIQUE (round_id, participant_id)
);
```

**Notes de conception :**
- Pas de table `game_result_summary` : les résultats de fin de partie (classement, podium) se calculent à la volée par agrégation SQL sur `game_answer` filtré par `room_id` (via `game_round.room_id`), regroupé par `participant_id`. Plus simple et sans risque de désynchronisation. Si les performances le justifient plus tard, ajouter un cache.
- **Statistiques de profil** (`parties jouées`, `score moyen`, `score moyen par niveau` — écran Profil) : calculées par agrégation sur l'historique de `game_participant`/`game_answer`/`game_round`/`kanji` filtré par `user_id` (donc uniquement pour les comptes, pas les invités — cohérent avec les specs d'origine : "aucune statistique n'est sauvegardée" pour les invités).
  - **Décision de modélisation à connaître** : le frontend affiche un "score moyen" unique en **pourcentage** (0–100 %) alors que le Quiz score en points (1 à 1000/question) et l'Écriture score déjà en % de traits corrects. Pour unifier les deux dans le calcul de stats de profil, utiliser la **précision** (`% de bonnes réponses` pour le Quiz, `% de traits corrects du premier coup` pour l'Écriture) comme métrique commune, **pas** les points bruts. C'est ce que `frontend/src/mocks/profile.ts` illustre (valeurs 0–100 partout).
- `game_participant.session_token` : le frontend devra générer un identifiant côté client (ex. `crypto.randomUUID()`, stocké en `localStorage`) et le renvoyer à chaque requête/reconnexion pour que le serveur retrouve le bon participant après un refresh de page (pas de vrai compte requis pour jouer, cf. specs d'origine).

## 5. Comptes utilisateurs & authentification

- Email + mot de passe (`BCryptPasswordEncoder`), JWT stateless (`Authorization: Bearer <token>`), pas de session serveur à maintenir.
- Endpoints : `POST /api/auth/signup` (pseudo, email, password) → `{token}` ; `POST /api/auth/login` (email, password) → `{token}`.
- **Invités** : aucune authentification requise pour créer/rejoindre un salon. Le champ `game_participant.session_token` suffit à les identifier pour la durée d'une partie. Pas de migration invité → compte prévue (cf. specs d'origine).
- OAuth, réinitialisation de mot de passe : hors V1 backend, mais le modèle (`app_user.password_hash` séparé, pas de couplage fort) permet de les ajouter plus tard sans tout refondre.

## 6. Référentiel Kanji — import & traduction

Reprendre la stratégie déjà actée dans `docs/design-handoff/SPECIFICATIONS_FONCTIONNELLES.md` (§2) :
1. Script/job d'import (peut être un `CommandLineRunner` Spring Boot déclenché manuellement, ou un endpoint admin protégé) qui appelle [kanjiapi.dev](https://kanjiapi.dev/) pour récupérer les ~2136 kanji Jōyō (lectures, sens EN, `jouyou` number) + les mots associés (`words`), et les upsert dans `kanji` / `kanji_word`.
2. Mapping du niveau JLPT : kanjiapi.dev ne fournit pas directement le niveau JLPT courant (le concept "JLPT officiel" a changé de plage plusieurs fois) — utiliser une table de correspondance statique (fichier JSON versionné dans `backend/`, à constituer à partir d'une liste JLPT kanji-par-niveau publique) plutôt que de la déduire dynamiquement.
3. Traduction FR : à l'import, appeler l'API **DeepL** (recommandé dans les specs d'origine) pour traduire `meanings_en` → `meanings_fr`, stocker, `translation_reviewed = false` par défaut.
4. Endpoint back-office minimal pour la relecture des traductions : `GET /api/admin/kanji?reviewed=false` (liste), `PUT /api/admin/kanji/{id}` (corriger `meanings_fr`, passer `translation_reviewed = true`). Pas d'UI dédiée en V1 (juste l'endpoint, testable via Postman/curl) — une UI pourra suivre.
5. **Important** : tant que la clé DeepL n'est pas disponible, faire tourner l'import avec `meanings_fr = meanings_en` (placeholder) plutôt que de bloquer le développement — le frontend peut très bien démarrer avec des significations en anglais en attendant.

Le pool de kanji mocké dans `frontend/src/mocks/kanji.ts` (19 kanji N5/N4) donne le format exact de données attendu côté frontend (`character`, `onyomi`, `kunyomi`, `meaningFr`, `jlptLevel`) — l'API `GET /api/kanji?levels=N5,N4` (voir §7) doit renvoyer une forme compatible.

## 7. Règles métier & formules de score (à reproduire fidèlement)

### 7.1 Quiz Kanji — scoring façon Kahoot

Implémenté côté frontend dans `frontend/src/screens/QuizScreen.tsx` (`computePoints`). Formule à reproduire **côté serveur** (le commentaire du code frontend le dit déjà : *"en multijoueur réel, ce calcul devra être fait côté serveur à partir de l'horodatage d'envoi de la question, pour ne pas se fier au client"*) :

```
ratio = min(1, elapsedMs / (timeLimitSeconds * 1000))
points = round(1000 - 999 * ratio)   // borné entre 1 et 1000 si la réponse est correcte
points = 0                            // si la réponse est incorrecte ou hors délai
```

`elapsedMs` doit être calculé côté serveur comme `submitted_at - game_round.started_at` (jamais fourni par le client), pour empêcher la triche sur le temps de réponse.

- 4 propositions par question, 1 correcte, 3 distracteurs tirés des significations d'autres kanji du/des même(s) niveau(x) sélectionné(s) (reproduire `buildQuizQuestions` de `frontend/src/mocks/kanji.ts`, côté serveur, à la création de chaque `game_round`).
- Score final du joueur = somme des `points` sur toutes les questions.

### 7.2 Synchronisation multijoueur (Quiz **et** Écriture)

Comportement déjà simulé côté frontend (bots mockés) à reproduire **réellement** via WebSocket :
- Une manche démarre pour tous les participants en même temps (`game_round` créé, broadcast).
- Chaque participant répond à son rythme, dans la limite de `game_round.ends_at`.
- Dès que **tous** les participants actifs (`status` ∉ {LEFT, KICKED}) ont répondu, **ou** que `ends_at` est dépassé, le serveur passe automatiquement à la manche suivante.
- **Auto-avance à 10s** : si la manche est déjà terminée pour tout le monde mais qu'aucune action n'est requise côté serveur ici — cet auto-avance de 10s dans le frontend actuel concerne le fait que l'**hôte** ne clique pas sur "Question suivante" ; en version réelle, ce n'est plus nécessaire car c'est le **serveur** qui décide de passer à la manche suivante dès que la condition ci-dessus est remplie (donc pas d'attente d'un clic humain). Ce point du frontend (bouton "Question suivante" + auto-avance 10s) devient obsolète une fois le serveur autoritaire — à retirer ou transformer en simple affichage lors de l'intégration frontend/backend.
- Un participant qui quitte (`status = LEFT`) ou est exclu (`status = KICKED`) n'est plus compté dans "tout le monde a répondu" pour les manches suivantes.

### 7.3 Écriture de kanji — scoring

Le tracé et sa reconnaissance restent **entièrement côté client** (HanziWriter). Le serveur reçoit, par kanji, le résultat déjà calculé :

```
score_kanji = round(traits_corrects_premier_essai / total_traits * 100)   // 0 à 100
```

(reproduit `frontend/src/screens/WritingScreen.tsx`, fonction `finishRound`). Le client envoie `stroke_score` (0–100) et `stroke_mistakes` (nombre total d'essais ratés, pour info) au serveur via l'endpoint/message de soumission de réponse. Le serveur n'a pas à revalider la géométrie du tracé — il fait confiance au calcul client HanziWriter pour la V1 (limite connue, acceptable vu qu'il n'y a pas d'enjeu compétitif/financier).

Score final du joueur = moyenne des `stroke_score` sur tous les kanji de la partie.

### 7.4 Départ / exclusion d'un joueur

- Un joueur peut quitter à tout moment (`game_participant.status = LEFT`, `left_at = now()`).
- L'hôte peut exclure un joueur du salon (`status = KICKED`) **uniquement en phase `LOBBY`** (reproduit la fonctionnalité "kick" ajoutée dans `LobbyScreen.tsx`). Un joueur exclu ne doit pas pouvoir rejoindre à nouveau avec le même `session_token` (vérifier le statut à la (re)connexion).

### 7.5 Retour au lobby après une partie

- Écran Résultats : retour automatique au salon après 60s d'inactivité, ou immédiatement si un joueur clique sur "Rejouer" (`frontend/src/screens/ResultsScreen.tsx`). Côté serveur, ceci correspond à repasser `game_room.status` de `RESULTS` à `LOBBY`, réinitialiser `ready = false` pour tous les participants actifs, et incrémenter/réutiliser le même salon pour une nouvelle partie (même `code`/`slug`).
- **Statut "consulte les résultats"** : quand un salon repasse en `LOBBY`, un participant qui n'a pas encore renvoyé de signal "je suis dans le lobby" doit apparaître aux autres avec `status = VIEWING_RESULTS` plutôt que `IN_LOBBY`. Concrètement : mettre tous les participants actifs en `VIEWING_RESULTS` au moment où `game_room.status` passe à `RESULTS`, et chaque client repasse son propre participant à `IN_LOBBY` dès qu'il affiche effectivement l'écran Lobby (petit message WebSocket dédié, ex. `/app/room/{code}/enter-lobby`).

## 8. API REST (contrat indicatif)

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Créer un compte |
| POST | `/api/auth/login` | Connexion |
| GET | `/api/kanji?levels=N5,N4` | Liste de kanji filtrée par niveau(x) (pour construire quiz/écriture) |
| GET | `/api/admin/kanji?reviewed=false` | Kanji dont la traduction FR n'a pas été relue |
| PUT | `/api/admin/kanji/{id}` | Corriger une traduction, marquer `translation_reviewed` |
| POST | `/api/rooms` | Créer un salon (hôte = compte ou invité) → `{code, slug}` |
| GET | `/api/rooms/{code}` | État actuel d'un salon (pour affichage initial avant connexion WS) |
| POST | `/api/rooms/{code}/join` | Rejoindre (pseudo/couleur si invité, ou via JWT si connecté) |
| POST | `/api/rooms/{code}/start` | L'hôte lance la partie |
| GET | `/api/profile/me` | Stats du compte connecté (parties jouées, score moyen, score moyen par niveau) |
| PUT | `/api/profile/objective-level` | Mettre à jour l'objectif JLPT du compte |

### WebSocket / STOMP

- Connexion : `/ws` (endpoint SockJS/STOMP), un salon = un topic dédié `/topic/room/{code}`.
- Le serveur publie sur `/topic/room/{code}` : changements d'état du salon (joueur rejoint/prêt/quitte/exclu, paramètres modifiés, statut du salon).
- Le serveur publie sur `/topic/room/{code}/round` : nouvelle manche (kanji + `ends_at`, sans révéler la bonne réponse pour le Quiz).
- Le client envoie sur `/app/room/{code}/answer` : soumission de réponse (option choisie pour le Quiz, ou `stroke_score`/`stroke_mistakes` pour l'Écriture).
- Le serveur publie sur `/topic/room/{code}/round-status` : qui a répondu (sans le contenu), pour afficher les chips joueurs en direct.
- Le serveur publie sur `/topic/room/{code}/results` : classement final quand la partie se termine.

Ce contrat est indicatif — à ajuster librement lors de l'implémentation tant que le comportement observable (§7.2) est respecté.

## 9. Hébergement de la base de données — solution gratuite et accessible

**Recommandation : [Neon](https://neon.tech)** (PostgreSQL serverless).

Comparatif rapide (vérifié en juillet 2026) :

| Solution | Gratuit ? | Limites notables |
|---|---|---|
| **Neon** ✅ recommandé | Oui, palier gratuit permanent | 1 projet, ~3 Go de données, calcul partagé 1 Go RAM ; se met en veille après inactivité (config. dès 5 min) et se réveille en <500ms à la requête suivante — **aucune donnée perdue**, juste une petite latence sur la 1ère requête après veille |
| Supabase | Palier gratuit, mais **projet mis en pause après 7 jours d'inactivité** (réveil manuel requis depuis le dashboard) | 500 Mo × 2 projets ; embarque aussi auth/storage/realtime qu'on n'utilise pas ici (le backend Spring gère tout ça lui-même) |
| Railway | ⚠️ N'est plus vraiment "gratuit" — un unique crédit d'essai de 5 $, pas un palier gratuit permanent | À éviter pour cet usage |
| Render (Postgres managé) | Palier gratuit historiquement limité à 90 jours puis suppression de la base — à revérifier au moment de l'implémentation, non retenu par prudence | — |

→ **Neon** est le plus adapté : gratuit sans limite de durée, compatible nativement avec Spring Data JPA (c'est du PostgreSQL standard, juste une chaîne de connexion JDBC avec SSL). La mise en veille en cas d'inactivité n'est pas un problème pour un projet en développement/démo (peu de trafic constant).

**Configuration Spring Boot (`application.yml`) avec Neon :**
```yaml
spring:
  datasource:
    url: jdbc:postgresql://<host>.neon.tech/<database>?sslmode=require
    username: <user>
    password: ${DB_PASSWORD}   # ne jamais committer le mot de passe, passer par variable d'env
  jpa:
    hibernate:
      ddl-auto: validate       # le schéma est géré par Flyway, pas par Hibernate auto-génération
  flyway:
    enabled: true
```

**Repli si Neon ne convient pas** (ex. blocage réseau, préférence de l'utilisateur) : rester en contexte de développement local avec PostgreSQL via Docker :
```bash
docker run --name kanji-game-db -e POSTGRES_PASSWORD=devpassword -e POSTGRES_DB=kanjigame -p 5432:5432 -d postgres:16
```
puis `spring.datasource.url: jdbc:postgresql://localhost:5432/kanjigame`. C'est d'ailleurs la configuration recommandée pour le développement au quotidien même si Neon est utilisé pour une démo partagée — garder les deux profils Spring (`application-local.yml` pointant sur Docker, `application-neon.yml` ou variables d'env pour Neon) plutôt que de choisir l'un ou l'autre définitivement.

**Hébergement de l'application Spring Boot elle-même** (hors périmètre de la question posée, mais utile à savoir) : Render propose un palier gratuit pour un service web (avec mise en veille après inactivité, comme Neon) ; Fly.io a un palier gratuit limité mais fonctionnel pour un petit service. À trancher plus tard — le développement local (`localhost:8080`) suffit largement pour commencer.

## 10. Ordre d'implémentation suggéré

1. Scaffold `backend/` (Spring Initializr : Web, Data JPA, WebSocket, Security, Validation, PostgreSQL driver, Flyway).
2. Config datasource local (Docker Postgres) + première migration Flyway avec le schéma du §4.
3. Import du référentiel kanji (kanjiapi.dev) + endpoint `GET /api/kanji` — sans DeepL au début (placeholder FR = EN), pour débloquer le reste.
4. Auth (signup/login/JWT) — simple, testable au `curl`/Postman avant de toucher au frontend.
5. Salons : création/join en REST (sans WebSocket dans un premier temps) — suffisant pour un salon solo.
6. WebSocket/STOMP : diffusion de l'état du salon, puis des manches, puis de la synchronisation multijoueur complète (§7.2).
7. Brancher le frontend existant sur l'API réelle (remplacer progressivement les fichiers `frontend/src/mocks/*` par des appels API — l'architecture actuelle avec des fonctions comme `buildQuizQuestions` facilite cette transition, il s'agit surtout de les rendre asynchrones et de les faire pointer vers l'API).
8. Intégration DeepL pour la traduction FR + endpoint back-office de relecture.
9. Déploiement (Neon pour la base ; hébergement de l'app à définir, cf. §9).

## 11. Points restants à trancher (non bloquants pour démarrer)

Repris et complétés depuis les specs d'origine :
- Règle exacte de lancement du lobby (nombre minimum de joueurs prêts) — le frontend actuel ne bloque pas le lancement, à décider si ça doit changer.
- Comportement si le dernier joueur restant est l'hôte et qu'il quitte : fermer le salon (`status = CLOSED`) ou le laisser vivant pour un rejoin ultérieur via le lien ?
- Faut-il conserver un historique détaillé par partie (écran "historique récent" de la maquette d'origine, retiré de la V1 frontend simplifiée) ? Le schéma actuel le permet déjà via `game_answer`/`game_round` sans modification.
- Seuil de "kanji maîtrisé" (mentionné dans les specs d'origine, non implémenté côté frontend V1) — à définir si cette fonctionnalité est réintroduite.
