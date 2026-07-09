import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { buildQuizQuestions } from '../mocks/kanji'
import { mockLobbyPlayers } from '../mocks/lobby'
import type { JlptLevelId } from '../mocks/jlptLevels'
import styles from './QuizScreen.module.css'

// Les autres joueurs du salon (mock) : simulent une réponse avec un délai aléatoire pour
// prévisualiser le comportement "on attend tout le monde" du futur mode multijoueur réel.
const botPlayers = mockLobbyPlayers.filter((p) => !p.isYou)

interface QuizLocationState {
  levels?: JlptLevelId[]
  questionCount?: number
  timePerQuestion?: number
}

const DEFAULT_LEVELS: JlptLevelId[] = ['N5', 'N4']
const DEFAULT_QUESTION_COUNT = 10
const DEFAULT_TIME_PER_QUESTION = 30
const URGENT_THRESHOLD_SECONDS = 5
const MAX_POINTS_PER_QUESTION = 1000
const MIN_POINTS_PER_QUESTION = 1
const AUTO_ADVANCE_SECONDS = 10

// Score façon Kahoot : plus la réponse est rapide, plus elle rapporte de points (1 à 1000).
// Calculé côté client ici (V1 solo/mock) ; en multijoueur réel, ce calcul devra être fait
// côté serveur à partir de l'horodatage d'envoi de la question, pour ne pas se fier au client.
function computePoints(elapsedMs: number, timeLimitSeconds: number): number {
  const ratio = Math.min(1, elapsedMs / (timeLimitSeconds * 1000))
  return Math.round(MAX_POINTS_PER_QUESTION - (MAX_POINTS_PER_QUESTION - MIN_POINTS_PER_QUESTION) * ratio)
}

