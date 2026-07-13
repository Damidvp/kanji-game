import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import HanziWriter from 'hanzi-writer'
import { Button } from '../components/Button'
import { GuestNameModal } from '../components/GuestNameModal'
import { getSessionToken } from '../lib/session'
import { leaveRoom, advanceRound } from '../lib/rooms'
import { getKanjiPool } from '../lib/kanji'
import { useRoomConnection } from '../hooks/useRoomConnection'
import { useRoomSocket, type RoundPayload, type RoundStatusPayload, type ResultsPayload } from '../hooks/useRoomSocket'
import styles from './WritingScreen.module.css'

interface WritingLocationState {
  firstRound?: RoundPayload
}

const URGENT_THRESHOLD_SECONDS = 5
const CANVAS_SIZE = 380
const GRACE_SECONDS = 10 // doit correspondre à ROUND_ADVANCE_GRACE_DELAY côté backend

function computeTimeLeft(round: RoundPayload | null): number {
  if (!round) return 0
  return Math.max(0, Math.ceil((new Date(round.endsAt).getTime() - Date.now()) / 1000))
}

export function WritingScreen() {
  const { code } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const locState = (location.state as WritingLocationState) ?? {}

  const { roomState, myParticipantId, needsGuestName, submitGuestName, error, retry, applyState } =
    useRoomConnection(code)

  const [round, setRound] = useState<RoundPayload | null>(locState.firstRound ?? null)
  const [roundStatus, setRoundStatus] = useState<RoundStatusPayload | null>(null)
  const [validated, setValidated] = useState(false)
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [scores, setScores] = useState<number[]>([])
  const [timeLeft, setTimeLeft] = useState(() => computeTimeLeft(locState.firstRound ?? null))
  const [strokeProgress, setStrokeProgress] = useState(0)
  const [totalStrokesDisplay, setTotalStrokesDisplay] = useState<number | null>(null)
  const [meanings, setMeanings] = useState<Record<string, string>>({})

  const targetRef = useRef<HTMLDivElement>(null)
  const writerRef = useRef<HanziWriter | null>(null)
  const firstTryCorrectRef = useRef(0)
  const totalStrokesRef = useRef(0)
  const validatedRef = useRef(false)

  const { sendAnswer } = useRoomSocket(code ?? '', myParticipantId, {
    onRoomState: applyState,
    onRound: setRound,
    onRoundStatus: setRoundStatus,
    onResults: (results: ResultsPayload) => {
      if (!code) return
      navigate(`/lobby/${code}/resultats`, { replace: true, state: { results } })
    },
  })

  const averageScore = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    : 0

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

  // Le pool de kanji du salon donne les significations FR, absentes du payload de manche
  // (qui ne contient que caractère/lectures/nb de traits, cf. docs/backend/FRONTEND_INTEGRATION.md §4).
  useEffect(() => {
    if (!roomState) return
    getKanjiPool(roomState.levels)
      .then((pool) => {
        setMeanings(Object.fromEntries(pool.map((k) => [k.character, k.meaningFr])))
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomState?.levels.join(',')])

  function finishRound(totalMistakes: number) {
    if (validatedRef.current) return
    validatedRef.current = true
    const total = totalStrokesRef.current || 1
    const score = Math.round((firstTryCorrectRef.current / total) * 100)
    setLastScore(score)
    setScores((prev) => [...prev, score])
    setValidated(true)
    sendAnswer(getSessionToken(), { strokeScore: score, strokeMistakes: totalMistakes })
  }

  function startQuiz(writer: HanziWriter) {
    writer.quiz({
      onCorrectStroke: (strokeData) => {
        if (strokeData.mistakesOnStroke === 0) firstTryCorrectRef.current += 1
        setStrokeProgress(strokeData.strokeNum + 1)
      },
      onComplete: (summary) => finishRound(summary.totalMistakes),
    })
  }

  // (Re)crée le writer HanziWriter à chaque nouvelle manche.
  useEffect(() => {
    if (!targetRef.current || !round) return
    targetRef.current.innerHTML = ''
    firstTryCorrectRef.current = 0
    totalStrokesRef.current = 0
    validatedRef.current = false
    setStrokeProgress(0)
    setTotalStrokesDisplay(round.kanji.strokeCount)
    setValidated(false)
    setLastScore(null)

    const writer = HanziWriter.create(targetRef.current, round.kanji.character, {
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
  }, [round?.roundIndex])

  // Tick + déclenchement du timeout dans le même effet (et non deux effets séparés réagissant
  // à `timeLeft`) pour éviter qu'un premier rendu à `timeLeft === 0` (valeur initiale, avant le
  // premier tick) ne déclenche un timeout immédiat et prématuré. Se fige une fois que tout le
  // monde a répondu : à ce stade `finishRound` a déjà été appelé pour ce joueur (validatedRef),
  // et le chrono n'a plus de sens (c'est le délai de grâce ci-dessus qui régit la suite).
  useEffect(() => {
    if (!round || everyoneAnswered) return
    function tick() {
      if (!round) return
      const remaining = Math.max(0, Math.ceil((new Date(round.endsAt).getTime() - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0 && !validatedRef.current) {
        writerRef.current?.cancelQuiz()
        finishRound(0)
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round?.roundIndex, round?.endsAt, everyoneAnswered])

  function restartCharacter() {
    if (validated || !writerRef.current) return
    firstTryCorrectRef.current = 0
    setStrokeProgress(0)
    writerRef.current.cancelQuiz()
    startQuiz(writerRef.current)
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
  const isLastRound = round.roundIndex + 1 >= roomState.questionCount
  const timerUrgent = timeLeft <= URGENT_THRESHOLD_SECONDS && !validated

  function nextRound() {
    if (!code) return
    advanceRound(code, getSessionToken()).catch(() => {})
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.progressText}>
          Kanji <strong>{round.roundIndex + 1}</strong> / {roomState.questionCount}
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
          <div className={styles.statLabel}>SCORE MOYEN</div>
          <div className={styles.statValue}>{averageScore}%</div>
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
              <span className={styles.playerChipStatus}>{hasAnswered ? '✓ a tracé' : 'trace...'}</span>
            </div>
          )
        })}
      </div>

      <div className={styles.body}>
        <div>
          <div className={styles.sectionLabel}>INDICES</div>
          <div className={styles.hintsCard}>
            <div className={styles.hintLabel}>Lecture on'yomi</div>
            <div className={styles.hintValue}>{round.kanji.onyomi}</div>
            <div className={styles.hintLabel}>Lecture kun'yomi</div>
            <div className={styles.hintValue}>{round.kanji.kunyomi}</div>
            <div className={styles.hintLabel}>Signification</div>
            <div className={styles.hintValueLast}>{meanings[round.kanji.character] ?? '…'}</div>
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

          {validated && !everyoneAnswered && (
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
