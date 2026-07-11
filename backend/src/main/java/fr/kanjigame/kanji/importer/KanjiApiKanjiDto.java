package fr.kanjigame.kanji.importer;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record KanjiApiKanjiDto(
        String kanji,
        List<String> on_readings,
        List<String> kun_readings,
        List<String> meanings,
        Integer stroke_count
) {
}
