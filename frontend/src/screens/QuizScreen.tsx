import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { buildQuizQuestions } from '../mocks/kanji'
import type { JlptLevelId } from '../mocks/jlptLevels'
import styles from './QuizScreen.module.css'

interface QuizLocationState {
  levels?: JlptLevelId[]
  questionCount?: number
  timePerQuestion?: number
}

const DEFAULT_LEVELS: JlptLevelId[] = ['N5', 'N4']
const DEFAULT_QUESTION_COUNT = 10
const DEFAULT_TIME_PER_QUESTION = 30

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
  const [timeLeft, setTimeLeft] = useState(timePerQuestion)

  const current = questions[index]
  const answered = selected !== null || timedOut
  const isLastQuestion = index === questions.length - 1
  const finished = index >= questions.length

  // Le temps ne se réinitialise que sur une nouvelle question, pas quand `answered` change.
  useEffect(() => {
    setTimeLeft(timePerQuestion)
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

  function selectAnswer(option: string) {
    if (answered) return
    setSelected(option)
    if (option === current.correctAnswer) setScore((s) => s + 1)
  }

  function nextQuestion() {
    setIndex((i) => i + 1)
    setSelected(null)
    setTimedOut(false)
  }

  function restart() {
    setQuestions(buildQuizQuestions(levels, questionCount))
    setIndex(0)
    setSelected(null)
    setTimedOut(false)
    setScore(0)
  }

  if (finished) {
    const percent = Math.round((score / questions.length) * 100)
    return (
      <div className={styles.page}>
        <div className={styles.endCard}>
          <div className={styles.eyebrow}>QUIZ TERMINÉ</div>
          <h1 className={styles.endTitle}>
            Score : {score} / {questions.length}
          </h1>
          <p className={styles.endSubtitle}>{percent}% de bonnes réponses</p>
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
        <div className={styles.meta}>
          <span className={styles.timer}>⏱ {timeLeft}s</span>
          <span>
            Score : <strong>{score}</strong>
          </span>
        </div>
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

          {answered && (
            <div className={styles.nextRow}>
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
