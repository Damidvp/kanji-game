package fr.kanjigame.kanji.importer;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Client minimal pour l'API DeepL (traduction des significations de kanji EN -> FR, §6 de
 * SPECIFICATIONS_BACKEND.md). Tant que {@code deepl.api-key} n'est pas configuré (clé à créer
 * par Damien), {@link #translateToFrench} renvoie la liste d'entrée telle quelle sans appel
 * réseau — même repli que {@code ResendEmailSender} pour l'e-mail, pour ne pas bloquer le
 * développement local en attendant la vraie clé.
 */
@Component
public class DeepLClient {

    private static final int MAX_RETRIES = 5;
    private static final long RETRY_BASE_DELAY_MS = 1000;

    private final RestClient restClient;
    private final String apiKey;

    public DeepLClient(@Value("${deepl.api-key:}") String apiKey) {
        this.apiKey = apiKey;
        // Convention DeepL : les clés API Free se terminent par ":fx" et utilisent un hôte dédié.
        String baseUrl = apiKey.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
        this.restClient = RestClient.create(baseUrl);
    }

    public boolean isConfigured() {
        return !apiKey.isBlank();
    }

    public List<String> translateToFrench(List<String> texts) {
        if (!isConfigured() || texts.isEmpty()) {
            return texts;
        }
        // Le palier gratuit DeepL applique un rate-limit assez strict sur les rafales de
        // requêtes : on retente avec un backoff linéaire sur 429 plutôt que d'abandonner
        // immédiatement (observé en pratique : la plupart des appels échouaient en 429 avec
        // seulement 4 threads concurrents lors du premier essai).
        for (int attempt = 0; ; attempt++) {
            try {
                DeepLResponse response = restClient.post()
                        .uri("/v2/translate")
                        .header("Authorization", "DeepL-Auth-Key " + apiKey)
                        .body(Map.of("text", texts, "source_lang", "EN", "target_lang", "FR"))
                        .retrieve()
                        .body(DeepLResponse.class);
                if (response == null || response.translations() == null) {
                    return texts;
                }
                return response.translations().stream().map(DeepLResponse.Translation::text).toList();
            } catch (HttpClientErrorException.TooManyRequests e) {
                if (attempt >= MAX_RETRIES) {
                    throw e;
                }
                sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
            }
        }
    }

    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private record DeepLResponse(List<Translation> translations) {
        record Translation(String text) {
        }
    }
}
