package fr.kanjigame.game;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * État éphémère (en mémoire, non persisté) d'une partie en cours pour un salon.
 * Perdu si le serveur redémarre — acceptable pour cette V1 (instance unique, pas de cluster).
 */
class RoomRuntimeState {

    volatile Long currentRoundId;
    volatile int currentRoundIndex;
    volatile String correctOption;
    final Set<Long> answeredParticipantIds = ConcurrentHashMap.newKeySet();
    final Set<Long> usedKanjiIds = Collections.synchronizedSet(new HashSet<>());
    volatile ScheduledFuture<?> timeoutFuture;
    // Délai de grâce laissé à l'hôte pour cliquer "Suivant" une fois tout le monde répondu,
    // avant l'avance automatique — cf. GameEngineService.GRACE_SECONDS.
    volatile ScheduledFuture<?> graceFuture;
    volatile ScheduledFuture<?> autoReplayFuture;
    final AtomicBoolean advancing = new AtomicBoolean(false);

    void resetForNewRound() {
        answeredParticipantIds.clear();
        advancing.set(false);
    }
}
