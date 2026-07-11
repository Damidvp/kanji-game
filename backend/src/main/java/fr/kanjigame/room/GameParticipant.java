package fr.kanjigame.room;

import fr.kanjigame.user.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "game_participant")
public class GameParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private GameRoom room;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    private AppUser user;

    @Column(name = "guest_name", length = 32)
    private String guestName;

    @Column(name = "session_token", nullable = false, length = 64)
    private String sessionToken;

    @Column(nullable = false, length = 2)
    private String initials;

    @Column(nullable = false, length = 32)
    private String color;

    @Column(name = "is_host", nullable = false)
    private boolean host;

    @Column(nullable = false)
    private boolean ready = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ParticipantStatus status = ParticipantStatus.IN_LOBBY;

    @Column(name = "joined_at", nullable = false)
    private OffsetDateTime joinedAt = OffsetDateTime.now();

    @Column(name = "left_at")
    private OffsetDateTime leftAt;

    protected GameParticipant() {
    }

    public GameParticipant(GameRoom room, AppUser user, String guestName, String sessionToken, String initials, String color, boolean host) {
        this.room = room;
        this.user = user;
        this.guestName = guestName;
        this.sessionToken = sessionToken;
        this.initials = initials;
        this.color = color;
        this.host = host;
    }

    public Long getId() {
        return id;
    }

    public GameRoom getRoom() {
        return room;
    }

    public AppUser getUser() {
        return user;
    }

    public String getGuestName() {
        return guestName;
    }

    public String getSessionToken() {
        return sessionToken;
    }

    public String getInitials() {
        return initials;
    }

    public String getColor() {
        return color;
    }

    public boolean isHost() {
        return host;
    }

    public boolean isReady() {
        return ready;
    }

    public void setReady(boolean ready) {
        this.ready = ready;
    }

    public ParticipantStatus getStatus() {
        return status;
    }

    public void setStatus(ParticipantStatus status) {
        this.status = status;
    }

    public OffsetDateTime getLeftAt() {
        return leftAt;
    }

    public void setLeftAt(OffsetDateTime leftAt) {
        this.leftAt = leftAt;
    }

    public String displayName() {
        return user != null ? user.getPseudo() : guestName;
    }
}
