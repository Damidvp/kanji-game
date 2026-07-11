package fr.kanjigame.game;

import fr.kanjigame.kanji.Kanji;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;

/**
 * Reproduit côté serveur buildQuizQuestions de frontend/src/mocks/kanji.ts (§7.1) :
 * 4 propositions, 1 correcte, 3 distracteurs tirés des significations d'autres kanji du pool.
 */
@Component
public class QuizQuestionGenerator {

    private static final SecureRandom RANDOM = new SecureRandom();

    public record Question(Kanji kanji, List<String> options, String correctOption) {
    }

    public Question generate(List<Kanji> pool, Set<Long> excludeKanjiIds) {
        List<Kanji> available = pool.stream().filter(k -> !excludeKanjiIds.contains(k.getId())).toList();
        if (available.isEmpty()) {
            available = pool; // repli : plus assez de kanji non utilisés, on autorise la répétition
        }
        Kanji chosen = available.get(RANDOM.nextInt(available.size()));
        String correctOption = firstMeaning(chosen);

        List<Kanji> distractorPool = new ArrayList<>(pool.stream().filter(k -> !k.getId().equals(chosen.getId())).toList());
        Collections.shuffle(distractorPool, RANDOM);

        List<String> options = new ArrayList<>();
        options.add(correctOption);
        for (Kanji k : distractorPool) {
            if (options.size() >= 4) {
                break;
            }
            String meaning = firstMeaning(k);
            if (!options.contains(meaning)) {
                options.add(meaning);
            }
        }
        Collections.shuffle(options, RANDOM);

        return new Question(chosen, options, correctOption);
    }

    private String firstMeaning(Kanji kanji) {
        List<String> meanings = kanji.getMeaningsFr();
        return meanings.isEmpty() ? kanji.getCharacter() : meanings.get(0);
    }
}
