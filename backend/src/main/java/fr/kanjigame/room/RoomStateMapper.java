package fr.kanjigame.room;

import org.springframework.stereotype.Component;

@Component
public class RoomStateMapper {

    private final GameParticipantRepository gameParticipantRepository;

    public RoomStateMapper(GameParticipantRepository gameParticipantRepository) {
        this.gameParticipantRepository = gameParticipantRepository;
    }

    public RoomStateResponse toStateResponse(GameRoom room, String requestingSessionToken) {
        var participants = gameParticipantRepository.findByRoomIdOrderByJoinedAtAsc(room.getId()).stream()
                .map(p -> RoomStateResponse.ParticipantResponse.from(p, requestingSessionToken))
                .toList();
        return new RoomStateResponse(room.getCode(), room.getSlug(), room.getGameMode(), room.getLevels(),
                room.getQuestionCount(), room.getTimePerQuestionSeconds(), room.getStatus(), room.getCurrentRoundIndex(),
                participants);
    }
}
