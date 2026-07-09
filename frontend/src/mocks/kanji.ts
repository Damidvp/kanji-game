import type { JlptLevelId } from './jlptLevels'

export interface MockKanji {
  character: string
  onyomi: string
  kunyomi: string
  meaningFr: string
  jlptLevel: JlptLevelId
}

// Données factices en attendant l'import du référentiel kanjiapi.dev (phase 2).
export const mockKanjiPool: MockKanji[] = [
  { character: '水', onyomi: 'スイ', kunyomi: 'みず', meaningFr: 'eau', jlptLevel: 'N5' },
  { character: '火', onyomi: 'カ', kunyomi: 'ひ', meaningFr: 'feu', jlptLevel: 'N5' },
  { character: '山', onyomi: 'サン', kunyomi: 'やま', meaningFr: 'montagne', jlptLevel: 'N5' },
  { character: '川', onyomi: 'セン', kunyomi: 'かわ', meaningFr: 'rivière', jlptLevel: 'N5' },
  { character: '木', onyomi: 'ボク', kunyomi: 'き', meaningFr: 'arbre', jlptLevel: 'N5' },
  { character: '学', onyomi: 'ガク', kunyomi: 'まな.ぶ', meaningFr: 'étudier, apprendre', jlptLevel: 'N5' },
  { character: '日', onyomi: 'ニチ', kunyomi: 'ひ', meaningFr: 'jour, soleil', jlptLevel: 'N5' },
  { character: '月', onyomi: 'ゲツ', kunyomi: 'つき', meaningFr: 'lune, mois', jlptLevel: 'N5' },
  { character: '人', onyomi: 'ジン', kunyomi: 'ひと', meaningFr: 'personne', jlptLevel: 'N5' },
  { character: '女', onyomi: 'ジョ', kunyomi: 'おんな', meaningFr: 'femme', jlptLevel: 'N5' },
  { character: '子', onyomi: 'シ', kunyomi: 'こ', meaningFr: 'enfant', jlptLevel: 'N5' },
  { character: '大', onyomi: 'ダイ', kunyomi: 'おお.きい', meaningFr: 'grand', jlptLevel: 'N5' },
  { character: '小', onyomi: 'ショウ', kunyomi: 'ちい.さい', meaningFr: 'petit', jlptLevel: 'N5' },
  { character: '上', onyomi: 'ジョウ', kunyomi: 'うえ', meaningFr: 'dessus, monter', jlptLevel: 'N5' },
  { character: '下', onyomi: 'カ', kunyomi: 'した', meaningFr: 'dessous, descendre', jlptLevel: 'N5' },
  { character: '会', onyomi: 'カイ', kunyomi: 'あ.う', meaningFr: 'rencontrer, société', jlptLevel: 'N4' },
  { character: '話', onyomi: 'ワ', kunyomi: 'はな.す', meaningFr: 'parler, histoire', jlptLevel: 'N4' },
  { character: '買', onyomi: 'バイ', kunyomi: 'か.う', meaningFr: 'acheter', jlptLevel: 'N4' },
  { character: '教', onyomi: 'キョウ', kunyomi: 'おし.える', meaningFr: 'enseigner', jlptLevel: 'N4' },
]

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export interface QuizQuestion {
  kanji: MockKanji
  options: string[]
  correctAnswer: string
}

// Génère `count` questions à partir des kanji des niveaux sélectionnés, avec 3 distracteurs
// tirés des significations d'autres kanji du même pool (règle métier définie dans les specs).
export function buildQuizQuestions(levels: JlptLevelId[], count: number): QuizQuestion[] {
  let pool = mockKanjiPool.filter((k) => levels.includes(k.jlptLevel))
  if (pool.length < 4) pool = mockKanjiPool // repli si trop peu de kanji mockés pour ce niveau

  const shuffledPool = shuffle(pool)
  const questions: QuizQuestion[] = []
  for (let i = 0; i < count; i++) {
    const kanji = shuffledPool[i % shuffledPool.length]
    const distractors = shuffle(pool.filter((k) => k.character !== kanji.character))
      .slice(0, 3)
      .map((k) => k.meaningFr)
    questions.push({
      kanji,
      options: shuffle([kanji.meaningFr, ...distractors]),
      correctAnswer: kanji.meaningFr,
    })
  }
  return questions
}

// Génère `count` kanji à tracer à partir des niveaux sélectionnés (mini-jeu Écriture).
export function buildWritingRounds(levels: JlptLevelId[], count: number): MockKanji[] {
  let pool = mockKanjiPool.filter((k) => levels.includes(k.jlptLevel))
  if (pool.length === 0) pool = mockKanjiPool

  const shuffledPool = shuffle(pool)
  return Array.from({ length: count }, (_, i) => shuffledPool[i % shuffledPool.length])
}
