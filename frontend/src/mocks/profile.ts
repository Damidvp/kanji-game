import type { JlptLevelId } from './jlptLevels'

export interface ProfileLevelStat {
  level: JlptLevelId
  averageScore: number
}

// Statistiques factices (pas de compte/backend réel pour l'instant).
export const mockProfileStats = {
  memberSince: 'mars 2026',
  gamesPlayed: 12,
  averageScore: 78,
  perLevel: [
    { level: 'N5', averageScore: 92 },
    { level: 'N4', averageScore: 81 },
    { level: 'N3', averageScore: 64 },
    { level: 'N2', averageScore: 40 },
    { level: 'N1', averageScore: 0 },
  ] as ProfileLevelStat[],
}
