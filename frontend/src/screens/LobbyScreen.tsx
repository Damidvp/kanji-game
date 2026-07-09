import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { jlptLevels, type JlptLevelId } from '../mocks/jlptLevels'
import { mockLobbyPlayers, LOBBY_MAX_PLAYERS, type LobbyPlayer } from '../mocks/lobby'
import styles from './LobbyScreen.module.css'

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

export function LobbyScreen() {
  const { code = 'AB3F9K' } = useParams()
  const navigate = useNavigate()
  const [players, setPlayers] = useState<LobbyPlayer[]>(mockLobbyPlayers)
  const [gameMode, setGameMode] = useState<GameMode>('quiz')
  const [selectedLevels, setSelectedLevels] = useState<Set<JlptLevelId>>(new Set(['N5', 'N4']))
  const [questionCount, setQuestionCount] = useState(20)
  const [timePerQuestion, setTimePerQuestion] = useState(30)
  const [copied, setCopied] = useState(false)

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

  function launchGame() {
    if (gameMode !== 'quiz') return // mini-jeu Écriture pas encore branché
    navigate(`/lobby/${code}/quiz`, {
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
            {filledSlots.map((player, i) =>
              player ? (
                <div key={player.id} className={styles.slotFilled}>
                  <div className={styles.avatar} style={{ background: player.color }}>
                    {player.initials}
                  </div>
                  <div className={styles.playerName}>{player.name}</div>
                  <div className={player.ready ? styles.statusReady : styles.statusWaiting}>
                    {player.ready ? 'Prêt' : 'En attente...'}
                  </div>
                  {player.isHost && <div className={styles.hostBadge}>HÔTE</div>}
                </div>
              ) : (
                <div key={`empty-${i}`} className={styles.slotEmpty}>
                  <div className={styles.avatarEmpty} />
                  <div className={styles.emptyLabel}>En attente...</div>
                </div>
              ),
            )}
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

          <Button
            variant="accent"
            className={styles.launchButton}
            onClick={launchGame}
            disabled={gameMode !== 'quiz'}
            title={gameMode !== 'quiz' ? 'Mini-jeu Écriture bientôt disponible' : undefined}
          >
            Lancer la partie
          </Button>
        </div>
      </div>
    </div>
  )
}
