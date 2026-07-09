import type { JlptLevelId } from './jlptLevels'

export interface MockKanji {
  character: string
  onyomi: string
  kunyomi: string
  meaningFr: string
  jlptLevel: JlptLevelId
  distractors: string[]
}

// Données factices en attendant l'import du référentiel kanjiapi.dev (phase 2).
export const mockKanjiPool: MockKanji[] = [
  { character: '水', onyomi: 'スイ', kunyomi: 'みず', meaningFr: 'eau', jlptLevel: 'N5', distractors: ['feu', 'montagne', 'arbre'] },
  { character: '火', onyomi: 'カ', kunyomi: 'ひ', meaningFr: 'feu', jlptLevel: 'N5', distractors: ['eau', 'montagne', 'rivière'] },
  { character: '山', onyomi: 'サン', kunyomi: 'やま', meaningFr: 'montagne', jlptLevel: 'N5', distractors: ['ciel', 'arbre', 'vent'] },
  { character: '川', onyomi: 'セン', kunyomi: 'かわ', meaningFr: 'rivière', jlptLevel: 'N5', distractors: ['lune', 'soleil', 'porte'] },
  { character: '木', onyomi: 'ボク', kunyomi: 'き', meaningFr: 'arbre', jlptLevel: 'N5', distractors: ['eau', 'feu', 'terre'] },
  { character: '学', onyomi: 'ガク', kunyomi: 'まな.ぶ', meaningFr: 'étudier, apprendre', jlptLevel: 'N5', distractors: ['jouer', 'dormir', 'manger'] },
]
