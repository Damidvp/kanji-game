package fr.kanjigame.room;

import fr.kanjigame.kanji.JlptLevel;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.Set;

public record CreateRoomRequest(
        @NotNull GameMode gameMode,
        @NotEmpty Set<JlptLevel> levels,
        @Min(10) @Max(100) int questionCount,
        @Min(10) @Max(90) int timePerQuestion,
        String guestName,
        @NotBlank String sessionToken
) {
}
