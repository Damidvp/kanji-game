package fr.kanjigame.kanji;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "kanji")
public class Kanji {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 4)
    private String character;

    @Column(name = "jouyou_number")
    private Integer jouyouNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "jlpt_level", nullable = false, length = 2)
    private JlptLevel jlptLevel;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]", nullable = false)
    private List<String> onyomi = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]", nullable = false)
    private List<String> kunyomi = new ArrayList<>();

    @Column(name = "stroke_count")
    private Integer strokeCount;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "meanings_en", columnDefinition = "text[]", nullable = false)
    private List<String> meaningsEn = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "meanings_fr", columnDefinition = "text[]", nullable = false)
    private List<String> meaningsFr = new ArrayList<>();

    @Column(name = "translation_reviewed", nullable = false)
    private boolean translationReviewed = false;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @OneToMany(mappedBy = "kanji", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<KanjiWord> words = new ArrayList<>();

    protected Kanji() {
    }

    public Kanji(String character, JlptLevel jlptLevel) {
        this.character = character;
        this.jlptLevel = jlptLevel;
    }

    public Long getId() {
        return id;
    }

    public String getCharacter() {
        return character;
    }

    public Integer getJouyouNumber() {
        return jouyouNumber;
    }

    public void setJouyouNumber(Integer jouyouNumber) {
        this.jouyouNumber = jouyouNumber;
    }

    public JlptLevel getJlptLevel() {
        return jlptLevel;
    }

    public void setJlptLevel(JlptLevel jlptLevel) {
        this.jlptLevel = jlptLevel;
    }

    public List<String> getOnyomi() {
        return onyomi;
    }

    public void setOnyomi(List<String> onyomi) {
        this.onyomi = onyomi;
    }

    public List<String> getKunyomi() {
        return kunyomi;
    }

    public void setKunyomi(List<String> kunyomi) {
        this.kunyomi = kunyomi;
    }

    public Integer getStrokeCount() {
        return strokeCount;
    }

    public void setStrokeCount(Integer strokeCount) {
        this.strokeCount = strokeCount;
    }

    public List<String> getMeaningsEn() {
        return meaningsEn;
    }

    public void setMeaningsEn(List<String> meaningsEn) {
        this.meaningsEn = meaningsEn;
    }

    public List<String> getMeaningsFr() {
        return meaningsFr;
    }

    public void setMeaningsFr(List<String> meaningsFr) {
        this.meaningsFr = meaningsFr;
    }

    public boolean isTranslationReviewed() {
        return translationReviewed;
    }

    public void setTranslationReviewed(boolean translationReviewed) {
        this.translationReviewed = translationReviewed;
    }

    public List<KanjiWord> getWords() {
        return words;
    }
}
