package fr.kanjigame.room;

import fr.kanjigame.game.GameEngineService;
import fr.kanjigame.user.AppUser;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.util.List;
import java.util.Locale;

@Service
@Transactional
public class GameRoomService {

    public static final int MAX_PLAYERS = 8;

    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O/1/I, ambigus
    static final String[] COLOR_TOKENS = {
            "var(--color-n1)", "var(--color-n2)", "var(--color-n3)", "var(--color-n4)", "var(--color-n5)"
    };
    private static final SecureRandom RANDOM = new SecureRandom();

    private final GameRoomRepository gameRoomRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final RoomStateMapper roomStateMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final GameEngineService gameEngineService;

    public GameRoomService(GameRoomRepository gameRoomRepository, GameParticipantRepository gameParticipantRepository,
                            RoomStateMapper roomStateMapper, SimpMessagingTemplate messagingTemplate,
                            GameEngineService gameEngineService) {
        this.gameRoomRepository = gameRoomRepository;
        this.gameParticipantRepository = gameParticipantRepository;
        this.roomStateMapper = roomStateMapper;
        this.messagingTemplate = messagingTemplate;
        this.gameEngineService = gameEngineService;
    }

    public CreateRoomResponse createRoom(CreateRoomRequest request, AppUser host) {
        String hostName = host != null ? host.getPseudo() : requireGuestName(request.guestName());

        GameRoom room = new GameRoom(generateUniqueCode(), generateUniqueSlug(request.gameMode(), hostName),
                request.gameMode(), request.questionCount(), request.timePerQuestion(), request.levels());
        if (host != null) {
            room.setHostUser(host);
        } else {
            room.setHostGuestName(hostName);
        }
        gameRoomRepository.save(room);

        GameParticipant hostParticipant = new GameParticipant(room, host, host == null ? hostName : null,
                request.sessionToken(), initialsOf(hostName), COLOR_TOKENS[0], true);
        gameParticipantRepository.save(hostParticipant);

        return new CreateRoomResponse(room.getCode(), room.getSlug());
    }

    public GameRoom getRoomOrThrow(String code) {
        return gameRoomRepository.findByCode(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Salon introuvable"));
    }

    public RoomStateResponse getRoomState(String code, String requestingSessionToken) {
        return roomStateMapper.toStateResponse(getRoomOrThrow(code), requestingSessionToken);
    }

    public RoomStateResponse joinRoom(String code, JoinRoomRequest request, AppUser user) {
        GameRoom room = getRoomOrThrow(code);

        var existing = gameParticipantRepository.findByRoomIdAndSessionToken(room.getId(), request.sessionToken());
        if (existing.isPresent()) {
            if (existing.get().getStatus() == ParticipantStatus.KICKED) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Vous avez été exclu de ce salon");
            }
            return roomStateMapper.toStateResponse(room, request.sessionToken()); // reconnexion
        }

        if (room.getStatus() != RoomStatus.LOBBY) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La partie a déjà commencé");
        }

        long activeCount = gameParticipantRepository.countByRoomIdAndStatusNotIn(room.getId(),
                List.of(ParticipantStatus.LEFT, ParticipantStatus.KICKED));
        if (activeCount >= MAX_PLAYERS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Salon complet");
        }

        String name = user != null ? user.getPseudo() : requireGuestName(request.guestName());
        String color = COLOR_TOKENS[(int) (activeCount % COLOR_TOKENS.length)];

