import { TopNav } from '../components/TopNav'
import { Button } from '../components/Button'
import { PlayButton } from '../components/PlayButton'
import { jlptLevels } from '../mocks/jlptLevels'
import { mockKanjiPool } from '../mocks/kanji'
import styles from './HomeScreen.module.css'

const previewKanji = mockKanjiPool.find((k) => k.character === '火')!
// Ordre fixe reproduisant exactement l'aperçu de la maquette (eau, feu✓, montagne, rivière).
const previewOptions = ['eau', previewKanji.meaningFr, 'montagne', 'rivière']

export function HomeScreen() {
  return (
    <div>
      <TopNav />

      <section className={styles.hero}>
        <div>
          <h1 className={styles.title}>
            Apprendre le japonais,
            <br />
            c'est aussi jouer.
          </h1>
          <p className={styles.subtitle}>
            Choisis ton niveau JLPT, lance un mini-jeu seul ou entre amis, et progresse kanji après
            kanji.
          </p>
          <div className={styles.ctaRow}>
            <PlayButton variant="primary">Commencer à jouer</PlayButton>
            <a href="#niveaux">
              <Button variant="outline">Voir les niveaux</Button>
            </a>
          </div>
        </div>

        <div className={styles.previewFrame}>
          <div className={styles.previewCard}>
            <div className={styles.previewHeader}>
              <span>QUIZ KANJI · Question 3/10</span>
              <span>{previewKanji.jlptLevel}</span>
            </div>
            <div className={styles.previewKanji}>{previewKanji.character}</div>
            <div className={styles.previewReadings}>
              <span>on: {previewKanji.onyomi}</span>&nbsp;·&nbsp;<span>kun: {previewKanji.kunyomi}</span>
            </div>
            <div className={styles.previewOptions}>
              {previewOptions.map((option) => {
                const isCorrect = option === previewKanji.meaningFr
                return (
                  <div
                    key={option}
                    className={isCorrect ? `${styles.previewOption} ${styles.previewOptionCorrect}` : styles.previewOption}
                  >
                    {option}
                    {isCorrect ? ' ✓' : ''}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <div id="niveaux" className={styles.levelsLabel}>
        NIVEAUX JLPT
      </div>
      <div className={styles.levelsGrid}>
        {jlptLevels.map((level) => (
          <div key={level.id} className={styles.levelCard} style={{ borderTopColor: level.color }}>
            <div className={styles.levelId}>{level.id}</div>
            <div className={styles.levelMeta}>
              {level.kanjiCount} kanji · {level.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
