package fr.kanjigame.game;

import fr.kanjigame.kanji.Kanji;
import fr.kanjigame.kanji.KanjiRepository;
import fr.kanjigame.room.GameMode;
import fr.kanjigame.room.GameParticipant;
import fr.kanjigame.room.GameParticipantRepository;
import fr.kanjigame.room.GameRoom;
import fr.kanjigame.room.GameRoomRepository;
import fr.kanjigame.room.ParticipantStatus;
import fr.kanjigame.room.RoomStateMapper;
import fr.kanjigame.room.RoomStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cycle de vie temps réel d'une partie (§7.2/§7.3/§7.5 de SPECIFICATIONS_BACKEND.md) :
 * démarrage/avancement automatique des manches, scoring, résultats, retour au lobby.
 * État de partie éphémère (RoomRuntimeState) tenu en mémoire, par salon — cf. sa javadoc.
 */
@Service
public class GameEngineService {

    private static final Logger log = LoggerFactory.getLogger(GameEngineService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Duration AUTO_REPLAY_DELAY = Duration.ofSeconds(60);

    private final Map<String, RoomRuntimeState> runtimes = new ConcurrentHashMap<>();

    private final GameRoomRepository gameRoomRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final GameRoundRepository gameRoundRepository;
    private final GameAnswerRepository gameAnswerRepository;
    private final KanjiRepository kanjiRepository;
    private final QuizQuestionGenerator quizQuestionGenerator;
    private final RoomStateMapper roomStateMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final TaskScheduler taskScheduler;

    public GameEngineService(GameRoomRepository gameRoomRepository, GameParticipantRepository gameParticipantRepository,
                              GameRoundRepository gameRoundRepository, GameAnswerRepository gameAnswerRepository,
                              KanjiRepository kanjiRepository, QuizQuestionGenerator quizQuestionGenerator,
                              RoomStateMapper roomStateMapper, SimpMessagingTemplate messagingTemplate,
                              TaskScheduler taskScheduler) {
        this.gameRoomRepository = gameRoomRepository;
        this.gameParticipantRepository = gameParticipantRepository;
        this.gameRoundRepository = gameRoundRepository;
        this.gameAnswerRepository = gameAnswerRepository;
        this.kanjiRepository = kanjiRepository;
        this.quizQuestionGenerator = quizQuestionGenerator;
        this.roomStateMapper = roomStateMapper;
        this.messagingTemplate = messagingTemplate;
        this.taskScheduler = taskScheduler;
    }

    @Transactional
    public void startGame(String code) {
        // Chaque lancement (première partie ou "Rejouer" dans le même salon) incrémente
        // play_count, qui distingue les manches de parties successives d'un même salon —
        // round_index redémarre à 0 à chaque fois, cf. V2__game_round_play_count.sql.
        gameRoomRepository.findByCode(code).ifPresent(room -> {
            room.setPlayCount(room.getPlayCount() + 1);
            gameRoomRepository.save(room);
        });
        runtimes.put(code, new RoomRuntimeState());
        startRound(code, 0);
    }

    @Transactional
    public void submitAnswer(String code, AnswerSubmission submission) {
        RoomRuntimeState state = runtimes.get(code);
        GameRoom room = gameRoomRepository.findByCode(code).orElse(null);
        if (state == null || room == null || room.getStatus() != RoomStatus.IN_PROGRESS) {
            return;
        }

        GameParticipant participant = gameParticipantRepository.findByRoomIdAndSessionToken(room.getId(), submission.sessionToken())
                .orElse(null);
        if (participant == null || participant.getStatus() == ParticipantStatus.LEFT || participant.getStatus() == ParticipantStatus.KICKED) {
            return;
        }
        if (state.answeredParticipantIds.contains(participant.getId())) {
            return; // déjà répondu
        }

        GameRound round = gameRoundRepository.findById(state.currentRoundId).orElse(null);
        if (round == null) {
            return;
        }
        OffsetDateTime now = OffsetDateTime.now();
        if (now.isAfter(round.getEndsAt())) {
            return; // trop tard, le timeout serveur va (ou a déjà) fait avancer la manche
        }

        GameAnswer answer = new GameAnswer(round, participant);
        boolean correct = false;
        int points = 0;
        if (room.getGameMode() == GameMode.QUIZ) {
            long elapsedMs = Duration.between(round.getStartedAt(), now).toMillis();
            double ratio = Math.min(1.0, elapsedMs / (room.getTimePerQuestionSeconds() * 1000.0));
            correct = submission.selectedOption() != null && submission.selectedOption().equals(state.correctOption);
            points = correct ? (int) Math.round(1000 - 999 * ratio) : 0;
            answer.setSelectedOption(submission.selectedOption());
            answer.setIsCorrect(correct);
            answer.setPoints(points);
        } else {
            Integer strokeScore = submission.strokeScore() == null ? 0 : Math.max(0, Math.min(100, submission.strokeScore()));
            Integer strokeMistakes = submission.strokeMistakes() == null ? 0 : Math.max(0, submission.strokeMistakes());
            answer.setStrokeScore(strokeScore);
            answer.setStrokeMistakes(strokeMistakes);
        }
        try {
            gameAnswerRepository.save(answer);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            return; // course : déjà enregistré par une requête concurrente
        }
        state.answeredParticipantIds.add(participant.getId());

        if (room.getGameMode() == GameMode.QUIZ) {
            messagingTemplate.convertAndSend("/topic/room/" + code + "/answer-result/" + participant.getId(),
                    new AnswerResultBroadcast(round.getRoundIndex(), correct, points));
        }

        long activeCount = gameParticipantRepository.countByRoomIdAndStatusNotIn(room.getId(),
                List.of(ParticipantStatus.LEFT, ParticipantStatus.KICKED));
        messagingTemplate.convertAndSend("/topic/room/" + code + "/round-status",
                new RoundStatusBroadcast(round.getRoundIndex(), List.copyOf(state.answeredParticipantIds), (int) activeCount));

        if (state.answeredParticipantIds.size() >= activeCount) {
            advance(code, round.getRoundIndex());
        }
    }

    @Transactional
    public void onParticipantInactive(String code) {
        RoomRuntimeState state = runtimes.get(code);
        GameRoom room = gameRoomRepository.findByCode(code).orElse(null);
        if (state == null || room == null || room.getStatus() != RoomStatus.IN_PROGRESS) {
            return;
        }
        long activeCount = gameParticipantRepository.countByRoomIdAndStatusNotIn(room.getId(),
                List.of(ParticipantStatus.LEFT, ParticipantStatus.KICKED));
        if (activeCount > 0 && state.answeredParticipantIds.size() >= activeCount) {
            advance(code, state.currentRoundIndex);
        }
    }

    @Transactional
    public void enterLobby(String code, String sessionToken) {
        GameRoom room = gameRoomRepository.findByCode(code).orElse(null);
        if (room == null) {
            return;
        }
        gameParticipantRepository.findByRoomIdAndSessionToken(room.getId(), sessionToken).ifPresent(p -> {
            if (p.getStatus() == ParticipantStatus.VIEWING_RESULTS) {
                p.setStatus(ParticipantStatus.IN_LOBBY);
                gameParticipantRepository.save(p);
                broadcastRoomState(room);
            }
        });
    }

    @Transactional
    public fr.kanjigame.room.RoomStateResponse replay(String code, String sessionToken) {
        GameRoom room = gameRoomRepository.findByCode(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Salon introuvable"));
        gameParticipantRepository.findByRoomIdAndSessionToken(room.getId(), sessionToken)
                .filter(p -> p.getStatus() != ParticipantStatus.LEFT && p.getStatus() != ParticipantStatus.KICKED)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Vous ne faites pas partie de ce salon"));
        if (room.getStatus() != RoomStatus.RESULTS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La partie n'est pas terminée");
        }

        RoomRuntimeState state = runtimes.get(code);
        if (state != null && state.autoReplayFuture != null) {
            state.autoReplayFuture.cancel(false);
        }

        room.setStatus(RoomStatus.LOBBY);
        room.setCurrentRoundIndex(0);
        gameRoomRepository.save(room);

        for (GameParticipant p : gameParticipantRepository.findByRoomIdOrderByJoinedAtAsc(room.getId())) {
            if (p.getStatus() != ParticipantStatus.LEFT && p.getStatus() != ParticipantStatus.KICKED) {
                p.setReady(false);
                gameParticipantRepository.save(p);
            }
        }
        broadcastRoomState(room);
        return roomStateMapper.toStateResponse(room, sessionToken);
    }

    private void startRound(String code, int index) {
        GameRoom room = gameRoomRepository.findByCode(code).orElse(null);
        RoomRuntimeState state = runtimes.get(code);
        if (room == null || state == null) {
            return;
        }

        List<Kanji> pool = kanjiRepository.findByJlptLevelIn(new ArrayList<>(room.getLevels()));
        if (pool.isEmpty()) {
            log.warn("Salon {} : aucun kanji disponible pour les niveaux {}", code, room.getLevels());
            finalizeGame(code, room);
            return;
        }

        Kanji kanji;
        String correctOption = null;
        List<String> options = null;
        if (room.getGameMode() == GameMode.QUIZ) {
            QuizQuestionGenerator.Question question = quizQuestionGenerator.generate(pool, state.usedKanjiIds);
            kanji = question.kanji();
            correctOption = question.correctOption();
            options = question.options();
        } else {
            List<Kanji> available = pool.stream().filter(k -> !state.usedKanjiIds.contains(k.getId())).toList();
            kanji = available.isEmpty() ? pool.get(RANDOM.nextInt(pool.size())) : available.get(RANDOM.nextInt(available.size()));
        }
        state.usedKanjiIds.add(kanji.getId());

        OffsetDateTime endsAt = OffsetDateTime.now().plusSeconds(room.getTimePerQuestionSeconds());
        GameRound round = new GameRound(room, index, room.getPlayCount(), kanji, endsAt);
        gameRoundRepository.save(round);

        state.currentRoundId = round.getId();
        state.currentRoundIndex = index;
        state.correctOption = correctOption;
        state.resetForNewRound();

        messagingTemplate.convertAndSend("/topic/room/" + code + "/round",
                new RoundBroadcast(index, RoundBroadcast.KanjiInfo.from(kanji), options, endsAt));

        state.timeoutFuture = taskScheduler.schedule(() -> advance(code, index), endsAt.toInstant());
    }

    private void advance(String code, int expectedRoundIndex) {
        RoomRuntimeState state = runtimes.get(code);
        if (state == null || state.currentRoundIndex != expectedRoundIndex) {
            return;
        }
        if (!state.advancing.compareAndSet(false, true)) {
            return; // déjà en cours d'avancement (course timeout / dernière réponse)
        }
        if (state.timeoutFuture != null) {
            state.timeoutFuture.cancel(false);
        }

        GameRoom room = gameRoomRepository.findByCode(code).orElse(null);
        if (room == null) {
            return;
        }
        int nextIndex = expectedRoundIndex + 1;
        if (nextIndex >= room.getQuestionCount()) {
            finalizeGame(code, room);
        } else {
            room.setCurrentRoundIndex(nextIndex);
            gameRoomRepository.save(room);
            startRound(code, nextIndex);
        }
    }

    private void finalizeGame(String code, GameRoom room) {
        room.setStatus(RoomStatus.RESULTS);
        gameRoomRepository.save(room);

        List<GameParticipant> participants = gameParticipantRepository.findByRoomIdOrderByJoinedAtAsc(room.getId());
        for (GameParticipant p : participants) {
            if (p.getStatus() != ParticipantStatus.LEFT && p.getStatus() != ParticipantStatus.KICKED) {
                p.setStatus(ParticipantStatus.VIEWING_RESULTS);
                gameParticipantRepository.save(p);
            }
        }

        Map<Long, GameAnswerRepository.ParticipantScore> scoresByParticipant = new java.util.HashMap<>();
        for (var score : gameAnswerRepository.aggregateScoresByRoom(room.getId(), room.getPlayCount())) {
            scoresByParticipant.put(score.getParticipantId(), score);
        }

        Comparator<GameParticipant> byScore = room.getGameMode() == GameMode.QUIZ
                ? Comparator.comparingInt((GameParticipant p) -> scoreOf(scoresByParticipant, p).map(GameAnswerRepository.ParticipantScore::getTotalPoints).orElse(0)).reversed()
                : Comparator.comparingDouble((GameParticipant p) -> scoreOf(scoresByParticipant, p).map(GameAnswerRepository.ParticipantScore::getAvgStrokeScore).orElse(0.0)).reversed();

        List<GameParticipant> ranked = participants.stream()
                .filter(p -> p.getStatus() != ParticipantStatus.LEFT && p.getStatus() != ParticipantStatus.KICKED)
                .sorted(byScore)
                .toList();

        List<ResultsBroadcast.PlayerResult> ranking = new ArrayList<>();
        for (int i = 0; i < ranked.size(); i++) {
            GameParticipant p = ranked.get(i);
            var score = scoreOf(scoresByParticipant, p);
            ranking.add(new ResultsBroadcast.PlayerResult(p.getId(), p.displayName(), i + 1,
                    score.map(GameAnswerRepository.ParticipantScore::getTotalPoints).orElse(0),
                    score.map(GameAnswerRepository.ParticipantScore::getAvgStrokeScore).orElse(null)));
        }

        messagingTemplate.convertAndSend("/topic/room/" + code + "/results", new ResultsBroadcast(ranking));

        RoomRuntimeState state = runtimes.get(code);
        if (state != null) {
            state.autoReplayFuture = taskScheduler.schedule(() -> autoReplay(code), java.time.Instant.now().plus(AUTO_REPLAY_DELAY));
        }
    }

    private java.util.Optional<GameAnswerRepository.ParticipantScore> scoreOf(Map<Long, GameAnswerRepository.ParticipantScore> scores, GameParticipant p) {
        return java.util.Optional.ofNullable(scores.get(p.getId()));
    }

    @Transactional
    void autoReplay(String code) {
        GameRoom room = gameRoomRepository.findByCode(code).orElse(null);
        if (room == null || room.getStatus() != RoomStatus.RESULTS) {
            return;
        }
        gameParticipantRepository.findByRoomIdOrderByJoinedAtAsc(room.getId()).stream()
                .filter(p -> p.getStatus() != ParticipantStatus.LEFT && p.getStatus() != ParticipantStatus.KICKED)
                .findFirst()
                .ifPresent(p -> replay(code, p.getSessionToken()));
    }

    private void broadcastRoomState(GameRoom room) {
        messagingTemplate.convertAndSend("/topic/room/" + room.getCode(), roomStateMapper.toStateResponse(room, null));
    }
}
