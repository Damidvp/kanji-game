package fr.kanjigame.game;

import java.util.List;

/** Publié sur /topic/room/{code}/round-status — qui a répondu, sans le contenu (§8). */
public record RoundStatusBroadcast(int roundIndex, List<Long> answeredParticipantIds, int totalActiveParticipants) {
}
