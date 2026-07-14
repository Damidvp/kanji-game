export type JlptLevelId = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

export interface JlptLevelInfo {
  id: JlptLevelId
  color: string
  kanjiCount: number
  label: string
  /** Correspondance CECRL usuelle (indicative — le JLPT n'a pas de table de correspondance officielle). */
  cecrl: string
  description: string
}

// Comptages recoupés avec la base réelle (GET /api/kanji?levels=..., 2140 kanji jōyō importés
// au total) le 2026-07-13 — les anciens chiffres ne correspondaient plus aux données en base.
export const jlptLevels: JlptLevelInfo[] = [
  {
    id: 'N5',
    color: 'var(--color-n5)',
    kanjiCount: 79,
    label: 'débutant',
    cecrl: 'A1',
    description: 'Comprendre et utiliser des expressions familières et quotidiennes très simples.',
  },
  {
    id: 'N4',
    color: 'var(--color-n4)',
    kanjiCount: 166,
    label: 'élémentaire',
    cecrl: 'A2',
    description: 'Comprendre des phrases simples sur des sujets familiers de la vie courante.',
  },
  {
    id: 'N3',
    color: 'var(--color-n3)',
    kanjiCount: 367,
    label: 'intermédiaire',
    cecrl: 'B1',
    description: 'Se débrouiller dans la plupart des situations rencontrées en voyage ou au quotidien.',
  },
  {
    id: 'N2',
    color: 'var(--color-n2)',
    kanjiCount: 367,
    label: 'avancé',
    cecrl: 'B2',
    description: 'Comprendre la presse, des conversations naturelles et des textes plus abstraits.',
  },
  {
    id: 'N1',
    color: 'var(--color-n1)',
    kanjiCount: 1161,
    label: 'expert',
    cecrl: 'C1',
    description: 'Comprendre un large éventail de textes longs et exigeants, avec une aisance quasi native.',
  },
]