        GameParticipant participant = new GameParticipant(room, user, user == null ? name : null,
                request.sessionToken(), initialsOf(name), color, false);
        gameParticipantRepository.save(participant);
        return broadcastAndReturn(room, request.sessionToken());
    }

    public RoomStateResponse setReady(String code, String sessionToken, boolean ready) {
        GameRoom room = getRoomOrThrow(code);
        GameParticipant participant = requireParticipant(room, sessionToken);
        participant.setReady(ready);
        gameParticipantRepository.save(participant);
        return broadcastAndReturn(room, sessionToken);
    }

    public RoomStateResponse leave(String code, String sessionToken) {
        GameRoom room = getRoomOrThrow(code);
        GameParticipant participant = requireParticipant(room, sessionToken);
        participant.setStatus(ParticipantStatus.LEFT);
        participant.setLeftAt(java.time.OffsetDateTime.now());
        gameParticipantRepository.save(participant);
        RoomStateResponse response = broadcastAndReturn(room, sessionToken);
        gameEngineService.onParticipantInactive(code); // un départ peut compléter "tout le monde a répondu" (§7.2)
        return response;
    }

    public RoomStateResponse kick(String code, String hostSessionToken, Long targetParticipantId) {
        GameRoom room = getRoomOrThrow(code);
        GameParticipant host = requireParticipant(room, hostSessionToken);
        if (!host.isHost()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seul l'hôte peut exclure un joueur");
        }
        if (room.getStatus() != RoomStatus.LOBBY) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "L'exclusion n'est possible qu'en salon d'attente");
        }
        GameParticipant target = gameParticipantRepository.findById(targetParticipantId)
                .filter(p -> p.getRoom().getId().equals(room.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Participant introuvable"));
        if (target.getId().equals(host.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Impossible de s'auto-exclure");
        }
        target.setStatus(ParticipantStatus.KICKED);
        target.setLeftAt(java.time.OffsetDateTime.now());
        gameParticipantRepository.save(target);
        return broadcastAndReturn(room, hostSessionToken);
    }

    public RoomStateResponse startGame(String code, StartRoomRequest request) {
        GameRoom room = getRoomOrThrow(code);
        GameParticipant caller = requireParticipant(room, request.sessionToken());

        if (!caller.isHost()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seul l'hôte peut lancer la partie");
        }
        if (room.getStatus() != RoomStatus.LOBBY) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La partie a déjà commencé");
        }

        room.setStatus(RoomStatus.IN_PROGRESS);
        room.setCurrentRoundIndex(0);
        gameRoomRepository.save(room);
        return broadcastAndReturn(room, request.sessionToken());
    }

    public RoomStateResponse updateSettings(String code, UpdateRoomSettingsRequest request) {
        GameRoom room = getRoomOrThrow(code);
        GameParticipant host = requireParticipant(room, request.sessionToken());
        if (!host.isHost()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seul l'hôte peut modifier les paramètres");
        }
        if (room.getStatus() != RoomStatus.LOBBY) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Impossible de modifier les paramètres, la partie a déjà commencé");
        }
        room.setGameMode(request.gameMode());
        room.setLevels(request.levels());
        room.setQuestionCount(request.questionCount());
        room.setTimePerQuestionSeconds(request.timePerQuestion());
        gameRoomRepository.save(room);
        return broadcastAndReturn(room, request.sessionToken());
    }

    private GameParticipant requireParticipant(GameRoom room, String sessionToken) {
        return gameParticipantRepository.findByRoomIdAndSessionToken(room.getId(), sessionToken)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Vous ne faites pas partie de ce salon"));
    }

    private RoomStateResponse broadcastAndReturn(GameRoom room, String requestingSessionToken) {
        RoomStateResponse forCaller = roomStateMapper.toStateResponse(room, requestingSessionToken);
        messagingTemplate.convertAndSend("/topic/room/" + room.getCode(), roomStateMapper.toStateResponse(room, null));
        return forCaller;
    }

    private String requireGuestName(String guestName) {
        if (guestName == null || guestName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "guestName requis pour un invité");
        }
        return guestName.trim();
    }

    private String initialsOf(String name) {
        String trimmed = name.trim();
        if (trimmed.isEmpty()) {
            return "??";
        }
        String[] parts = trimmed.split("\\s+");
        if (parts.length >= 2) {
            return ("" + parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase(Locale.ROOT);
        }
        return trimmed.substring(0, Math.min(2, trimmed.length())).toUpperCase(Locale.ROOT);
    }

    private String generateUniqueCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder(6);
            for (int i = 0; i < 6; i++) {
                sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
            }
            code = sb.toString();
        } while (gameRoomRepository.existsByCode(code));
        return code;
    }

    private String generateUniqueSlug(GameMode gameMode, String hostName) {
        String base = (gameMode.name().toLowerCase(Locale.ROOT) + "-" + slugify(hostName));
        String slug;
        do {
            slug = base + "-" + Integer.toHexString(RANDOM.nextInt(0xFFF));
        } while (gameRoomRepository.existsBySlug(slug));
        return slug;
    }

    private String slugify(String name) {
        String normalized = java.text.Normalizer.normalize(name, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return normalized.isEmpty() ? "joueur" : normalized;
    }
}
