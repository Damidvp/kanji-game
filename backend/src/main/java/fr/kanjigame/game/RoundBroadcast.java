package fr.kanjigame.game;

import fr.kanjigame.kanji.Kanji;

import java.time.OffsetDateTime;
import java.util.List;

/** Publié sur /topic/room/{code}/round — jamais la bonne réponse pour le Quiz (§8). */
public record RoundBroadcast(int roundIndex, KanjiInfo kanji, List<String> options, OffsetDateTime endsAt) {

    public record KanjiInfo(String character, String onyomi, String kunyomi, Integer strokeCount) {
        public static KanjiInfo from(Kanji kanji) {
            return new KanjiInfo(kanji.getCharacter(), String.join("、", kanji.getOnyomi()),
                    String.join("、", kanji.getKunyomi()), kanji.getStrokeCount());
        }
    }
}
