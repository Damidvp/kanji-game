export type JlptLevelId = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

export interface JlptLevelInfo {
  id: JlptLevelId
  color: string
  kanjiCount: number
  label: string
}

// Comptages recoupés avec la base réelle (GET /api/kanji?levels=..., 2140 kanji jōyō importés
// au total) le 2026-07-13 — les anciens chiffres ne correspondaient plus aux données en base.
export const jlptLevels: JlptLevelInfo[] = [
  { id: 'N5', color: 'var(--color-n5)', kanjiCount: 79, label: 'débutant' },
  { id: 'N4', color: 'var(--color-n4)', kanjiCount: 166, label: 'élémentaire' },
  { id: 'N3', color: 'var(--color-n3)', kanjiCount: 367, label: 'intermédiaire' },
  { id: 'N2', color: 'var(--color-n2)', kanjiCount: 367, label: 'avancé' },
  { id: 'N1', color: 'var(--color-n1)', kanjiCount: 1161, label: 'expert' },
]
