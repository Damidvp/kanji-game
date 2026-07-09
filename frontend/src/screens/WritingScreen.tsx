import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import HanziWriter from 'hanzi-writer'
import { Button } from '../components/Button'
import { buildWritingRounds } from '../mocks/kanji'
import { mockLobbyPlayers } from '../mocks/lobby'
import type { JlptLevelId } from '../mocks/jlptLevels'
import styles from './WritingScreen.module.css'

// Les autres joueurs du salon (mock) : même simulation que le Quiz Kanji, pour prévisualiser
// le comportement "on attend tout le monde" du futur mode multijoueur réel.
const botPlayers = mockLobbyPlayers.filter((p) => !p.isYou)
const you = mockLobbyPlayers.find((p) => p.isYou)!

interface WritingLocationState {
  levels?: JlptLevelId[]
  questionCount?: number
  timePerQuestion?: number
}

const DEFAULT_LEVELS: JlptLevelId[] = ['N5', 'N4']
const DEFAULT_QUESTION_COUNT = 10
const DEFAULT_TIME_PER_QUESTION = 30
const URGENT_THRESHOLD_SECONDS = 5
const CANVAS_SIZE = 380
const AUTO_ADVANCE_SECONDS = 10
const LEAVE_CHANCE = 0.08

interface BotResult {
  status: 'answered' | 'left'
  score: number
}

