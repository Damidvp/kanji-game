package fr.kanjigame.kanji;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "kanji_word")
public class KanjiWord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kanji_id", nullable = false)
    private Kanji kanji;

    @Column(nullable = false, length = 64)
    private String word;

    @Column(nullable = false, length = 64)
    private String reading;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "meanings_en", columnDefinition = "text[]", nullable = false)
    private List<String> meaningsEn = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "meanings_fr", columnDefinition = "text[]", nullable = false)
    private List<String> meaningsFr = new ArrayList<>();

    protected KanjiWord() {
    }

    public KanjiWord(Kanji kanji, String word, String reading) {
        this.kanji = kanji;
        this.word = word;
        this.reading = reading;
    }

    public Long getId() {
        return id;
    }

    public Kanji getKanji() {
        return kanji;
    }

    public String getWord() {
        return word;
    }

    public String getReading() {
        return reading;
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
}
