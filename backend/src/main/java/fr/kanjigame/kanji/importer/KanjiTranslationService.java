package fr.kanjigame.kanji.importer;

import fr.kanjigame.kanji.Kanji;
import fr.kanjigame.kanji.KanjiRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Traduit les significations des kanji (EN -> FR) via DeepL, §6 de SPECIFICATIONS_BACKEND.md.
 * Ne concerne que {@code kanji.meanings_fr} (2140 lignes) — {@code kanji_word.meanings_fr}
 * (mots associés, ~443k lignes) n'est volontairement pas traduit : ces significations ne sont
 * exposées par aucun endpoint côté frontend actuellement, les traduire gâcherait le quota DeepL
 * gratuit pour rien (scope acté avec Damien). Idempotent via {@code translation_reviewed} : ne
 * retraite pas les kanji déjà traduits, pour pouvoir relancer sans reconsommer de quota.
 */
@Service
public class KanjiTranslationService {

    private static final Logger log = LoggerFactory.getLogger(KanjiTranslationService.class);
    // Séquentiel : le palier gratuit DeepL rate-limite sévèrement les rafales de requêtes
    // concurrentes (observé avec 4 threads : la quasi-totalité des appels échouait en 429).
    private static final int THREAD_COUNT = 1;

    private final KanjiRepository kanjiRepository;
    private final DeepLClient deepLClient;

    public KanjiTranslationService(KanjiRepository kanjiRepository, DeepLClient deepLClient) {
        this.kanjiRepository = kanjiRepository;
        this.deepLClient = deepLClient;
    }

    public void translateAll() {
        if (!deepLClient.isConfigured()) {
            log.info("deepl.api-key non configuré — traduction ignorée, meanings_fr reste = meanings_en.");
            return;
        }

        List<Kanji> pending = kanjiRepository.findByTranslationReviewedFalse();
        log.info("Traduction FR : {} kanji à traiter", pending.size());

        AtomicInteger done = new AtomicInteger();
        AtomicInteger failed = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(THREAD_COUNT);
        for (Kanji kanji : pending) {
            pool.submit(() -> translateOne(kanji, done, failed, pending.size()));
        }
        pool.shutdown();
        try {
            pool.awaitTermination(1, TimeUnit.HOURS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        log.info("Traduction FR terminée : {} traités, {} échecs", done.get(), failed.get());
    }

    private void translateOne(Kanji kanji, AtomicInteger done, AtomicInteger failed, int total) {
        try {
            List<String> meaningsEn = kanji.getMeaningsEn();
            List<String> meaningsFr = meaningsEn.isEmpty() ? meaningsEn : deepLClient.translateToFrench(meaningsEn);
            kanji.setMeaningsFr(meaningsFr);
            kanji.setTranslationReviewed(true);
            kanjiRepository.save(kanji);
        } catch (Exception e) {
            failed.incrementAndGet();
            log.warn("Échec traduction kanji '{}': {}", kanji.getCharacter(), e.getMessage());
        } finally {
            int n = done.incrementAndGet();
            if (n % 100 == 0) {
                log.info("Progression traduction : {}/{}", n, total);
            }
        }
    }
}
