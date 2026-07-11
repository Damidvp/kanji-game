import type { JlptLevelId } from './jlptLevels'

export interface LobbyPlayer {
  id: string
  name: string
  initials: string
  color: string
  isHost: boolean
  ready: boolean
  isYou?: boolean
  objectiveLevel: JlptLevelId
}

// 5 joueurs présents sur 8 places ; le reste des slots sont vides ("En attente...").
export const mockLobbyPlayers: LobbyPlayer[] = [
  { id: 'yuki', name: 'Yuki', initials: 'YU', color: 'var(--color-n1)', isHost: true, ready: true, isYou: true, objectiveLevel: 'N3' },
  { id: 'hana', name: 'Hana', initials: 'HA', color: 'var(--color-n4)', isHost: false, ready: true, objectiveLevel: 'N4' },
  { id: 'lucas', name: 'Lucas', initials: 'LU', color: 'var(--color-n2)', isHost: false, ready: false, objectiveLevel: 'N2' },
  { id: 'emma', name: 'Emma', initials: 'EM', color: 'var(--color-n5)', isHost: false, ready: true, objectiveLevel: 'N5' },
  { id: 'theo', name: 'Théo', initials: 'TH', color: 'var(--color-n3)', isHost: false, ready: false, objectiveLevel: 'N1' },
]

export const LOBBY_MAX_PLAYERS = 8
export const MOCK_LOBBY_CODE = 'AB3F9K'
