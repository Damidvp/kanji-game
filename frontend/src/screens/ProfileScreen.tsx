import { useState } from 'react'
import { TopNav } from '../components/TopNav'
import { jlptLevels, type JlptLevelId } from '../mocks/jlptLevels'
import { mockProfileStats } from '../mocks/profile'
import { mockLobbyPlayers } from '../mocks/lobby'
import { getObjectiveLevel, setObjectiveLevel } from '../lib/profile'
import styles from './ProfileScreen.module.css'

const you = mockLobbyPlayers.find((p) => p.isYou)!

export function ProfileScreen() {
  const [objectiveLevel, setObjectiveLevelState] = useState<JlptLevelId>(getObjectiveLevel)

  function selectObjective(level: JlptLevelId) {
    setObjectiveLevelState(level)
    setObjectiveLevel(level)
  }

  return (
    <div>
      <TopNav />
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.avatar}>{you.initials}</div>
          <div>
            <div className={styles.name}>{you.name}</div>
            <div className={styles.memberSince}>
              Membre depuis {mockProfileStats.memberSince}
            </div>
            <div className={styles.objectiveRow}>
              <span className={styles.objectiveLabel}>Objectif JLPT</span>
              <div className={styles.chipsRow}>
                {jlptLevels.map((level) => {
                  const selected = level.id === objectiveLevel
                  return (
                    <button
                      key={level.id}
                      type="button"
                      className={styles.chip}
                      style={{
                        borderColor: level.color,
                        background: selected ? level.color : 'transparent',
                        color: selected ? '#fff' : level.color,
                      }}
                      onClick={() => selectObjective(level.id)}
                    >
                      {level.id}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{mockProfileStats.gamesPlayed}</div>
            <div className={styles.statLabel}>parties jouées</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{mockProfileStats.averageScore}%</div>
            <div className={styles.statLabel}>score moyen</div>
          </div>
        </div>

        <div className={styles.sectionLabel}>SCORE MOYEN PAR NIVEAU JLPT</div>
        <div className={styles.levelsList}>
          {mockProfileStats.perLevel.map((stat) => {
            const level = jlptLevels.find((l) => l.id === stat.level)!
            return (
              <div key={stat.level} className={styles.levelRow}>
                <div className={styles.levelId} style={{ color: level.color }}>
                  {stat.level}
                </div>
                <div className={styles.levelBarTrack}>
                  <div
                    className={styles.levelBarFill}
                    style={{ width: `${stat.averageScore}%`, background: level.color }}
                  />
                </div>
                <div className={styles.levelPercent}>{stat.averageScore}%</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
