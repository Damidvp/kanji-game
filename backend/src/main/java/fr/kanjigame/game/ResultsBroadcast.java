package fr.kanjigame.game;

import java.util.List;

/** Publié sur /topic/room/{code}/results — classement final (§7.1/§7.3/§8). */
public record ResultsBroadcast(List<PlayerResult> ranking) {

    public record PlayerResult(Long participantId, String name, int rank, int totalPoints, Double avgStrokeScore) {
    }
}
