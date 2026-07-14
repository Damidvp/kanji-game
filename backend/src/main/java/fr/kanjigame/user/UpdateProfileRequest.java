package fr.kanjigame.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank @Size(min = 2, max = 32) String pseudo,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank String currentPassword,
        @Size(min = 8, max = 72) String newPassword
) {
}
