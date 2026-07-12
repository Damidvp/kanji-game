package fr.kanjigame.game;

import fr.kanjigame.kanji.Kanji;
import fr.kanjigame.room.GameRoom;
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
@Table(name = "game_round")
public class GameRound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private GameRoom room;

    @Column(name = "round_index", nullable = false)
    private int roundIndex;

    @Column(name = "play_count", nullable = false)
    private int playCount;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "kanji_id", nullable = false)
    private Kanji kanji;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt = OffsetDateTime.now();

    @Column(name = "ends_at", nullable = false)
    private OffsetDateTime endsAt;

    protected GameRound() {
    }

    public GameRound(GameRoom room, int roundIndex, int playCount, Kanji kanji, OffsetDateTime endsAt) {
        this.room = room;
        this.roundIndex = roundIndex;
        this.playCount = playCount;
        this.kanji = kanji;
        this.endsAt = endsAt;
    }

    public Long getId() {
        return id;
    }

    public GameRoom getRoom() {
        return room;
    }

    public int getRoundIndex() {
        return roundIndex;
    }

    public int getPlayCount() {
        return playCount;
    }

    public Kanji getKanji() {
        return kanji;
    }

    public OffsetDateTime getStartedAt() {
        return startedAt;
    }

    public OffsetDateTime getEndsAt() {
        return endsAt;
    }
}
