import { useEffect, useState } from 'react'
import { TopNav } from '../components/TopNav'
import { jlptLevels, type JlptLevelId } from '../mocks/jlptLevels'
import { getObjectiveLevel, setObjectiveLevel } from '../lib/profile'
import { updateObjectiveLevel } from '../lib/auth'
import { getGuestName } from '../lib/guest'
import { useAuth } from '../contexts/AuthContext'
import styles from './ProfileScreen.module.css'

export function ProfileScreen() {
  const { profile, refreshProfile } = useAuth()
  const [objectiveLevel, setObjectiveLevelState] = useState<JlptLevelId>(getObjectiveLevel)

  // Le profil réel (si connecté) se charge de façon asynchrone après le montage ; une fois
  // arrivé, son objectif JLPT (persisté côté serveur) prend le pas sur celui du localStorage.
  useEffect(() => {
    if (profile?.objectiveLevel) setObjectiveLevelState(profile.objectiveLevel)
  }, [profile?.objectiveLevel])

  async function selectObjective(level: JlptLevelId) {
    setObjectiveLevelState(level)
    if (profile) {
      try {
        await updateObjectiveLevel(level)
        await refreshProfile()
      } catch {
        // Échec silencieux : l'affichage reste sur le niveau choisi, un prochain
        // rafraîchissement de profil resynchronisera si besoin.
      }
    } else {
      setObjectiveLevel(level)
    }
  }

  const displayName = profile?.pseudo ?? getGuestName() ?? 'Invité'
  const initials = displayName.trim().slice(0, 2).toUpperCase()

  return (
    <div>
      <TopNav />
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.avatar}>{initials}</div>
          <div>
            <div className={styles.name}>{displayName}</div>
            {profile && (
              <div className={styles.memberSince}>Membre depuis {profile.memberSince}</div>
            )}
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

        {profile ? (
          <>
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{profile.gamesPlayed}</div>
                <div className={styles.statLabel}>parties jouées</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{profile.averageScore}%</div>
                <div className={styles.statLabel}>score moyen</div>
              </div>
            </div>

            <div className={styles.sectionLabel}>SCORE MOYEN PAR NIVEAU JLPT</div>
            <div className={styles.levelsList}>
              {profile.perLevel.map((stat) => {
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
          </>
        ) : (
          <div className={styles.guestNotice}>
            Connecte-toi pour suivre tes statistiques : parties jouées, score moyen et progression par niveau JLPT.
          </div>
        )}
      </div>
    </div>
  )
}
