package fr.kanjigame.room;

import jakarta.validation.constraints.NotBlank;

public record JoinRoomRequest(String guestName, @NotBlank String sessionToken) {
}
