package fr.kanjigame.kanji.importer;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Déclenché manuellement : mvn spring-boot:run -Dspring-boot.run.arguments=--kanji.import.enabled=true
 * (voir §6.1/§10 de SPECIFICATIONS_BACKEND.md — pas d'exécution automatique au démarrage).
 */
@Component
@ConditionalOnProperty(name = "kanji.import.enabled", havingValue = "true")
public class KanjiImportRunner implements CommandLineRunner {

    private final KanjiImportService kanjiImportService;

    public KanjiImportRunner(KanjiImportService kanjiImportService) {
        this.kanjiImportService = kanjiImportService;
    }

    @Override
    public void run(String... args) {
        kanjiImportService.importAll();
    }
}
