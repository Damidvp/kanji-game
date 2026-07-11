package fr.kanjigame.room;

import jakarta.validation.constraints.NotBlank;

public record LeaveRequest(@NotBlank String sessionToken) {
}
