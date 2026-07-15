package fr.kanjigame.kanji.importer;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Déclenché manuellement : mvn spring-boot:run -Dspring-boot.run.arguments=--kanji.translate.enabled=true
 * (même convention que KanjiImportRunner — pas d'exécution automatique au démarrage).
 */
@Component
@ConditionalOnProperty(name = "kanji.translate.enabled", havingValue = "true")
public class KanjiTranslationRunner implements CommandLineRunner {

    private final KanjiTranslationService kanjiTranslationService;

    public KanjiTranslationRunner(KanjiTranslationService kanjiTranslationService) {
        this.kanjiTranslationService = kanjiTranslationService;
    }

    @Override
    public void run(String... args) {
        kanjiTranslationService.translateAll();
    }
}
