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
