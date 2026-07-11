package fr.kanjigame.kanji.importer;

import fr.kanjigame.kanji.Kanji;
import fr.kanjigame.kanji.KanjiRepository;
import fr.kanjigame.kanji.KanjiWord;
import fr.kanjigame.kanji.JlptLevel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Import du référentiel kanji Jōyō depuis kanjiapi.dev (§6/§10 de SPECIFICATIONS_BACKEND.md).
 * Sans DeepL pour l'instant : meanings_fr = meanings_en (placeholder), translation_reviewed = false.
 * Idempotent : les kanji déjà présents en base (par caractère) sont sautés, pour pouvoir relancer
 * l'import en cas d'échec partiel sans tout refaire.
 */
@Service
public class KanjiImportService {

    private static final Logger log = LoggerFactory.getLogger(KanjiImportService.class);
    private static final int THREAD_COUNT = 8;

    private final KanjiApiClient apiClient;
    private final KanjiRepository kanjiRepository;
    private final JlptLevelTable jlptLevelTable;

    public KanjiImportService(KanjiApiClient apiClient, KanjiRepository kanjiRepository, JlptLevelTable jlptLevelTable) {
        this.apiClient = apiClient;
        this.kanjiRepository = kanjiRepository;
        this.jlptLevelTable = jlptLevelTable;
    }

    public void importAll() {
        Map<String, JlptLevel> allCharacters = jlptLevelTable.all();
        log.info("Import kanji : {} caractères Jōyō à traiter", allCharacters.size());

        AtomicInteger done = new AtomicInteger();
        AtomicInteger imported = new AtomicInteger();
        AtomicInteger skipped = new AtomicInteger();
        AtomicInteger failed = new AtomicInteger();

        ExecutorService pool = Executors.newFixedThreadPool(THREAD_COUNT);
        allCharacters.forEach((character, level) -> pool.submit(() -> {
            try {
                if (kanjiRepository.existsByCharacter(character)) {
                    skipped.incrementAndGet();
                } else {
                    importOne(character, level);
                    imported.incrementAndGet();
                }
            } catch (Exception e) {
                failed.incrementAndGet();
                log.warn("Échec import kanji '{}': {}", character, e.getMessage());
            } finally {
                int n = done.incrementAndGet();
                if (n % 100 == 0) {
                    log.info("Progression import kanji : {}/{}", n, allCharacters.size());
                }
            }
        }));

        pool.shutdown();
        try {
            pool.awaitTermination(1, TimeUnit.HOURS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        log.info("Import kanji terminé : {} importés, {} déjà présents, {} échecs", imported.get(), skipped.get(), failed.get());
    }

    private void importOne(String character, JlptLevel level) {
        KanjiApiKanjiDto details = apiClient.fetchKanji(character);

        Kanji kanji = new Kanji(character, level);
        kanji.setOnyomi(details.on_readings() != null ? details.on_readings() : List.of());
        kanji.setKunyomi(details.kun_readings() != null ? details.kun_readings() : List.of());
        kanji.setStrokeCount(details.stroke_count());
        List<String> meanings = details.meanings() != null ? details.meanings() : List.of();
        kanji.setMeaningsEn(meanings);
        kanji.setMeaningsFr(meanings); // placeholder en attendant DeepL, cf §6.5
        kanji.setTranslationReviewed(false);

        for (KanjiApiWordDto wordDto : apiClient.fetchWords(character)) {
            if (wordDto.variants() == null || wordDto.variants().isEmpty()) {
                continue;
            }
            KanjiApiWordDto.Variant variant = wordDto.variants().get(0);
            if (variant.written() == null || variant.pronounced() == null) {
                continue;
            }
            List<String> glosses = wordDto.meanings() == null ? List.of()
                    : wordDto.meanings().stream()
                        .filter(m -> m.glosses() != null)
                        .flatMap(m -> m.glosses().stream())
                        .toList();

            KanjiWord word = new KanjiWord(kanji, variant.written(), variant.pronounced());
            word.setMeaningsEn(glosses);
            word.setMeaningsFr(glosses); // placeholder en attendant DeepL
            kanji.getWords().add(word);
        }

        kanjiRepository.save(kanji);
    }
}
