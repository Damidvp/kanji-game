package fr.kanjigame.room;

import jakarta.validation.constraints.NotBlank;

public record ReadyRequest(@NotBlank String sessionToken, boolean ready) {
}
