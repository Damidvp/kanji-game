package fr.kanjigame.kanji;

import java.util.List;

/**
 * Forme compatible avec frontend/src/mocks/kanji.ts (MockKanji) — voir §6 de
 * SPECIFICATIONS_BACKEND.md : onyomi/kunyomi/meaningFr sont des chaînes jointes,
 * pas les tableaux bruts stockés en base.
 */
public record KanjiResponse(String character, String onyomi, String kunyomi, String meaningFr, JlptLevel jlptLevel) {

    public static KanjiResponse from(Kanji kanji) {
        return new KanjiResponse(
                kanji.getCharacter(),
                String.join("、", kanji.getOnyomi()),
                String.join("、", kanji.getKunyomi()),
                String.join(", ", firstMeanings(kanji)),
                kanji.getJlptLevel()
        );
    }

    private static List<String> firstMeanings(Kanji kanji) {
        List<String> meanings = kanji.getMeaningsFr();
        return meanings.isEmpty() ? meanings : meanings.subList(0, Math.min(2, meanings.size()));
    }
}
