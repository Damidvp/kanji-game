package fr.kanjigame.kanji;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface KanjiRepository extends JpaRepository<Kanji, Long> {

    Optional<Kanji> findByCharacter(String character);

    boolean existsByCharacter(String character);

    List<Kanji> findByJlptLevelIn(List<JlptLevel> levels);

    List<Kanji> findByTranslationReviewedFalse();
}
