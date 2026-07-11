import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { jlptLevels, type JlptLevelId } from '../mocks/jlptLevels'
import { mockLobbyPlayers, LOBBY_MAX_PLAYERS, type LobbyPlayer } from '../mocks/lobby'
import { getObjectiveLevel } from '../lib/profile'
import styles from './LobbyScreen.module.css'

function withYourObjective(list: LobbyPlayer[]): LobbyPlayer[] {
  const yourObjective = getObjectiveLevel()
  return list.map((p) => (p.isYou ? { ...p, objectiveLevel: yourObjective } : p))
}

type GameMode = 'quiz' | 'ecriture'

const gameModeLabels: Record<GameMode, string> = {
  quiz: 'Quiz Kanji',
  ecriture: 'Écriture de kanji',
}

const gameModeShortLabels: Record<GameMode, string> = {
  quiz: 'Quiz Kanji',
  ecriture: 'Écriture',
}

const questionCountOptions = Array.from({ length: 10 }, (_, i) => (i + 1) * 10) // 10 à 100
const timePerQuestionOptions = Array.from({ length: 9 }, (_, i) => (i + 1) * 10) // 10 à 90 secondes

interface LobbyLocationState {
  gameMode?: GameMode
  levels?: JlptLevelId[]
  questionCount?: number
  timePerQuestion?: number
  fromResults?: boolean
}

export function LobbyScreen() {
  const { code = 'AB3F9K' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const locState = (location.state as LobbyLocationState) ?? {}

  const [players, setPlayers] = useState<LobbyPlayer[]>(() =>
    withYourObjective(
      locState.fromResults ? mockLobbyPlayers.map((p) => ({ ...p, ready: false })) : mockLobbyPlayers,
    ),
  )
  const [gameMode, setGameMode] = useState<GameMode>(locState.gameMode ?? 'quiz')
  const [selectedLevels, setSelectedLevels] = useState<Set<JlptLevelId>>(
    new Set(locState.levels?.length ? locState.levels : ['N5', 'N4']),
  )
  const [questionCount, setQuestionCount] = useState(locState.questionCount ?? 20)
  const [timePerQuestion, setTimePerQuestion] = useState(locState.timePerQuestion ?? 30)
  const [copied, setCopied] = useState(false)

  // Au retour d'une partie, les autres joueurs ne reviennent pas tous au salon en même temps :
  // certains consultent encore l'écran de résultats. On simule un délai aléatoire par joueur
  // avant qu'il ne soit vraiment "dans le salon" et redevienne disponible.
  const [viewingResultsIds, setViewingResultsIds] = useState<Set<string>>(
    () => new Set(locState.fromResults ? mockLobbyPlayers.filter((p) => !p.isYou).map((p) => p.id) : []),
  )

  useEffect(() => {
    if (viewingResultsIds.size === 0) return
    const timeouts = [...viewingResultsIds].map((id) => {
      const delay = 2000 + Math.random() * 7000
      return setTimeout(() => {
        setViewingResultsIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, delay)
    })
    return () => timeouts.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const you = players.find((p) => p.isYou)
  const filledSlots: (LobbyPlayer | null)[] = Array.from(
    { length: LOBBY_MAX_PLAYERS },
    (_, i) => players[i] ?? null,
  )

  // jlptLevels est déjà ordonné N5 → N1.
  const orderedSelectedLevels = jlptLevels.filter((level) => selectedLevels.has(level.id))

  function toggleReady() {
    setPlayers((prev) => prev.map((p) => (p.isYou ? { ...p, ready: !p.ready } : p)))
  }

  function toggleLevel(id: JlptLevelId) {
    setSelectedLevels((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size === 1) return prev // au moins un niveau doit rester sélectionné
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function kickPlayer(player: LobbyPlayer) {
    if (!window.confirm(`Exclure ${player.name} du salon ?`)) return
    setPlayers((prev) => prev.filter((p) => p.id !== player.id))
    setViewingResultsIds((prev) => {
      if (!prev.has(player.id)) return prev
      const next = new Set(prev)
      next.delete(player.id)
      return next
    })
  }

  function launchGame() {
    const path = gameMode === 'quiz' ? `/lobby/${code}/quiz` : `/lobby/${code}/ecriture`
    navigate(path, {
      state: {
        levels: orderedSelectedLevels.map((l) => l.id),
        questionCount,
        timePerQuestion,
      },
    })
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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>SALON DE PARTIE</div>
          <h1 className={styles.title}>{gameModeLabels[gameMode]}</h1>
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
            JOUEURS ({players.length}/{LOBBY_MAX_PLAYERS})
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
              const isViewingResults = viewingResultsIds.has(player.id)
              const canKick = you?.isHost && !player.isYou
              const objectiveLevelInfo = jlptLevels.find((l) => l.id === player.objectiveLevel)
              let statusClass = styles.statusWaiting
              let statusText = 'En attente...'
              if (isViewingResults) {
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
                  className={mode === gameMode ? styles.gameOptionActive : styles.gameOption}
                  onClick={() => setGameMode(mode)}
                >
                  {gameModeShortLabels[mode]}
                </button>
              ))}
            </div>

            <div className={styles.settingLabel}>Niveaux JLPT</div>
            <div className={styles.chipsRow}>
              {jlptLevels.map((level) => {
                const selected = selectedLevels.has(level.id)
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
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
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
              value={timePerQuestion}
              onChange={(e) => setTimePerQuestion(Number(e.target.value))}
            >
              {timePerQuestionOptions.map((n) => (
                <option key={n} value={n}>
                  {n} secondes
                </option>
              ))}
            </select>
          </div>

          <Button variant="accent" className={styles.launchButton} onClick={launchGame}>
            Lancer la partie
          </Button>
        </div>
      </div>
    </div>
  )
}
