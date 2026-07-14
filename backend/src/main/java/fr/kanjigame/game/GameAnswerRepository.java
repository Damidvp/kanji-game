package fr.kanjigame.game;

import fr.kanjigame.kanji.JlptLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GameAnswerRepository extends JpaRepository<GameAnswer, Long> {

    Optional<GameAnswer> findByRoundIdAndParticipantId(Long roundId, Long participantId);

    List<GameAnswer> findByRoundId(Long roundId);

    @Query("""
            SELECT a.participant.id AS participantId,
                   COALESCE(SUM(a.points), 0) AS totalPoints,
                   AVG(a.strokeScore) AS avgStrokeScore
            FROM GameAnswer a
            WHERE a.round.room.id = :roomId AND a.round.playCount = :playCount
            GROUP BY a.participant.id
            """)
    List<ParticipantScore> aggregateScoresByRoom(@Param("roomId") Long roomId, @Param("playCount") int playCount);

    interface ParticipantScore {
        Long getParticipantId();
        Integer getTotalPoints();
        Double getAvgStrokeScore();
    }

    @Query("""
            SELECT a.round.room.id AS roomId,
                   a.round.playCount AS playCount,
                   a.round.kanji.jlptLevel AS jlptLevel,
                   a.isCorrect AS isCorrect,
                   a.strokeScore AS strokeScore
            FROM GameAnswer a
            WHERE a.participant.user.id = :userId
            """)
    List<UserAnswerStat> findAnswerStatsByUserId(@Param("userId") Long userId);

    interface UserAnswerStat {
        Long getRoomId();
        Integer getPlayCount();
        JlptLevel getJlptLevel();
        Boolean getIsCorrect();
        Integer getStrokeScore();
    }
}
