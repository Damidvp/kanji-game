package fr.kanjigame.room;

import jakarta.validation.constraints.NotBlank;

public record StartRoomRequest(@NotBlank String sessionToken) {
}
