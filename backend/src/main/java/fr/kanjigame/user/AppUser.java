package fr.kanjigame.user;

import fr.kanjigame.kanji.JlptLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "app_user")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 32)
    private String pseudo;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "objective_level", length = 2)
    private JlptLevel objectiveLevel;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    protected AppUser() {
    }

    public AppUser(String pseudo, String email, String passwordHash) {
        this.pseudo = pseudo;
        this.email = email;
        this.passwordHash = passwordHash;
    }

    public Long getId() {
        return id;
    }

    public String getPseudo() {
        return pseudo;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public JlptLevel getObjectiveLevel() {
        return objectiveLevel;
    }

    public void setObjectiveLevel(JlptLevel objectiveLevel) {
        this.objectiveLevel = objectiveLevel;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
