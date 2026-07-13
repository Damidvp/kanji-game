import { api } from './api'
import type { JlptLevelId } from '../mocks/jlptLevels'

export type GameMode = 'QUIZ' | 'ECRITURE'
export type ParticipantStatus = 'IN_LOBBY' | 'VIEWING_RESULTS' | 'PLAYING' | 'LEFT' | 'KICKED'
export type RoomStatus = 'LOBBY' | 'IN_PROGRESS' | 'RESULTS' | 'CLOSED'

export interface RoomParticipant {
  id: number
  name: string
  initials: string
  color: string
  isHost: boolean
  ready: boolean
  status: ParticipantStatus
  objectiveLevel: JlptLevelId | null
  isYou: boolean
}

export interface RoomState {
  code: string
  slug: string
  gameMode: GameMode
  levels: JlptLevelId[]
  questionCount: number
  timePerQuestionSeconds: number
  status: RoomStatus
  currentRoundIndex: number
  participants: RoomParticipant[]
}

export interface CreateRoomOptions {
  gameMode: GameMode
  levels: JlptLevelId[]
  questionCount: number
  timePerQuestion: number
  guestName?: string
  sessionToken: string
}

export function createRoom(options: CreateRoomOptions): Promise<{ code: string; slug: string }> {
  return api.post('/api/rooms', options)
}

export function getRoom(code: string, sessionToken: string): Promise<RoomState> {
  return api.get(`/api/rooms/${code}?sessionToken=${encodeURIComponent(sessionToken)}`)
}

export function joinRoom(code: string, sessionToken: string, guestName?: string): Promise<RoomState> {
  return api.post(`/api/rooms/${code}/join`, { sessionToken, guestName })
}

export function setReady(code: string, sessionToken: string, ready: boolean): Promise<RoomState> {
  return api.post(`/api/rooms/${code}/ready`, { sessionToken, ready })
}

export function leaveRoom(code: string, sessionToken: string): Promise<RoomState> {
  return api.post(`/api/rooms/${code}/leave`, { sessionToken })
}

export function kickParticipant(code: string, sessionToken: string, targetParticipantId: number): Promise<RoomState> {
  return api.post(`/api/rooms/${code}/kick`, { sessionToken, targetParticipantId })
}

export function startGame(code: string, sessionToken: string): Promise<RoomState> {
  return api.post(`/api/rooms/${code}/start`, { sessionToken })
}

export function replayGame(code: string, sessionToken: string): Promise<RoomState> {
  return api.post(`/api/rooms/${code}/replay`, { sessionToken })
}

// Hôte uniquement : passe à la manche suivante sans attendre le délai de grâce/timeout.
// Pas de RoomState en retour : l'effet arrive via /topic/room/{code}/round.
export function advanceRound(code: string, sessionToken: string): Promise<void> {
  return api.post(`/api/rooms/${code}/next-round`, { sessionToken })
}

export interface UpdateRoomSettings {
  gameMode: GameMode
  levels: JlptLevelId[]
  questionCount: number
  timePerQuestion: number
  sessionToken: string
}

export function updateRoomSettings(code: string, settings: UpdateRoomSettings): Promise<RoomState> {
  return api.patch(`/api/rooms/${code}/settings`, settings)
}
