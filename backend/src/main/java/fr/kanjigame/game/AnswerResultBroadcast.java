package fr.kanjigame.game;

/**
 * Publié sur /topic/room/{code}/answer-result/{participantId} juste après l'enregistrement
 * d'une réponse Quiz — confirmation privée (correct/faux + points + bonne réponse) pour ce
 * joueur uniquement. Le sujet est scopé par participantId (pas un vrai canal STOMP
 * "utilisateur", la connexion WS n'étant pas authentifiée) : seul le joueur connaissant son
 * propre participantId s'y abonne. La bonne réponse n'est donc révélée qu'à celui qui vient de
 * répondre, pas au reste du salon (qui continue de voir uniquement round-status : qui a répondu).
 */
public record AnswerResultBroadcast(int roundIndex, boolean correct, int points, String correctOption) {
}
