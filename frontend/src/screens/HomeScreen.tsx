import { Link } from 'react-router-dom'
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
            <Link to="/niveaux-jlpt">
              <Button variant="outline">Voir les niveaux</Button>
            </Link>
          </div>
        </div>

        <div className={styles.previewFrame}>
          <div className={styles.previewCard}>
            <div className={styles.previewProgressRow}>
              <span className={styles.previewProgressText}>
                Question <strong>3</strong> / 10
              </span>
              <span>{previewKanji.jlptLevel}</span>
            </div>
            <div className={styles.previewProgressTrack}>
              <div className={styles.previewProgressFill} style={{ width: '30%' }} />
            </div>

            <div className={styles.previewStatsRow}>
              <div className={styles.previewStatBox}>
                <div className={styles.previewStatLabel}>TEMPS RESTANT</div>
                <div className={styles.previewStatValue}>18s</div>
              </div>
              <div className={styles.previewStatBox}>
                <div className={styles.previewStatLabel}>SCORE</div>
                <div className={styles.previewStatValue}>740</div>
              </div>
            </div>

            <div className={styles.previewKanji}>{previewKanji.character}</div>
            <div className={styles.previewReadings}>
              <span>
                <strong>on</strong>　{previewKanji.onyomi}
              </span>
              <span>
                <strong>kun</strong>　{previewKanji.kunyomi}
              </span>
            </div>

            <div className={styles.previewQuestion}>Quelle est la bonne signification ?</div>
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
