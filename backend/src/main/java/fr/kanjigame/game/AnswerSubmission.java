package fr.kanjigame.game;

/** Reçu sur /app/room/{code}/answer. Quiz : selectedOption. Écriture : strokeScore/strokeMistakes (§8). */
public record AnswerSubmission(String sessionToken, String selectedOption, Integer strokeScore, Integer strokeMistakes) {
}
