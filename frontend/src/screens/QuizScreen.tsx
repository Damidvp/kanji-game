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
const you = mockLobbyPlayers.find((p) => p.isYou)!

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
const LEAVE_CHANCE = 0.08

interface BotResult {
  status: 'answered' | 'left'
  points: number
}

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

  const [questions] = useState(() => buildQuizQuestions(levels, questionCount))
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [lastPoints, setLastPoints] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(timePerQuestion)
  const [botAnswers, setBotAnswers] = useState<Record<string, BotResult>>({})
  const [leftPlayerIds, setLeftPlayerIds] = useState<Set<string>>(new Set())
  const [autoAdvanceLeft, setAutoAdvanceLeft] = useState<number | null>(null)
  const questionStartRef = useRef(Date.now())
  const botScoreTotalsRef = useRef<Record<string, number>>({})
  const botCorrectCountsRef = useRef<Record<string, number>>({})

  const current = questions[index]
  const answered = selected !== null || timedOut
  const isLastQuestion = index === questions.length - 1
  const finished = index >= questions.length
  const botsResolved = botPlayers.filter((p) => p.id in botAnswers)
  const allBotsResolved = botsResolved.length === botPlayers.length
  const canAdvance = answered && (allBotsResolved || timedOut)

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

  // Simule les autres joueurs du salon : chacun répond avec un délai aléatoire (~75% de
  // réussite), ou quitte la partie (~8% de chance) — un joueur ayant quitté ne répond plus
  // aux questions suivantes.
  useEffect(() => {
    setBotAnswers(() => {
      const initial: Record<string, BotResult> = {}
      botPlayers.forEach((p) => {
        if (leftPlayerIds.has(p.id)) initial[p.id] = { status: 'left', points: 0 }
      })
      return initial
    })
    const maxDelayMs = Math.max(1200, timePerQuestion * 1000 - 1500)
    const timeouts = botPlayers
      .filter((p) => !leftPlayerIds.has(p.id))
      .map((p) => {
        const delay = 800 + Math.random() * maxDelayMs
        return setTimeout(() => {
          if (Math.random() < LEAVE_CHANCE) {
            setLeftPlayerIds((prev) => new Set(prev).add(p.id))
            setBotAnswers((prev) => ({ ...prev, [p.id]: { status: 'left', points: 0 } }))
            return
          }
          const correct = Math.random() < 0.75
          const points = correct ? Math.round(200 + Math.random() * 800) : 0
          botScoreTotalsRef.current[p.id] = (botScoreTotalsRef.current[p.id] || 0) + points
          if (correct) botCorrectCountsRef.current[p.id] = (botCorrectCountsRef.current[p.id] || 0) + 1
          setBotAnswers((prev) => ({ ...prev, [p.id]: { status: 'answered', points } }))
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
        if (!(p.id in next)) next[p.id] = { status: 'answered', points: 0 }
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

  function quitGame() {
    // On ramène à l'accueil plutôt qu'au salon : le salon n'existe plus pour ce joueur une
    // fois qu'il a quitté, et le laisser y retourner permettrait de relancer une partie
    // sur un salon qu'il a abandonné (état incohérent une fois le multijoueur réel branché).
    if (window.confirm('Quitter la partie ? Vous serez ramené à l\'accueil et votre progression sera perdue.')) {
      navigate('/')
    }
  }

  function nextQuestion() {
    setIndex((i) => i + 1)
    setSelected(null)
    setTimedOut(false)
    setLastPoints(null)
  }

  // Une fois la dernière question passée, direction l'écran de résultats avec le classement
  // complet (vous + les joueurs simulés) plutôt qu'un simple encart local.
  useEffect(() => {
    if (!finished) return
    const players = [
      {
        id: you.id,
        name: you.name,
        initials: you.initials,
        color: you.color,
        score,
        scoreLabel: 'pts',
        accuracy: `${Math.round((correctCount / questions.length) * 100)}%`,
      },
      ...botPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        initials: p.initials,
        color: p.color,
        score: botScoreTotalsRef.current[p.id] || 0,
        scoreLabel: 'pts',
        accuracy: `${Math.round(((botCorrectCountsRef.current[p.id] || 0) / questions.length) * 100)}%`,
      })),
    ]
    navigate(`/lobby/${code}/resultats`, {
      replace: true,
      state: {
        title: `QUIZ KANJI ${levels.join(' · ')}`,
        players,
        gameMode: 'quiz',
        levels,
        questionCount,
        timePerQuestion,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  if (finished) return null

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
          <div className={styles.statValue}>{score}</div>
        </div>
      </div>

      <div className={styles.playersStrip}>
        {botPlayers.map((p) => {
          const result = botAnswers[p.id]
          const hasLeft = result?.status === 'left'
          const hasAnswered = result?.status === 'answered'
          let chipClass = styles.playerChip
          if (hasAnswered) chipClass = `${styles.playerChip} ${styles.playerChipAnswered}`
          if (hasLeft) chipClass = `${styles.playerChip} ${styles.playerChipLeft}`
          return (
            <div key={p.id} className={chipClass}>
              <span className={styles.playerChipAvatar} style={{ background: p.color }}>
                {p.initials}
              </span>
              <span className={hasLeft ? styles.playerChipNameLeft : undefined}>{p.name}</span>
              <span className={styles.playerChipStatus}>
                {hasLeft ? '✕ A quitté' : hasAnswered ? `✓ +${result.points} pts` : 'répond...'}
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
              En attente des autres joueurs... ({botsResolved.length}/{botPlayers.length})
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
