package fr.kanjigame.user;

import fr.kanjigame.kanji.JlptLevel;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final AppUserRepository appUserRepository;

    public ProfileController(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    @GetMapping("/me")
    public ProfileResponse me(@AuthenticationPrincipal AppUser user) {
        return ProfileResponse.from(user);
    }

    @PutMapping("/objective-level")
    public ProfileResponse updateObjectiveLevel(@AuthenticationPrincipal AppUser user, @RequestBody ObjectiveLevelRequest request) {
        user.setObjectiveLevel(request.objectiveLevel());
        appUserRepository.save(user);
        return ProfileResponse.from(user);
    }

    public record ProfileResponse(String pseudo, String email, JlptLevel objectiveLevel) {
        static ProfileResponse from(AppUser user) {
            return new ProfileResponse(user.getPseudo(), user.getEmail(), user.getObjectiveLevel());
        }
    }

    public record ObjectiveLevelRequest(JlptLevel objectiveLevel) {
    }
}
