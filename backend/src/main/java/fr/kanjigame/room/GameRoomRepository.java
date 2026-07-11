package fr.kanjigame.room;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GameRoomRepository extends JpaRepository<GameRoom, Long> {

    Optional<GameRoom> findByCode(String code);

    boolean existsByCode(String code);

    boolean existsBySlug(String slug);
}
