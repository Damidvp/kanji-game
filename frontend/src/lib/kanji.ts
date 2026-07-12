import { api } from './api'
import type { JlptLevelId } from '../mocks/jlptLevels'

export interface ApiKanji {
  character: string
  onyomi: string
  kunyomi: string
  meaningFr: string
  jlptLevel: JlptLevelId
}

export function getKanjiPool(levels: JlptLevelId[]): Promise<ApiKanji[]> {
  return api.get(`/api/kanji?levels=${levels.join(',')}`)
}
