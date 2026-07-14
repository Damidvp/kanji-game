package fr.kanjigame.user;

import fr.kanjigame.kanji.JlptLevel;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private static final DateTimeFormatter MEMBER_SINCE_FORMAT = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.FRENCH);

    private final AppUserRepository appUserRepository;
    private final ProfileStatsService profileStatsService;

    public ProfileController(AppUserRepository appUserRepository, ProfileStatsService profileStatsService) {
        this.appUserRepository = appUserRepository;
        this.profileStatsService = profileStatsService;
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
}
