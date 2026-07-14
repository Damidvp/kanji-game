package fr.kanjigame.user;

import fr.kanjigame.auth.JwtService;
import fr.kanjigame.kanji.JlptLevel;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private static final DateTimeFormatter MEMBER_SINCE_FORMAT = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.FRENCH);

    private final AppUserRepository appUserRepository;
    private final ProfileStatsService profileStatsService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public ProfileController(AppUserRepository appUserRepository, ProfileStatsService profileStatsService,
                              PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.appUserRepository = appUserRepository;
        this.profileStatsService = profileStatsService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @GetMapping("/me")
    public ProfileResponse me(@AuthenticationPrincipal AppUser user) {
        return toResponse(user);
    }

    @PutMapping("/objective-level")
    public ProfileResponse updateObjectiveLevel(@AuthenticationPrincipal AppUser user, @RequestBody ObjectiveLevelRequest request) {
        user.setObjectiveLevel(request.objectiveLevel());
        appUserRepository.save(user);
        return toResponse(user);
    }

    @PutMapping
    public ProfileUpdateResponse updateProfile(@AuthenticationPrincipal AppUser user, @Valid @RequestBody UpdateProfileRequest request) {
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Mot de passe actuel incorrect");
        }
        if (!request.pseudo().equals(user.getPseudo()) && appUserRepository.existsByPseudo(request.pseudo())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Pseudo déjà pris");
        }
        if (!request.email().equals(user.getEmail()) && appUserRepository.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email déjà utilisé");
        }

        user.setPseudo(request.pseudo());
        user.setEmail(request.email());
        if (request.newPassword() != null && !request.newPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        }
        appUserRepository.save(user);

        // L'email peut avoir changé : le sujet du JWT (findByEmail) ne correspondrait plus à
        // l'ancien token, il faut donc en émettre un nouveau pour garder l'utilisateur connecté.
        String token = jwtService.generateToken(user.getEmail());
        return new ProfileUpdateResponse(toResponse(user), token);
    }

    private ProfileResponse toResponse(AppUser user) {
        ProfileStatsService.ProfileStats stats = profileStatsService.computeStats(user.getId());
        List<LevelStatResponse> perLevel = stats.perLevel().stream()
                .map(s -> new LevelStatResponse(s.level(), s.averageScore()))
                .toList();
        return new ProfileResponse(
                user.getPseudo(),
                user.getEmail(),
                user.getObjectiveLevel(),
                user.getCreatedAt().format(MEMBER_SINCE_FORMAT),
                stats.gamesPlayed(),
                stats.averageScore(),
                perLevel
        );
    }

    public record ProfileResponse(
            String pseudo,
            String email,
            JlptLevel objectiveLevel,
            String memberSince,
            int gamesPlayed,
            int averageScore,
            List<LevelStatResponse> perLevel
    ) {
    }

    public record LevelStatResponse(JlptLevel level, int averageScore) {
    }

    public record ObjectiveLevelRequest(JlptLevel objectiveLevel) {
    }

    public record ProfileUpdateResponse(ProfileResponse profile, String token) {
    }
}
