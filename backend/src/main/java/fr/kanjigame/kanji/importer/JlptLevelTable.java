package fr.kanjigame.kanji.importer;

import com.fasterxml.jackson.databind.ObjectMapper;
import fr.kanjigame.kanji.JlptLevel;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Table de correspondance statique caractère -> niveau JLPT, versionnée dans
 * resources/data/jlpt-levels.json (voir §6.2 de SPECIFICATIONS_BACKEND.md : le champ
 * "jlpt" de kanjiapi.dev est incomplet/incohérent avec la répartition JLPT réelle,
 * donc on fige une table plutôt que de la déduire dynamiquement à chaque import).
 */
@Component
public class JlptLevelTable {

    private final Map<String, JlptLevel> levelsByCharacter;

    public JlptLevelTable(ObjectMapper objectMapper) {
        try (InputStream in = new ClassPathResource("data/jlpt-levels.json").getInputStream()) {
            Map<String, String> raw = objectMapper.readValue(in, Map.class);
            this.levelsByCharacter = raw.entrySet().stream()
                    .collect(Collectors.toMap(Map.Entry::getKey, e -> JlptLevel.valueOf(e.getValue())));
        } catch (IOException e) {
            throw new IllegalStateException("Impossible de charger data/jlpt-levels.json", e);
        }
    }

    public Map<String, JlptLevel> all() {
        return levelsByCharacter;
    }

    public JlptLevel levelOf(String character) {
        return levelsByCharacter.getOrDefault(character, JlptLevel.N1);
    }
}
