import type { JlptLevelId } from '../mocks/jlptLevels'

// Persistance locale simple (pas de backend/compte réel pour l'instant) : l'objectif JLPT
// choisi sur le profil est réutilisé ailleurs dans l'app (ex. lobby) via localStorage.
const OBJECTIVE_LEVEL_KEY = 'kanji-game:objectiveLevel'
const DEFAULT_OBJECTIVE_LEVEL: JlptLevelId = 'N3'

export function getObjectiveLevel(): JlptLevelId {
  const stored = localStorage.getItem(OBJECTIVE_LEVEL_KEY)
  if (stored === 'N5' || stored === 'N4' || stored === 'N3' || stored === 'N2' || stored === 'N1') {
    return stored
  }
  return DEFAULT_OBJECTIVE_LEVEL
}

export function setObjectiveLevel(level: JlptLevelId): void {
  localStorage.setItem(OBJECTIVE_LEVEL_KEY, level)
}
