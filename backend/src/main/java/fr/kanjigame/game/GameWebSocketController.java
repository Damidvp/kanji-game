package fr.kanjigame.game;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

@Controller
public class GameWebSocketController {

    private final GameEngineService gameEngineService;

    public GameWebSocketController(GameEngineService gameEngineService) {
        this.gameEngineService = gameEngineService;
    }

    @MessageMapping("/room/{code}/answer")
    public void answer(@DestinationVariable String code, AnswerSubmission submission) {
        gameEngineService.submitAnswer(code, submission);
    }

    @MessageMapping("/room/{code}/enter-lobby")
    public void enterLobby(@DestinationVariable String code, EnterLobbyMessage message) {
        gameEngineService.enterLobby(code, message.sessionToken());
    }

    public record EnterLobbyMessage(String sessionToken) {
    }
}
