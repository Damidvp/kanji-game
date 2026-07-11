package fr.kanjigame.room;

import fr.kanjigame.game.GameEngineService;
import fr.kanjigame.user.AppUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final GameRoomService gameRoomService;
    private final GameEngineService gameEngineService;

    public RoomController(GameRoomService gameRoomService, GameEngineService gameEngineService) {
        this.gameRoomService = gameRoomService;
        this.gameEngineService = gameEngineService;
    }

    @PostMapping
    public CreateRoomResponse create(@Valid @RequestBody CreateRoomRequest request, @AuthenticationPrincipal AppUser user) {
        return gameRoomService.createRoom(request, user);
    }

    @GetMapping("/{code}")
    public RoomStateResponse getState(@PathVariable String code, @RequestParam(required = false) String sessionToken) {
        return gameRoomService.getRoomState(code, sessionToken);
    }

    @PostMapping("/{code}/join")
    public RoomStateResponse join(@PathVariable String code, @Valid @RequestBody JoinRoomRequest request, @AuthenticationPrincipal AppUser user) {
        return gameRoomService.joinRoom(code, request, user);
    }

    @PostMapping("/{code}/ready")
    public RoomStateResponse ready(@PathVariable String code, @Valid @RequestBody ReadyRequest request) {
        return gameRoomService.setReady(code, request.sessionToken(), request.ready());
    }

    @PostMapping("/{code}/leave")
    public RoomStateResponse leave(@PathVariable String code, @Valid @RequestBody LeaveRequest request) {
        return gameRoomService.leave(code, request.sessionToken());
    }

    @PostMapping("/{code}/kick")
    public RoomStateResponse kick(@PathVariable String code, @Valid @RequestBody KickRequest request) {
        return gameRoomService.kick(code, request.sessionToken(), request.targetParticipantId());
    }

    @PostMapping("/{code}/start")
    public RoomStateResponse start(@PathVariable String code, @Valid @RequestBody StartRoomRequest request) {
        RoomStateResponse response = gameRoomService.startGame(code, request);
        gameEngineService.startGame(code);
        return response;
    }

    @PostMapping("/{code}/replay")
    public RoomStateResponse replay(@PathVariable String code, @Valid @RequestBody StartRoomRequest request) {
        return gameEngineService.replay(code, request.sessionToken());
    }
}
