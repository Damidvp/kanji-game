package fr.kanjigame.auth;

import fr.kanjigame.user.AppUser;
import fr.kanjigame.user.AppUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Optional;

@Service
public class PasswordResetService {

    private static final long TOKEN_VALIDITY_HOURS = 1;

    private final AppUserRepository appUserRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;
    private final String frontendUrl;
    private final SecureRandom secureRandom = new SecureRandom();

    public PasswordResetService(AppUserRepository appUserRepository,
                                 PasswordResetTokenRepository tokenRepository,
                                 PasswordEncoder passwordEncoder,
                                 EmailSender emailSender,
                                 @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.appUserRepository = appUserRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailSender = emailSender;
        this.frontendUrl = frontendUrl;
    }

    /** Ne révèle jamais si l'email correspond à un compte existant (anti-énumération). */
    @Transactional
    public void requestReset(String email) {
        Optional<AppUser> user = appUserRepository.findByEmail(email);
        if (user.isEmpty()) {
            return;
        }

        String token = generateToken();
        OffsetDateTime expiresAt = OffsetDateTime.now().plusHours(TOKEN_VALIDITY_HOURS);
        tokenRepository.save(new PasswordResetToken(user.get(), token, expiresAt));

        String resetLink = frontendUrl + "/reinitialiser-mot-de-passe?token=" + token;
        String html = """
                <p>Tu as demandé la réinitialisation de ton mot de passe Kanji Game.</p>
                <p><a href="%s">Choisir un nouveau mot de passe</a></p>
                <p>Ce lien expire dans 1 heure. Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>
                """.formatted(resetLink);
        emailSender.send(user.get().getEmail(), "Réinitialisation de ton mot de passe Kanji Game", html);
    }

    /** @return true si le token était valide et le mot de passe a été changé. */
    @Transactional
    public boolean resetPassword(String token, String newPassword) {
        Optional<PasswordResetToken> resetToken = tokenRepository.findByToken(token);
        if (resetToken.isEmpty() || !resetToken.get().isValid(OffsetDateTime.now())) {
            return false;
        }

        AppUser user = resetToken.get().getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        appUserRepository.save(user);
        resetToken.get().setUsedAt(OffsetDateTime.now());
        tokenRepository.save(resetToken.get());
        return true;
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
