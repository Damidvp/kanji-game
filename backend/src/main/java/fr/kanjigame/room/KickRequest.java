package fr.kanjigame.room;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record KickRequest(@NotBlank String sessionToken, @NotNull Long targetParticipantId) {
}
