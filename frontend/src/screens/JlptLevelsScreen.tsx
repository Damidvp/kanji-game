import { useState } from 'react'
import { TopNav } from '../components/TopNav'
import { jlptLevels, type JlptLevelId } from '../mocks/jlptLevels'
import { getKanjiPool, type ApiKanji } from '../lib/kanji'
import styles from './JlptLevelsScreen.module.css'

export function JlptLevelsScreen() {
  const [expanded, setExpanded] = useState<JlptLevelId | null>(null)
  const [kanjiByLevel, setKanjiByLevel] = useState<Partial<Record<JlptLevelId, ApiKanji[]>>>({})
  const [loadingLevel, setLoadingLevel] = useState<JlptLevelId | null>(null)

  async function toggleLevel(level: JlptLevelId) {
    if (expanded === level) {
      setExpanded(null)
      return
    }
    setExpanded(level)
    if (!kanjiByLevel[level]) {
      setLoadingLevel(level)
      try {
        const kanji = await getKanjiPool([level])
        setKanjiByLevel((prev) => ({ ...prev, [level]: kanji }))
      } catch {
        setKanjiByLevel((prev) => ({ ...prev, [level]: [] }))
      } finally {
        setLoadingLevel(null)
      }
    }
  }

  return (
    <div>
      <TopNav />
      <div className={styles.page}>
        <h1 className={styles.title}>Niveaux JLPT</h1>
        <p className={styles.subtitle}>
          Le JLPT (Japanese-Language Proficiency Test) compte 5 niveaux, de N5 (débutant) à N1
          (expert). La correspondance avec le CECRL ci-dessous est indicative : le JLPT ne publie
          pas de table de correspondance officielle.
        </p>

        <div className={styles.list}>
          {jlptLevels.map((level) => {
            const isOpen = expanded === level.id
            const kanji = kanjiByLevel[level.id]
            return (
              <div key={level.id} className={styles.card} style={{ borderTopColor: level.color }}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderMain}>
                    <div className={styles.levelId} style={{ color: level.color }}>
                      {level.id}
                    </div>
                    <div>
                      <div className={styles.levelLabel}>
                        Niveau {level.label} · équivalent CECRL {level.cecrl}
                      </div>
                      <div className={styles.levelDescription}>{level.description}</div>
                    </div>
                  </div>
                  <button type="button" className={styles.toggle} onClick={() => toggleLevel(level.id)}>
                    {isOpen ? 'Masquer' : `Voir les ${level.kanjiCount} kanji`}
                  </button>
                </div>

                {isOpen && (
                  <div className={styles.kanjiGrid}>
                    {loadingLevel === level.id && <div className={styles.loading}>Chargement…</div>}
                    {kanji?.length === 0 && loadingLevel !== level.id && (
                      <div className={styles.loading}>Aucun kanji trouvé pour ce niveau.</div>
                    )}
                    {kanji?.map((k) => (
                      <div key={k.character} className={styles.kanjiChip} title={k.meaningFr}>
                        {k.character}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
