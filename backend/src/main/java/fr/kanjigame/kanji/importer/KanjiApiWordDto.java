package fr.kanjigame.kanji.importer;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record KanjiApiWordDto(
        List<Meaning> meanings,
        List<Variant> variants
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Meaning(List<String> glosses) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Variant(String written, String pronounced) {
    }
}
