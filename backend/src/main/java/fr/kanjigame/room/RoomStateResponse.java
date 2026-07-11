package fr.kanjigame.room;

import fr.kanjigame.kanji.JlptLevel;

import java.util.List;
import java.util.Set;

public record RoomStateResponse(
        String code,
        String slug,
        GameMode gameMode,
        Set<JlptLevel> levels,
        int questionCount,
        int timePerQuestionSeconds,
        RoomStatus status,
        int currentRoundIndex,
        List<ParticipantResponse> participants
) {
    public record ParticipantResponse(
            Long id,
            String name,
            String initials,
            String color,
            boolean isHost,
            boolean ready,
            ParticipantStatus status,
            JlptLevel objectiveLevel,
            boolean isYou
    ) {
        public static ParticipantResponse from(GameParticipant p, String requestingSessionToken) {
            JlptLevel objectiveLevel = p.getUser() != null ? p.getUser().getObjectiveLevel() : null;
            boolean isYou = requestingSessionToken != null && requestingSessionToken.equals(p.getSessionToken());
            return new ParticipantResponse(p.getId(), p.displayName(), p.getInitials(), p.getColor(),
                    p.isHost(), p.isReady(), p.getStatus(), objectiveLevel, isYou);
        }
    }
}
