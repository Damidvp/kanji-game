package fr.kanjigame.game;

/**
 * Publié sur /topic/room/{code}/answer-result/{participantId} juste après l'enregistrement
 * d'une réponse Quiz — confirmation privée (correct/faux + points) pour ce joueur uniquement.
 * Le sujet est scopé par participantId (pas un vrai canal STOMP "utilisateur", la connexion
 * WS n'étant pas authentifiée) : seul le joueur connaissant son propre participantId s'y abonne.
 */
public record AnswerResultBroadcast(int roundIndex, boolean correct, int points) {
}
