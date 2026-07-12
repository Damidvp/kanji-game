import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { GuestNameModal } from '../components/GuestNameModal'
import { getSessionToken } from '../lib/session'
import { setGuestName } from '../lib/guest'
import { leaveRoom, replayGame } from '../lib/rooms'
import { useRoomConnection } from '../hooks/useRoomConnection'
import { useRoomSocket, type ResultsPayload } from '../hooks/useRoomSocket'
import styles from './ResultsScreen.module.css'

interface ResultsLocationState {
  results?: ResultsPayload
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
const AUTO_RETURN_SECONDS = 60

export function ResultsScreen() {
  const { code } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const locState = (location.state as ResultsLocationState) ?? {}

  const { roomState, myParticipantId, needsGuestName, setNeedsGuestName, error, applyState } =
    useRoomConnection(code)
  const [results, setResults] = useState<ResultsPayload | null>(locState.results ?? null)
  const [autoReturnLeft, setAutoReturnLeft] = useState(AUTO_RETURN_SECONDS)

  useRoomSocket(code ?? '', myParticipantId, {
    onRoomState: applyState,
    onResults: setResults,
  })

  // Le retour au lobby (bouton "Rejouer" ici, un autre joueur, ou le retour automatique
  // 60s côté serveur) se traduit toujours par le même événement : status → LOBBY. On ne
  // navigue que sur cet événement plutôt que sur le clic, pour que ça marche pareil dans
  // les trois cas.
  useEffect(() => {
    if (roomState?.status === 'LOBBY' && code) {
      navigate(`/lobby/${code}`, { replace: true })
    }
  }, [roomState?.status, code, navigate])

  // Purement cosmétique : le vrai retour automatique est piloté par le serveur (60s après la
  // fin de partie) et se traduit par l'effet ci-dessus, pas par ce minuteur.
  useEffect(() => {
    const interval = setInterval(() => {
      setAutoReturnLeft((t) => (t > 0 ? t - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  function handleGuestNameSubmit(name: string) {
    setGuestName(name)
    setNeedsGuestName(false)
  }

  function goToLobby() {
    if (!code) return
    replayGame(code, getSessionToken()).catch(() => {})
  }

  function goHome() {
    if (code) leaveRoom(code, getSessionToken()).catch(() => {})
    navigate('/')
  }

  if (needsGuestName) {
    return <GuestNameModal onSubmit={handleGuestNameSubmit} onCancel={() => navigate('/')} />
  }

  if (error) {
    return (
      <div className={styles.page}>
        <p>{error}</p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Retour à l'accueil
        </Button>
      </div>
    )
  }

  if (!results || !roomState) {
    return <div className={styles.page}>En attente des résultats…</div>
  }

  const isQuiz = roomState.gameMode === 'QUIZ'
  const title = `${isQuiz ? 'QUIZ KANJI' : 'ÉCRITURE DE KANJI'} ${roomState.levels.join(' · ')}`

  const players = results.ranking.map((entry) => {
    const participant = roomState.participants.find((p) => p.id === entry.participantId)
    const score = isQuiz ? entry.totalPoints : Math.round(entry.avgStrokeScore ?? 0)
    return {
      id: entry.participantId,
      name: entry.name,
      initials: participant?.initials ?? entry.name.slice(0, 2).toUpperCase(),
      color: participant?.color ?? 'var(--color-n3)',
      score,
      scoreLabel: isQuiz ? 'pts' : '%',
      // Pas de précision distincte du score côté Quiz : le serveur ne renvoie que le total de
      // points (rapidité + exactitude combinées), pas un taux de bonnes réponses séparé.
      accuracy: isQuiz ? '—' : `${score}%`,
    }
  })
  const ranked = [...players].sort((a, b) => b.score - a.score)
  const podium = ranked.slice(0, 3)

  return (
    <div className={styles.page}>
      <div className={styles.headerBlock}>
        <div className={styles.eyebrow}>PARTIE TERMINÉE — {title}</div>
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
        <Button variant="primary" onClick={goToLobby}>
          Rejouer
        </Button>
        <Button variant="outline" onClick={goHome}>
          Retour à l'accueil
        </Button>
      </div>
      <div className={styles.autoReturnNote}>
        Retour automatique au salon dans {autoReturnLeft}s
      </div>
    </div>
  )
}