export function WritingScreen() {
  const { code = 'AB3F9K' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as WritingLocationState) ?? {}

  const levels = state.levels?.length ? state.levels : DEFAULT_LEVELS
  const questionCount = state.questionCount ?? DEFAULT_QUESTION_COUNT
  const timePerQuestion = state.timePerQuestion ?? DEFAULT_TIME_PER_QUESTION

  const [rounds] = useState(() => buildWritingRounds(levels, questionCount))
  const [index, setIndex] = useState(0)
  const [validated, setValidated] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [scores, setScores] = useState<number[]>([])
  const [timeLeft, setTimeLeft] = useState(timePerQuestion)
  const [strokeProgress, setStrokeProgress] = useState(0)
  const [totalStrokesDisplay, setTotalStrokesDisplay] = useState<number | null>(null)
  const [botAnswers, setBotAnswers] = useState<Record<string, BotResult>>({})
  const [leftPlayerIds, setLeftPlayerIds] = useState<Set<string>>(new Set())
  const [autoAdvanceLeft, setAutoAdvanceLeft] = useState<number | null>(null)

  const targetRef = useRef<HTMLDivElement>(null)
  const writerRef = useRef<HanziWriter | null>(null)
  const firstTryCorrectRef = useRef(0)
  const totalStrokesRef = useRef(0)
  const botScoreTotalsRef = useRef<Record<string, number>>({})

  const current = rounds[index]
  const finished = index >= rounds.length
  const isLastRound = index === rounds.length - 1
  const averageScore = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    : 0
  const botsResolved = botPlayers.filter((p) => p.id in botAnswers)
  const allBotsResolved = botsResolved.length === botPlayers.length
  const canAdvance = validated && (allBotsResolved || timedOut)

  function finishRound() {
    const total = totalStrokesRef.current || 1
    const score = Math.round((firstTryCorrectRef.current / total) * 100)
    setLastScore(score)
    setScores((prev) => [...prev, score])
    setValidated(true)
  }

  function startQuiz(writer: HanziWriter) {
    writer.quiz({
      onCorrectStroke: (strokeData) => {
        if (strokeData.mistakesOnStroke === 0) firstTryCorrectRef.current += 1
        setStrokeProgress(strokeData.strokeNum + 1)
      },
      onComplete: () => finishRound(),
    })
  }

  // (Re)crée le writer HanziWriter — moteur réel de reconnaissance de tracé, basé sur les
  // données KanjiVG (via le dataset "Make Me a Hanzi" qu'utilise HanziWriter, lui-même
  // construit à partir de KanjiVG pour les kanji). Ni le kanji ni son contour ne sont
  // affichés : le joueur doit l'écrire sans aide.
  useEffect(() => {
    if (!targetRef.current || !current) return
    targetRef.current.innerHTML = ''
    firstTryCorrectRef.current = 0
    totalStrokesRef.current = 0
    setStrokeProgress(0)
    setTotalStrokesDisplay(null)

    const writer = HanziWriter.create(targetRef.current, current.character, {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      padding: 24,
      showCharacter: false,
      showOutline: false,
      strokeColor: '#1B1B1B',
      drawingColor: '#1B1B1B',
      highlightColor: '#C0392B',
      outlineColor: '#E3DCCD',
    })
    writerRef.current = writer

    writer.getCharacterData().then((data) => {
      totalStrokesRef.current = data.strokes.length
      setTotalStrokesDisplay(data.strokes.length)
    })

    startQuiz(writer)

    return () => {
      writerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  useEffect(() => {
    setTimeLeft(timePerQuestion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  useEffect(() => {
    if (validated) return
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer)
          setTimedOut(true)
          writerRef.current?.cancelQuiz()
          finishRound()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, validated])

  // Simule les autres joueurs du salon : chacun termine son tracé avec un délai aléatoire, ou
  // quitte la partie (~8% de chance) — un joueur ayant quitté ne participe plus aux kanji suivants.
  useEffect(() => {
    setBotAnswers(() => {
      const initial: Record<string, BotResult> = {}
      botPlayers.forEach((p) => {
        if (leftPlayerIds.has(p.id)) initial[p.id] = { status: 'left', score: 0 }
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
            setBotAnswers((prev) => ({ ...prev, [p.id]: { status: 'left', score: 0 } }))
            return
          }
          const score = Math.round(35 + Math.random() * 60)
          botScoreTotalsRef.current[p.id] = (botScoreTotalsRef.current[p.id] || 0) + score
          setBotAnswers((prev) => ({ ...prev, [p.id]: { status: 'answered', score } }))
        }, delay)
      })
    return () => timeouts.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  // Quand le temps est écoulé, on force la résolution des joueurs restants (minuteur commun).
  useEffect(() => {
    if (!timedOut) return
    setBotAnswers((prev) => {
      const next = { ...prev }
      botPlayers.forEach((p) => {
        if (!(p.id in next)) next[p.id] = { status: 'answered', score: 0 }
      })
      return next
    })
  }, [timedOut])

  // Si personne (l'hôte) ne clique sur "Kanji suivant", on avance automatiquement au bout de
  // quelques secondes pour ne pas bloquer toute la salle.
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
    if (autoAdvanceLeft === 0) nextRound()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdvanceLeft])

  function restartCharacter() {
    if (validated || !writerRef.current) return
    firstTryCorrectRef.current = 0
    setStrokeProgress(0)
    writerRef.current.cancelQuiz()
    startQuiz(writerRef.current)
  }

  function nextRound() {
    setIndex((i) => i + 1)
    setValidated(false)
    setTimedOut(false)
    setLastScore(null)
  }

  function quitGame() {
    if (
      window.confirm("Quitter la partie ? Vous serez ramené à l'accueil et votre progression sera perdue.")
    ) {
      navigate('/')
    }
  }

  // Une fois le dernier kanji passé, direction l'écran de résultats avec le classement complet
  // (vous + les joueurs simulés) plutôt qu'un simple encart local.
  useEffect(() => {
    if (!finished) return
    const players = [
      {
        id: you.id,
        name: you.name,
        initials: you.initials,
        color: you.color,
        score: averageScore,
        scoreLabel: '%',
        accuracy: `${averageScore}%`,
      },
      ...botPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        initials: p.initials,
        color: p.color,
        score: Math.round((botScoreTotalsRef.current[p.id] || 0) / rounds.length),
        scoreLabel: '%',
        accuracy: `${Math.round((botScoreTotalsRef.current[p.id] || 0) / rounds.length)}%`,
      })),
    ]
    navigate(`/lobby/${code}/resultats`, {
      replace: true,
      state: {
        title: `ÉCRITURE DE KANJI ${levels.join(' · ')}`,
        players,
        replay: { path: `/lobby/${code}/ecriture`, state: { levels, questionCount, timePerQuestion } },
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  if (rounds.length === 0) return null
  if (finished) return null

  const timerUrgent = timeLeft <= URGENT_THRESHOLD_SECONDS && !validated

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.progressText}>
          Kanji <strong>{index + 1}</strong> / {rounds.length}
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${((index + 1) / rounds.length) * 100}%` }}
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
          <div className={styles.statLabel}>SCORE MOYEN</div>
          <div className={styles.statValue}>{averageScore}%</div>
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
                {hasLeft ? '✕ A quitté' : hasAnswered ? `✓ ${result.score}%` : 'trace...'}
              </span>
            </div>
          )
        })}
      </div>

      <div className={styles.body}>
        <div>
          <div className={styles.sectionLabel}>INDICES</div>
          <div className={styles.hintsCard}>
            <div className={styles.hintLabel}>Lecture on'yomi</div>
            <div className={styles.hintValue}>{current.onyomi}</div>
            <div className={styles.hintLabel}>Lecture kun'yomi</div>
            <div className={styles.hintValue}>{current.kunyomi}</div>
            <div className={styles.hintLabel}>Signification</div>
            <div className={styles.hintValueLast}>{current.meaningFr}</div>
          </div>

          <div className={styles.strokeCounter}>
            {totalStrokesDisplay !== null
              ? `Trait ${Math.min(strokeProgress + 1, totalStrokesDisplay)} / ${totalStrokesDisplay}`
              : 'Chargement des données de tracé...'}
          </div>

          <div className={styles.actionsRow}>
            <Button variant="outline" onClick={restartCharacter} disabled={validated}>
              Recommencer
            </Button>
          </div>

          {validated && lastScore !== null && (
            <div className={styles.scoreNote}>{lastScore}% de traits corrects du premier coup</div>
          )}

          {validated && !canAdvance && (
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
              <Button variant="primary" onClick={nextRound}>
                {isLastRound ? 'Voir les résultats →' : 'Kanji suivant →'}
              </Button>
            </div>
          )}
        </div>

        <div className={styles.canvasColumn}>
          <div className={styles.sectionLabel}>DESSINE LE KANJI</div>
          <div className={styles.canvasFrame}>
            <div className={styles.guideVertical} />
            <div className={styles.guideHorizontal} />
            <div ref={targetRef} className={styles.hanziTarget} />
          </div>
          <div className={styles.canvasHint}>
            Trace chaque trait dans l'ordre, au doigt, à la souris, ou au stylet — un trait
            incorrect se réinitialise pour être retenté.
          </div>
        </div>
      </div>
    </div>
  )
}
