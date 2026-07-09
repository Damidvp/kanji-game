import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { buildWritingRounds } from '../mocks/kanji'
import { mockLobbyPlayers } from '../mocks/lobby'
import type { JlptLevelId } from '../mocks/jlptLevels'
import styles from './WritingScreen.module.css'

// Les autres joueurs du salon (mock) : même simulation que le Quiz Kanji, pour prévisualiser
// le comportement "on attend tout le monde" du futur mode multijoueur réel.
const botPlayers = mockLobbyPlayers.filter((p) => !p.isYou)

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

// Heuristique V1 (sans HanziWriter/KanjiVG) : on compare les pixels tracés par le joueur à
// ceux du kanji imprimé en police Shippori Mincho, en offscreen. Ce n'est PAS une vraie
// reconnaissance d'ordre des traits (cf. specs — à remplacer par KanjiVG + HanziWriter en
// phase 2), juste un score de ressemblance de forme pour rendre "Valider le tracé" testable.
function computeSimilarity(canvas: HTMLCanvasElement, character: string): number {
  const size = canvas.width
  const reference = document.createElement('canvas')
  reference.width = size
  reference.height = size
  const refCtx = reference.getContext('2d')!
  refCtx.fillStyle = '#fff'
  refCtx.fillRect(0, 0, size, size)
  refCtx.fillStyle = '#000'
  refCtx.font = `600 ${Math.round(size * 0.68)}px "Shippori Mincho", serif`
  refCtx.textAlign = 'center'
  refCtx.textBaseline = 'middle'
  refCtx.fillText(character, size / 2, size / 2 + size * 0.02)

  const refData = refCtx.getImageData(0, 0, size, size).data
  const userData = canvas.getContext('2d')!.getImageData(0, 0, size, size).data

  let refInk = 0
  let userInk = 0
  let overlap = 0
  for (let i = 0; i < refData.length; i += 4) {
    const isRefInk = refData[i] < 128
    const isUserInk = userData[i + 3] > 10
    if (isRefInk) refInk++
    if (isUserInk) userInk++
    if (isRefInk && isUserInk) overlap++
  }
  if (userInk === 0 || refInk === 0) return 0
  const precision = overlap / userInk
  const recall = overlap / refInk
  return Math.max(0, Math.min(100, Math.round(((precision + recall) / 2) * 100)))
}

export function WritingScreen() {
  const { code = 'AB3F9K' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as WritingLocationState) ?? {}

  const levels = state.levels?.length ? state.levels : DEFAULT_LEVELS
  const questionCount = state.questionCount ?? DEFAULT_QUESTION_COUNT
  const timePerQuestion = state.timePerQuestion ?? DEFAULT_TIME_PER_QUESTION

  const [rounds, setRounds] = useState(() => buildWritingRounds(levels, questionCount))
  const [index, setIndex] = useState(0)
  const [validated, setValidated] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [scores, setScores] = useState<number[]>([])
  const [hasDrawn, setHasDrawn] = useState(false)
  const [timeLeft, setTimeLeft] = useState(timePerQuestion)
  const [botAnswers, setBotAnswers] = useState<Record<string, BotResult>>({})
  const [leftPlayerIds, setLeftPlayerIds] = useState<Set<string>>(new Set())
  const [autoAdvanceLeft, setAutoAdvanceLeft] = useState<number | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  const current = rounds[index]
  const finished = index >= rounds.length
  const isLastRound = index === rounds.length - 1
  const averageScore = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    : 0
  const botsResolved = botPlayers.filter((p) => p.id in botAnswers)
  const allBotsResolved = botsResolved.length === botPlayers.length
  const canAdvance = validated && (allBotsResolved || timedOut)

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
          validateStroke()
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

  function getCanvasPoint(e: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    }
  }

  function startDrawing(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (validated) return
    drawingRef.current = true
    lastPointRef.current = getCanvasPoint(e)
  }

  function draw(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || validated) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const point = getCanvasPoint(e)
    const last = lastPointRef.current!
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1B1B1B'
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    lastPointRef.current = point
    setHasDrawn(true)
  }

  function stopDrawing() {
    drawingRef.current = false
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  function validateStroke() {
    const canvas = canvasRef.current
    const score = canvas ? computeSimilarity(canvas, current.character) : 0
    setLastScore(score)
    setScores((prev) => [...prev, score])
    setValidated(true)
  }

  function nextRound() {
    setIndex((i) => i + 1)
    setValidated(false)
    setTimedOut(false)
    setLastScore(null)
    setHasDrawn(false)
  }

  function restart() {
    setRounds(buildWritingRounds(levels, questionCount))
    setIndex(0)
    setValidated(false)
    setTimedOut(false)
    setLastScore(null)
    setScores([])
    setHasDrawn(false)
  }

  function quitGame() {
    if (
      window.confirm("Quitter la partie ? Vous serez ramené à l'accueil et votre progression sera perdue.")
    ) {
      navigate('/')
    }
  }

  // Efface le canvas au changement de kanji.
  useEffect(() => {
    clearCanvas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  if (rounds.length === 0) return null

  if (finished) {
    return (
      <div className={styles.page}>
        <div className={styles.endCard}>
          <div className={styles.eyebrow}>ÉCRITURE TERMINÉE</div>
          <h1 className={styles.endTitle}>{averageScore}% de ressemblance</h1>
          <p className={styles.endSubtitle}>{rounds.length} kanji tracés</p>
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
          <div className={styles.actionsRow}>
            <Button variant="outline" onClick={clearCanvas} disabled={validated}>
              Effacer
            </Button>
            <Button variant="accent" onClick={validateStroke} disabled={validated || !hasDrawn}>
              Valider le tracé
            </Button>
          </div>

          {validated && lastScore !== null && (
            <div className={styles.scoreNote}>{lastScore}% de ressemblance</div>
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
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className={styles.canvas}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
            />
          </div>
          <div className={styles.canvasHint}>Trace le kanji au doigt, à la souris, ou au stylet</div>
        </div>
      </div>
    </div>
  )
}