export function QuizScreen() {
  const { code = 'AB3F9K' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as QuizLocationState) ?? {}

  const levels = state.levels?.length ? state.levels : DEFAULT_LEVELS
  const questionCount = state.questionCount ?? DEFAULT_QUESTION_COUNT
  const timePerQuestion = state.timePerQuestion ?? DEFAULT_TIME_PER_QUESTION

  const [questions, setQuestions] = useState(() => buildQuizQuestions(levels, questionCount))
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [lastPoints, setLastPoints] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(timePerQuestion)
  const [botAnswers, setBotAnswers] = useState<Record<string, number>>({})
  const [autoAdvanceLeft, setAutoAdvanceLeft] = useState<number | null>(null)
  const questionStartRef = useRef(Date.now())

  const current = questions[index]
  const answered = selected !== null || timedOut
  const isLastQuestion = index === questions.length - 1
  const finished = index >= questions.length
  const botsAnswered = botPlayers.filter((p) => p.id in botAnswers)
  const allBotsAnswered = botsAnswered.length === botPlayers.length
  const canAdvance = answered && (allBotsAnswered || timedOut)

  // Le temps ne se réinitialise que sur une nouvelle question, pas quand `answered` change.
  useEffect(() => {
    setTimeLeft(timePerQuestion)
    questionStartRef.current = Date.now()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  useEffect(() => {
    if (answered) return
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer)
          setTimedOut(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [index, answered])

  // Simule les autres joueurs du salon qui répondent avec un délai aléatoire (~75% de réussite).
  useEffect(() => {
    setBotAnswers({})
    const maxDelayMs = Math.max(1200, timePerQuestion * 1000 - 1500)
    const timeouts = botPlayers.map((p) => {
      const delay = 800 + Math.random() * maxDelayMs
      return setTimeout(() => {
        const correct = Math.random() < 0.75
        const points = correct ? Math.round(200 + Math.random() * 800) : 0
        setBotAnswers((prev) => ({ ...prev, [p.id]: points }))
      }, delay)
    })
    return () => timeouts.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  // Quand le temps est écoulé, on force la réponse des joueurs restants (comme un vrai minuteur commun).
  useEffect(() => {
    if (!timedOut) return
    setBotAnswers((prev) => {
      const next = { ...prev }
      botPlayers.forEach((p) => {
        if (!(p.id in next)) next[p.id] = 0
      })
      return next
    })
  }, [timedOut])

  // Si personne (l'hôte) ne clique sur "Question suivante", on avance automatiquement
  // au bout de quelques secondes pour ne pas bloquer toute la salle.
  useEffect(() => {
    if (!canAdvance) {
      setAutoAdvanceLeft(null)
      return
    }
    setAutoAdvanceLeft(AUTO_ADVANCE_SECONDS)
    const interval = setInterval(() => {
      setAutoAdvanceLeft((t) => (t !== null && t > 1 ? t - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [canAdvance])

  useEffect(() => {
    if (autoAdvanceLeft === 0) nextQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdvanceLeft])

  function selectAnswer(option: string) {
    if (answered) return
    setSelected(option)
    if (option === current.correctAnswer) {
      const points = computePoints(Date.now() - questionStartRef.current, timePerQuestion)
      setScore((s) => s + points)
      setCorrectCount((c) => c + 1)
      setLastPoints(points)
    } else {
      setLastPoints(0)
    }
  }

  function nextQuestion() {
    setIndex((i) => i + 1)
    setSelected(null)
    setTimedOut(false)
    setLastPoints(null)
  }

  function restart() {
    setQuestions(buildQuizQuestions(levels, questionCount))
    setIndex(0)
    setSelected(null)
    setTimedOut(false)
    setScore(0)
    setCorrectCount(0)
    setLastPoints(null)
  }

  if (finished) {
    const percent = Math.round((correctCount / questions.length) * 100)
    return (
      <div className={styles.page}>
        <div className={styles.endCard}>
          <div className={styles.eyebrow}>QUIZ TERMINÉ</div>
          <h1 className={styles.endTitle}>{score} points</h1>
          <p className={styles.endSubtitle}>
            {correctCount} / {questions.length} bonnes réponses ({percent}%)
          </p>
          <div className={styles.endActions}>
            <Button variant="primary" onClick={restart}>
              Rejouer
            </Button>
            <Button variant="outline" onClick={() => navigate(`/lobby/${code}`)}>
              Retour au salon
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const timerUrgent = timeLeft <= URGENT_THRESHOLD_SECONDS && !answered

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.progressText}>
          Question <strong>{index + 1}</strong> / {questions.length}
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>
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
          <div className={styles.statValue}>{score}</div>
        </div>
      </div>

      <div className={styles.playersStrip}>
        {botPlayers.map((p) => {
          const points = botAnswers[p.id]
          const hasAnswered = points !== undefined
          return (
            <div
              key={p.id}
              className={hasAnswered ? `${styles.playerChip} ${styles.playerChipAnswered}` : styles.playerChip}
            >
              <span className={styles.playerChipAvatar} style={{ background: p.color }}>
                {p.initials}
              </span>
              <span>{p.name}</span>
              <span className={styles.playerChipStatus}>
                {hasAnswered ? `✓ +${points} pts` : 'répond...'}
              </span>
            </div>
          )
        })}
      </div>

      <div className={styles.body}>
        <div className={styles.kanjiColumn}>
          <div className={styles.kanjiBig}>{current.kanji.character}</div>
          <div className={styles.readings}>
            <span>
              <strong>on</strong>　{current.kanji.onyomi}
            </span>
            <span>
              <strong>kun</strong>　{current.kanji.kunyomi}
            </span>
          </div>
        </div>

        <div>
          <div className={styles.question}>Quelle est la bonne signification ?</div>
          <div className={styles.optionsGrid}>
            {current.options.map((option) => {
              const isCorrect = option === current.correctAnswer
              const isSelected = option === selected
              let optionClass = styles.option
              if (answered) {
                if (isCorrect) optionClass = `${styles.option} ${styles.optionCorrect}`
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
                  {answered && isCorrect ? ' ✓' : ''}
                  {answered && isSelected && !isCorrect ? ' ✕' : ''}
                </button>
              )
            })}
          </div>

          {timedOut && !selected && <div className={styles.timeoutNote}>Temps écoulé !</div>}

          {answered && lastPoints !== null && (
            <div className={lastPoints > 0 ? styles.pointsNoteSuccess : styles.pointsNoteZero}>
              {lastPoints > 0 ? `+${lastPoints} points` : '0 point'}
            </div>
          )}

          {answered && !canAdvance && (
            <div className={styles.waitingNote}>
              En attente des autres joueurs... ({botsAnswered.length}/{botPlayers.length})
            </div>
          )}

          {canAdvance && (
            <div className={styles.nextRow}>
              {autoAdvanceLeft !== null && (
                <span className={styles.autoAdvanceNote}>
                  Passage automatique dans {autoAdvanceLeft}s
                </span>
              )}
              <Button variant="primary" onClick={nextQuestion}>
                {isLastQuestion ? 'Voir les résultats →' : 'Question suivante →'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
