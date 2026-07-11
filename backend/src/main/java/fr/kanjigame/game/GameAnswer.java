package fr.kanjigame.game;

import fr.kanjigame.room.GameParticipant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "game_answer")
public class GameAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "round_id", nullable = false)
    private GameRound round;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_id", nullable = false)
    private GameParticipant participant;

    @Column(name = "submitted_at", nullable = false)
    private OffsetDateTime submittedAt = OffsetDateTime.now();

    @Column(name = "selected_option", length = 128)
    private String selectedOption;

    @Column(name = "is_correct")
    private Boolean isCorrect;

    @Column
    private Integer points;

    @Column(name = "stroke_score")
    private Integer strokeScore;

    @Column(name = "stroke_mistakes")
    private Integer strokeMistakes;

    protected GameAnswer() {
    }

    public GameAnswer(GameRound round, GameParticipant participant) {
        this.round = round;
        this.participant = participant;
    }

    public Long getId() {
        return id;
    }

    public GameRound getRound() {
        return round;
    }

    public GameParticipant getParticipant() {
        return participant;
    }

    public String getSelectedOption() {
        return selectedOption;
    }

    public void setSelectedOption(String selectedOption) {
        this.selectedOption = selectedOption;
    }

    public Boolean getIsCorrect() {
        return isCorrect;
    }

    public void setIsCorrect(Boolean isCorrect) {
        this.isCorrect = isCorrect;
    }

    public Integer getPoints() {
        return points;
    }

    public void setPoints(Integer points) {
        this.points = points;
    }

    public Integer getStrokeScore() {
        return strokeScore;
    }

    public void setStrokeScore(Integer strokeScore) {
        this.strokeScore = strokeScore;
    }

    public Integer getStrokeMistakes() {
        return strokeMistakes;
    }

    public void setStrokeMistakes(Integer strokeMistakes) {
        this.strokeMistakes = strokeMistakes;
    }
}
