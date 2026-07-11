package fr.kanjigame.room;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GameParticipantRepository extends JpaRepository<GameParticipant, Long> {

    List<GameParticipant> findByRoomIdOrderByJoinedAtAsc(Long roomId);

    Optional<GameParticipant> findByRoomIdAndSessionToken(Long roomId, String sessionToken);

    long countByRoomIdAndStatusNotIn(Long roomId, List<ParticipantStatus> statuses);
}
