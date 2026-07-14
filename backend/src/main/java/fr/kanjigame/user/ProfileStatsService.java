package fr.kanjigame.user;

import fr.kanjigame.game.GameAnswerRepository;
import fr.kanjigame.game.GameAnswerRepository.UserAnswerStat;
import fr.kanjigame.kanji.JlptLevel;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ProfileStatsService {

    private final GameAnswerRepository gameAnswerRepository;

    public ProfileStatsService(GameAnswerRepository gameAnswerRepository) {
        this.gameAnswerRepository = gameAnswerRepository;
    }

    public ProfileStats computeStats(Long userId) {
        List<UserAnswerStat> rows = gameAnswerRepository.findAnswerStatsByUserId(userId);

        Set<String> games = new HashSet<>();
        Map<JlptLevel, Double> levelTotals = new EnumMap<>(JlptLevel.class);
        Map<JlptLevel, Integer> levelCounts = new EnumMap<>(JlptLevel.class);
        double overallTotal = 0;
        int overallCount = 0;

        for (UserAnswerStat row : rows) {
            games.add(row.getRoomId() + "_" + row.getPlayCount());
            // Métrique commune Quiz/Écriture : précision en % (voir §4 SPECIFICATIONS_BACKEND.md).
            double accuracy = row.getStrokeScore() != null
                    ? row.getStrokeScore()
                    : (Boolean.TRUE.equals(row.getIsCorrect()) ? 100.0 : 0.0);
            overallTotal += accuracy;
            overallCount++;
            levelTotals.merge(row.getJlptLevel(), accuracy, Double::sum);
            levelCounts.merge(row.getJlptLevel(), 1, Integer::sum);
        }

        int averageScore = overallCount == 0 ? 0 : (int) Math.round(overallTotal / overallCount);

        List<ProfileStats.LevelStat> perLevel = new ArrayList<>();
        for (JlptLevel level : JlptLevel.values()) {
            Integer count = levelCounts.get(level);
            int avg = (count == null || count == 0) ? 0 : (int) Math.round(levelTotals.get(level) / count);
            perLevel.add(new ProfileStats.LevelStat(level, avg));
        }

        return new ProfileStats(games.size(), averageScore, perLevel);
    }

    public record ProfileStats(int gamesPlayed, int averageScore, List<LevelStat> perLevel) {
        public record LevelStat(JlptLevel level, int averageScore) {
        }
    }
}
