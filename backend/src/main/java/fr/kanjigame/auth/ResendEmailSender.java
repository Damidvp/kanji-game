package fr.kanjigame.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Envoie via l'API Resend (https://resend.com). Tant que {@code resend.api-key} n'est pas
 * configuré (clé à créer par Damien, cf. EVOLUTIONS.MD), on se contente de logger le contenu de
 * l'email au lieu d'échouer — même logique que le placeholder DeepL utilisé pour l'import kanji,
 * pour ne pas bloquer le développement local en attendant la vraie clé.
 */
@Component
public class ResendEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(ResendEmailSender.class);

    private final RestClient restClient = RestClient.create("https://api.resend.com");
    private final String apiKey;
    private final String fromAddress;

    public ResendEmailSender(@Value("${resend.api-key:}") String apiKey,
                              @Value("${resend.from-address:Kanji Game <onboarding@resend.dev>}") String fromAddress) {
        this.apiKey = apiKey;
        this.fromAddress = fromAddress;
    }

    @Override
    public void send(String to, String subject, String htmlBody) {
        if (apiKey.isBlank()) {
            log.info("resend.api-key non configuré — email non envoyé, contenu pour '{}' ({}) :\n{}", to, subject, htmlBody);
            return;
        }

        restClient.post()
                .uri("/emails")
                .header("Authorization", "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "from", fromAddress,
                        "to", to,
                        "subject", subject,
                        "html", htmlBody
                ))
                .retrieve()
                .toBodilessEntity();
    }
}
