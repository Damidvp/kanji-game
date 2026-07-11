package fr.kanjigame.game;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GameRoundRepository extends JpaRepository<GameRound, Long> {

    Optional<GameRound> findByRoomIdAndRoundIndex(Long roomId, int roundIndex);

    List<GameRound> findByRoomIdOrderByRoundIndexAsc(Long roomId);
}
