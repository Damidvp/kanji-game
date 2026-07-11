package fr.kanjigame.kanji;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

@RestController
public class KanjiController {

    private final KanjiRepository kanjiRepository;

    public KanjiController(KanjiRepository kanjiRepository) {
        this.kanjiRepository = kanjiRepository;
    }

    @GetMapping("/api/kanji")
    public List<KanjiResponse> getKanji(@RequestParam(required = false) String levels) {
        List<JlptLevel> parsedLevels = levels == null || levels.isBlank()
                ? List.of(JlptLevel.values())
                : Arrays.stream(levels.split(",")).map(String::trim).map(JlptLevel::valueOf).toList();

        return kanjiRepository.findByJlptLevelIn(parsedLevels).stream()
                .map(KanjiResponse::from)
                .toList();
    }
}
