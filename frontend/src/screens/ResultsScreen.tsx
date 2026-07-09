import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import styles from './ResultsScreen.module.css'

export interface ResultsPlayer {
  id: string
  name: string
  initials: string
  color: string
  score: number
  scoreLabel: string
  accuracy: string
}

export interface ResultsLocationState {
  title: string
  players: ResultsPlayer[]
  replay?: { path: string; state?: unknown }
}

const FALLBACK_STATE: ResultsLocationState = {
  title: 'QUIZ KANJI N5 · N4',
  players: [
    { id: 'yuki', name: 'Yuki', initials: 'YU', color: 'var(--color-n3)', score: 980, scoreLabel: 'pts', accuracy: '96%' },
    { id: 'hana', name: 'Hana', initials: 'HA', color: 'var(--color-n4)', score: 860, scoreLabel: 'pts', accuracy: '88%' },
    { id: 'lucas', name: 'Lucas', initials: 'LU', color: 'var(--color-n2)', score: 790, scoreLabel: 'pts', accuracy: '81%' },
    { id: 'emma', name: 'Emma', initials: 'EM', color: 'var(--color-n5)', score: 640, scoreLabel: 'pts', accuracy: '73%' },
    { id: 'theo', name: 'Théo', initials: 'TH', color: 'var(--color-n1)', score: 520, scoreLabel: 'pts', accuracy: '65%' },
  ],
}

const PODIUM_BG = ['#F3E9C8', '#DCE6E1', '#F0DFD0'] // rang 1, 2, 3
const PODIUM_AVATAR_SIZE = [76, 64, 58]
const PODIUM_BOX_SIZE = [
  { width: 130, height: 130 },
  { width: 120, height: 90 },
  { width: 110, height: 70 },
]
// Ordre visuel du podium : 2e à gauche, 1er au centre, 3e à droite.
const PODIUM_VISUAL_ORDER = [1, 0, 2]

export function ResultsScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as ResultsLocationState) ?? FALLBACK_STATE

  const ranked = [...state.players].sort((a, b) => b.score - a.score)
  const podium = ranked.slice(0, 3)

  function replay() {
    if (state.replay) {
      navigate(state.replay.path, { state: state.replay.state, replace: true })
    } else {
      navigate('/')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerBlock}>
        <div className={styles.eyebrow}>PARTIE TERMINÉE — {state.title}</div>
        <h1 className={styles.title}>Bien joué !</h1>
      </div>

      {podium.length > 0 && (
        <div className={styles.podium}>
          {PODIUM_VISUAL_ORDER.filter((rankIndex) => rankIndex < podium.length).map((rankIndex) => {
            const player = podium[rankIndex]
            const avatarSize = PODIUM_AVATAR_SIZE[rankIndex]
            const box = PODIUM_BOX_SIZE[rankIndex]
            return (
              <div key={player.id} className={styles.podiumItem}>
                <div
                  className={styles.podiumAvatar}
                  style={{
                    width: avatarSize,
                    height: avatarSize,
                    background: player.color,
                    fontSize: rankIndex === 0 ? 18 : 14,
                  }}
                >
                  {player.initials}
                </div>
                <div className={styles.podiumName}>
                  {player.name}
                  {rankIndex === 0 ? ' 👑' : ''}
                </div>
                <div
                  className={styles.podiumBox}
                  style={{ width: box.width, height: box.height, background: PODIUM_BG[rankIndex] }}
                >
                  {rankIndex + 1}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <div>RANG</div>
          <div>JOUEUR</div>
          <div>SCORE</div>
          <div>PRÉCISION</div>
        </div>
        {ranked.map((player, i) => (
          <div key={player.id} className={styles.tableRow}>
            <div className={styles.rank}>{i + 1}</div>
            <div className={styles.playerCell}>
              <span className={styles.avatar} style={{ background: player.color }}>
                {player.initials}
              </span>
              {player.name}
            </div>
            <div className={styles.score}>
              {player.score}
              {player.scoreLabel === '%' ? '%' : ` ${player.scoreLabel}`}
            </div>
            <div className={styles.accuracy}>{player.accuracy}</div>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <Button variant="primary" onClick={replay}>
          Rejouer
        </Button>
        <Button variant="outline" onClick={() => navigate('/')}>
          Retour à l'accueil
        </Button>
      </div>
    </div>
  )
}
