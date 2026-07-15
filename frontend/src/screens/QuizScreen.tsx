import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { GuestNameModal } from '../components/GuestNameModal'
import { getSessionToken } from '../lib/session'
import { leaveRoom, advanceRound } from '../lib/rooms'
import { useRoomConnection } from '../hooks/useRoomConnection'
import {
  useRoomSocket,
  type RoundPayload,
  type RoundStatusPayload,
  type AnswerResultPayload,
  type ResultsPayload,
} from '../hooks/useRoomSocket'
import styles from './QuizScreen.module.css'

interface QuizLocationState {
  firstRound?: RoundPayload
}

const URGENT_THRESHOLD_SECONDS = 5
const GRACE_SECONDS = 10 // doit correspondre à ROUND_ADVANCE_GRACE_DELAY côté backend

function computeTimeLeft(round: RoundPayload | null): number {
  if (!round) return 0
  return Math.max(0, Math.ceil((new Date(round.endsAt).getTime() - Date.now()) / 1000))
}

export function QuizScreen() {
  const { code } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const locState = (location.state as QuizLocationState) ?? {}

  const { roomState, myParticipantId, needsGuestName, submitGuestName, error, retry, applyState } =
    useRoomConnection(code)

  const [round, setRound] = useState<RoundPayload | null>(locState.firstRound ?? null)
  const [roundStatus, setRoundStatus] = useState<RoundStatusPayload | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [answerResult, setAnswerResult] = useState<AnswerResultPayload | null>(null)
  const [totalScore, setTotalScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(() => computeTimeLeft(locState.firstRound ?? null))

  const { sendAnswer } = useRoomSocket(code ?? '', myParticipantId, {
    onRoomState: applyState,
    onRound: setRound,
    onRoundStatus: setRoundStatus,
    onAnswerResult: (result) => {
      setAnswerResult(result)
      setTotalScore((s) => s + result.points)
    },
    onResults: (results: ResultsPayload) => {
      if (!code) return
      navigate(`/lobby/${code}/resultats`, { replace: true, state: { results } })
    },
  })

  // Nouvelle manche : on réinitialise la réponse locale et le feedback de la précédente.
  useEffect(() => {
    setSelected(null)
    setAnswerResult(null)
  }, [round?.roundIndex])

  const answeredIds =
    roundStatus?.roundIndex === round?.roundIndex ? roundStatus.answeredParticipantIds : []
  const totalActive = roundStatus?.totalActiveParticipants ?? 0
  const everyoneAnswered = totalActive > 0 && answeredIds.length >= totalActive

  // Purement cosmétique (le vrai déclenchement est côté serveur, cf. ROUND_ADVANCE_GRACE_DELAY) :
  // affiche un compte à rebours pendant le délai de grâce laissé à l'hôte pour cliquer "Suivant".
  const [graceLeft, setGraceLeft] = useState<number | null>(null)
  useEffect(() => {
    if (!everyoneAnswered) {
      setGraceLeft(null)
      return
    }
    setGraceLeft(GRACE_SECONDS)
    const interval = setInterval(() => {
      setGraceLeft((t) => (t !== null && t > 1 ? t - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [everyoneAnswered, round?.roundIndex])

  // Se fige une fois que tout le monde a répondu : le compte à rebours de la question n'a plus
  // de sens à ce stade (c'est le délai de grâce ci-dessus qui régit la suite), le laisser courir
  // donnait l'impression d'un chrono qui ne s'arrête jamais.
  useEffect(() => {
    if (!round || everyoneAnswered) return
    setTimeLeft(computeTimeLeft(round))
    const interval = setInterval(() => setTimeLeft(computeTimeLeft(round)), 1000)
    return () => clearInterval(interval)
  }, [round, everyoneAnswered])

  function selectAnswer(option: string) {
    if (selected || !round) return
    setSelected(option)
    sendAnswer(getSessionToken(), { selectedOption: option })
  }

  function quitGame() {
    if (!code) return
    if (!window.confirm("Quitter la partie ? Vous serez ramené à l'accueil et votre progression sera perdue.")) {
      return
    }
    leaveRoom(code, getSessionToken()).catch(() => {})
    navigate('/')
  }

  if (needsGuestName) {
    return <GuestNameModal onSubmit={submitGuestName} onCancel={() => navigate('/')} />
  }

  if (error) {
    return (
      <div className={styles.page}>
        <p>{error}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="primary" onClick={retry}>
            Réessayer
          </Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    )
  }

  if (!round || !roomState) {
    return <div className={styles.page}>Connexion à la manche…</div>
  }

  const otherParticipants = roomState.participants.filter(
    (p) => p.id !== myParticipantId && p.status !== 'LEFT' && p.status !== 'KICKED',
  )
  const isHost = roomState.participants.find((p) => p.id === myParticipantId)?.isHost ?? false
  const isLastQuestion = round.roundIndex + 1 >= roomState.questionCount
  const answered = selected !== null
  const timerUrgent = timeLeft <= URGENT_THRESHOLD_SECONDS && !answered

  function nextQuestion() {
    if (!code) return
    advanceRound(code, getSessionToken()).catch(() => {})
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.progressText}>
          Question <strong>{round.roundIndex + 1}</strong> / {roomState.questionCount}
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${((round.roundIndex + 1) / roomState.questionCount) * 100}%` }}
          />
        </div>
        <Button variant="outline" className={styles.quitButton} onClick={quitGame}>
          Quitter la partie
        </Button>
      </div>

      <div className={styles.statsRow}>
        <div className={timerUrgent ? `${styles.statBox} ${styles.statBoxUrgent}` : styles.statBox}>
          <div className={styles.statLabel}>TEMPS RESTANT</div>
          <div className={timerUrgent ? `${styles.statValue} ${styles.statValueUrgent}` : styles.statValue}>
            {timeLeft}s
          </div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>SCORE</div>
          <div className={styles.statValue}>{totalScore}</div>
        </div>
      </div>

      <div className={styles.playersStrip}>
        {otherParticipants.map((p) => {
          const hasAnswered = answeredIds.includes(p.id)
          const chipClass = hasAnswered ? `${styles.playerChip} ${styles.playerChipAnswered}` : styles.playerChip
          return (
            <div key={p.id} className={chipClass}>
              <span className={styles.playerChipAvatar} style={{ background: p.color }}>
                {p.initials}
              </span>
              <span>{p.name}</span>
              <span className={styles.playerChipStatus}>{hasAnswered ? '✓ a répondu' : 'répond...'}</span>
            </div>
          )
        })}
      </div>

      <div className={styles.body}>
        <div className={styles.kanjiColumn}>
          <div className={styles.kanjiBig}>{round.kanji.character}</div>
          <div className={styles.readings}>
            <span>
              <strong>on</strong>　{round.kanji.onyomi}
            </span>
            <span>
              <strong>kun</strong>　{round.kanji.kunyomi}
            </span>
          </div>
        </div>

        <div>
          <div className={styles.question}>Quelle est la bonne signification ?</div>
          <div className={styles.optionsGrid}>
            {(round.options ?? []).map((option) => {
              const isSelected = option === selected
              const isCorrectOption = answered && answerResult != null && option === answerResult.correctOption
              let optionClass = styles.option
              if (answered) {
                if (isCorrectOption) optionClass = `${styles.option} ${styles.optionCorrect}`
                else if (isSelected) optionClass = `${styles.option} ${styles.optionWrong}`
                else optionClass = `${styles.option} ${styles.optionDisabled}`
              }
              return (
                <button
                  key={option}
                  type="button"
                  className={optionClass}
                  onClick={() => selectAnswer(option)}
                  disabled={answered}
                >
                  {option}
                  {isCorrectOption ? ' ✓' : ''}
                  {answered && isSelected && !isCorrectOption ? ' ✕' : ''}
                </button>
              )
            })}
          </div>

          {answered && answerResult && (
            <div className={answerResult.points > 0 ? styles.pointsNoteSuccess : styles.pointsNoteZero}>
              {answerResult.points > 0 ? `+${answerResult.points} points` : '0 point'}
            </div>
          )}

          {answered && !answerResult && <div className={styles.waitingNote}>Réponse envoyée…</div>}

          {answered && answerResult && !everyoneAnswered && (
            <div className={styles.waitingNote}>
              En attente des autres joueurs... ({answeredIds.length}/{totalActive || otherParticipants.length + 1})
            </div>
          )}

          {everyoneAnswered && !isHost && (
            <div className={styles.waitingNote}>En attente de l'hôte...</div>
          )}

          {everyoneAnswered && isHost && (
            <div className={styles.nextRow}>
              {graceLeft !== null && (
                <span className={styles.autoAdvanceNote}>Passage automatique dans {graceLeft}s</span>
              )}
              <Button variant="primary" onClick={nextQuestion}>
                {isLastQuestion ? 'Voir les résultats →' : 'Question suivante →'}
              </Button>
            </div>
          )}

          {timeLeft === 0 && !answered && <div className={styles.timeoutNote}>Temps écoulé !</div>}
        </div>
      </div>
    </div>
  )
}
