import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { GuestNameModal } from '../components/GuestNameModal'
import { jlptLevels, type JlptLevelId } from '../mocks/jlptLevels'
import { useAuth } from '../contexts/AuthContext'
import { getSessionToken } from '../lib/session'
import { getGuestName, setGuestName } from '../lib/guest'
import {
  joinRoom,
  setReady,
  kickParticipant,
  startGame,
  updateRoomSettings,
  type RoomState,
  type GameMode,
} from '../lib/rooms'
import { useRoomSocket } from '../hooks/useRoomSocket'
import styles from './LobbyScreen.module.css'

const gameModeLabels: Record<GameMode, string> = {
  QUIZ: 'Quiz Kanji',
  ECRITURE: 'Écriture de kanji',
}

const gameModeShortLabels: Record<GameMode, string> = {
  QUIZ: 'Quiz Kanji',
  ECRITURE: 'Écriture',
}

const questionCountOptions = Array.from({ length: 10 }, (_, i) => (i + 1) * 10) // 10 à 100
const timePerQuestionOptions = Array.from({ length: 9 }, (_, i) => (i + 1) * 10) // 10 à 90 secondes
const LOBBY_MAX_PLAYERS = 8

export function LobbyScreen() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { profile, loading: authLoading } = useAuth()

  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [myParticipantId, setMyParticipantId] = useState<number | null>(null)
  const [needsGuestName, setNeedsGuestName] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const applyState = useCallback((state: RoomState) => {
    setRoomState(state)
    const mine = state.participants.find((p) => p.isYou)
    if (mine) setMyParticipantId(mine.id)
  }, [])

  useEffect(() => {
    if (!code || authLoading) return
    const sessionToken = getSessionToken()
    const guestName = profile ? undefined : (getGuestName() ?? undefined)
    if (!profile && !guestName) {
      setNeedsGuestName(true)
      return
    }
    let cancelled = false
    joinRoom(code, sessionToken, guestName)
      .then((state) => {
        if (!cancelled) applyState(state)
      })
      .catch(() => {
        if (!cancelled) setError('Ce salon est introuvable ou la partie a déjà commencé.')
      })
    return () => {
      cancelled = true
    }
  }, [code, profile, authLoading, applyState])

  const { connected, sendEnterLobby } = useRoomSocket(code ?? '', { onRoomState: applyState })

  useEffect(() => {
    if (connected) sendEnterLobby(getSessionToken())
  }, [connected, sendEnterLobby])

  useEffect(() => {
    if (roomState?.status === 'IN_PROGRESS' && code) {
      navigate(roomState.gameMode === 'QUIZ' ? `/lobby/${code}/quiz` : `/lobby/${code}/ecriture`)
    }
  }, [roomState?.status, roomState?.gameMode, code, navigate])

  function handleGuestNameSubmit(name: string) {
    setGuestName(name)
    setNeedsGuestName(false)
  }

  const you = roomState?.participants.find((p) => p.id === myParticipantId) ?? null
  const activeParticipants =
    roomState?.participants.filter((p) => p.status !== 'LEFT' && p.status !== 'KICKED') ?? []
  const orderedSelectedLevels = roomState ? jlptLevels.filter((level) => roomState.levels.includes(level.id)) : []
  const filledSlots: (typeof activeParticipants[number] | null)[] = Array.from(
    { length: LOBBY_MAX_PLAYERS },
    (_, i) => activeParticipants[i] ?? null,
  )

  function toggleReady() {
    if (!code || !you) return
    setReady(code, getSessionToken(), !you.ready).then(applyState).catch(() => {})
  }

  function kickPlayer(player: { id: number; name: string }) {
    if (!code) return
    if (!window.confirm(`Exclure ${player.name} du salon ?`)) return
    kickParticipant(code, getSessionToken(), player.id).then(applyState).catch(() => {})
  }

  function launchGame() {
    if (!code) return
    startGame(code, getSessionToken())
      .then(applyState)
      .catch(() => setError('Impossible de lancer la partie.'))
  }

  async function copyLink() {
    const link = `${window.location.origin}${window.location.pathname}`
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      // Presse-papiers indisponible (ex. contexte non sécurisé) : on ignore silencieusement.
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function changeSettings(partial: {
    gameMode?: GameMode
    levels?: JlptLevelId[]
    questionCount?: number
    timePerQuestion?: number
  }) {
    if (!code || !roomState || !you?.isHost) return
    updateRoomSettings(code, {
      gameMode: partial.gameMode ?? roomState.gameMode,
      levels: partial.levels ?? roomState.levels,
      questionCount: partial.questionCount ?? roomState.questionCount,
      timePerQuestion: partial.timePerQuestion ?? roomState.timePerQuestionSeconds,
      sessionToken: getSessionToken(),
    })
      .then(applyState)
      .catch(() => {})
  }

  function toggleLevel(id: JlptLevelId) {
    if (!roomState) return
    const current = roomState.levels
    if (current.includes(id)) {
      if (current.length === 1) return // au moins un niveau doit rester sélectionné
      changeSettings({ levels: current.filter((l) => l !== id) })
    } else {
      changeSettings({ levels: [...current, id] })
    }
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

  if (!roomState || !code) {
    return <div className={styles.page}>Connexion au salon…</div>
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>SALON DE PARTIE</div>
          <h1 className={styles.title}>{gameModeLabels[roomState.gameMode]}</h1>
          <div className={styles.levelBadges}>
            {orderedSelectedLevels.map((level) => (
              <span
                key={level.id}
                className={styles.levelBadge}
                style={{ borderColor: level.color, color: level.color }}
              >
                {level.id}
              </span>
            ))}
          </div>
        </div>
        <div className={styles.shareRow}>
          <div className={styles.codeBox}>{code}</div>
          <Button variant="primary" onClick={copyLink}>
            {copied ? 'Copié !' : 'Copier le lien'}
          </Button>
        </div>
      </div>

      <div className={styles.grid}>
        <div>
          <div className={styles.sectionLabel}>
            JOUEURS ({activeParticipants.length}/{LOBBY_MAX_PLAYERS})
          </div>
          <div className={styles.playersGrid}>
            {filledSlots.map((player, i) => {
              if (!player) {
                return (
                  <div key={`empty-${i}`} className={styles.slotEmpty}>
                    <div className={styles.avatarEmpty} />
                    <div className={styles.emptyLabel}>En attente...</div>
                  </div>
                )
              }
              const canKick = you?.isHost && player.id !== you.id
              const objectiveLevelInfo = jlptLevels.find((l) => l.id === player.objectiveLevel)
              let statusClass = styles.statusWaiting
              let statusText = 'En attente...'
              if (player.status === 'VIEWING_RESULTS') {
                statusClass = styles.statusViewing
                statusText = 'Consulte les résultats...'
              } else if (player.ready) {
                statusClass = styles.statusReady
                statusText = 'Prêt'
              }
              return (
                <div key={player.id} className={styles.slotFilled}>
                  {canKick && (
                    <button
                      type="button"
                      className={styles.kickButton}
                      onClick={() => kickPlayer(player)}
                      title={`Exclure ${player.name}`}
                    >
                      ✕
                    </button>
                  )}
                  <div className={styles.avatar} style={{ background: player.color }}>
                    {player.initials}
                  </div>
                  <div className={styles.playerName}>{player.name}</div>
                  {objectiveLevelInfo && (
                    <div
                      className={styles.objectiveBadge}
                      style={{ borderColor: objectiveLevelInfo.color, color: objectiveLevelInfo.color }}
                      title={`Objectif ${objectiveLevelInfo.id}`}
                    >
                      Objectif {objectiveLevelInfo.id}
                    </div>
                  )}
                  <div className={statusClass}>{statusText}</div>
                  {player.isHost && <div className={styles.hostBadge}>HÔTE</div>}
                </div>
              )
            })}
          </div>

          {you && (
            <div className={styles.readyRow}>
              <Button variant={you.ready ? 'accent' : 'primary'} onClick={toggleReady}>
                {you.ready ? '✓ Prêt' : 'Je suis prêt'}
              </Button>
            </div>
          )}
        </div>

        <div>
          <div className={styles.sectionLabel}>PARAMÈTRES</div>
          <div className={styles.settingsCard}>
            <div className={styles.settingLabel}>Mini-jeu</div>
            <div className={styles.gameToggle}>
              {(Object.keys(gameModeLabels) as GameMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={!you?.isHost}
                  className={mode === roomState.gameMode ? styles.gameOptionActive : styles.gameOption}
                  onClick={() => changeSettings({ gameMode: mode })}
                >
                  {gameModeShortLabels[mode]}
                </button>
              ))}
            </div>

            <div className={styles.settingLabel}>Niveaux JLPT</div>
            <div className={styles.chipsRow}>
              {jlptLevels.map((level) => {
                const selected = roomState.levels.includes(level.id)
                return (
                  <button
                    key={level.id}
                    type="button"
                    disabled={!you?.isHost}
                    className={styles.chip}
                    style={{
                      borderColor: level.color,
                      background: selected ? level.color : 'transparent',
                      color: selected ? '#fff' : level.color,
                    }}
                    onClick={() => toggleLevel(level.id)}
                  >
                    {level.id}
                  </button>
                )
              })}
            </div>

            <div className={styles.settingLabel}>Nombre de questions</div>
            <select
              className={styles.select}
              disabled={!you?.isHost}
              value={roomState.questionCount}
              onChange={(e) => changeSettings({ questionCount: Number(e.target.value) })}
            >
              {questionCountOptions.map((n) => (
                <option key={n} value={n}>
                  {n} questions
                </option>
              ))}
            </select>

            <div className={styles.settingLabel}>Temps par question</div>
            <select
              className={styles.select}
              disabled={!you?.isHost}
              value={roomState.timePerQuestionSeconds}
              onChange={(e) => changeSettings({ timePerQuestion: Number(e.target.value) })}
            >
              {timePerQuestionOptions.map((n) => (
                <option key={n} value={n}>
                  {n} secondes
                </option>
              ))}
            </select>
          </div>

          {you?.isHost && (
            <Button variant="accent" className={styles.launchButton} onClick={launchGame}>
              Lancer la partie
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
