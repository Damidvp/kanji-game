package fr.kanjigame.kanji.importer;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class KanjiApiClient {

    private final RestClient restClient = RestClient.create("https://kanjiapi.dev/v1");

    public KanjiApiKanjiDto fetchKanji(String character) {
        return restClient.get()
                .uri("/kanji/{character}", character)
                .retrieve()
                .body(KanjiApiKanjiDto.class);
    }

    public KanjiApiWordDto[] fetchWords(String character) {
        KanjiApiWordDto[] result = restClient.get()
                .uri("/words/{character}", character)
                .retrieve()
                .body(KanjiApiWordDto[].class);
        return result != null ? result : new KanjiApiWordDto[0];
    }
}
