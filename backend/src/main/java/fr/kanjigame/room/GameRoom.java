package fr.kanjigame.room;

import fr.kanjigame.kanji.JlptLevel;
import fr.kanjigame.user.AppUser;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "game_room")
public class GameRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 6)
    private String code;

    @Column(nullable = false, unique = true, length = 64)
    private String slug;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "host_user_id")
    private AppUser hostUser;

    @Column(name = "host_guest_name", length = 32)
    private String hostGuestName;

    @Enumerated(EnumType.STRING)
    @Column(name = "game_mode", nullable = false, length = 16)
    private GameMode gameMode;

    @Column(name = "question_count", nullable = false)
    private int questionCount;

    @Column(name = "time_per_question_seconds", nullable = false)
    private int timePerQuestionSeconds;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private RoomStatus status = RoomStatus.LOBBY;

    @Column(name = "current_round_index", nullable = false)
    private int currentRoundIndex = 0;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "game_room_level", joinColumns = @JoinColumn(name = "room_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "jlpt_level")
    private Set<JlptLevel> levels = new HashSet<>();

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    protected GameRoom() {
    }

    public GameRoom(String code, String slug, GameMode gameMode, int questionCount, int timePerQuestionSeconds, Set<JlptLevel> levels) {
        this.code = code;
        this.slug = slug;
        this.gameMode = gameMode;
        this.questionCount = questionCount;
        this.timePerQuestionSeconds = timePerQuestionSeconds;
        this.levels = levels;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getSlug() {
        return slug;
    }

    public AppUser getHostUser() {
        return hostUser;
    }

    public void setHostUser(AppUser hostUser) {
        this.hostUser = hostUser;
    }

    public String getHostGuestName() {
        return hostGuestName;
    }

    public void setHostGuestName(String hostGuestName) {
        this.hostGuestName = hostGuestName;
    }

    public GameMode getGameMode() {
        return gameMode;
    }

    public void setGameMode(GameMode gameMode) {
        this.gameMode = gameMode;
    }

    public int getQuestionCount() {
        return questionCount;
    }

    public void setQuestionCount(int questionCount) {
        this.questionCount = questionCount;
    }

    public int getTimePerQuestionSeconds() {
        return timePerQuestionSeconds;
    }

    public void setTimePerQuestionSeconds(int timePerQuestionSeconds) {
        this.timePerQuestionSeconds = timePerQuestionSeconds;
    }

    public RoomStatus getStatus() {
        return status;
    }

    public void setStatus(RoomStatus status) {
        this.status = status;
    }

    public int getCurrentRoundIndex() {
        return currentRoundIndex;
    }

    public void setCurrentRoundIndex(int currentRoundIndex) {
        this.currentRoundIndex = currentRoundIndex;
    }

    public Set<JlptLevel> getLevels() {
        return levels;
    }

    public void setLevels(Set<JlptLevel> levels) {
        this.levels = levels;
    }
}
