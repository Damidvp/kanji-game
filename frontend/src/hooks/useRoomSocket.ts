import { useEffect, useRef, useState, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { API_BASE_URL } from '../lib/api'
import type { RoomState } from '../lib/rooms'

export interface RoundPayload {
  roundIndex: number
  kanji: { character: string; onyomi: string; kunyomi: string; strokeCount: number }
  options: string[] | null
  endsAt: string
}

export interface RoundStatusPayload {
  roundIndex: number
  answeredParticipantIds: number[]
  totalActiveParticipants: number
}

export interface ResultsPayload {
  ranking: {
    participantId: number
    name: string
    rank: number
    totalPoints: number
    avgStrokeScore: number | null
  }[]
}

export interface AnswerResultPayload {
  roundIndex: number
  correct: boolean
  points: number
}

interface RoomSocketHandlers {
  onRoomState?: (state: RoomState) => void
  onRound?: (round: RoundPayload) => void
  onRoundStatus?: (status: RoundStatusPayload) => void
  onResults?: (results: ResultsPayload) => void
  onAnswerResult?: (result: AnswerResultPayload) => void
}

// Client STOMP/SockJS partagé, réutilisé par tous les écrans qui suivent un salon en direct
// (Lobby, Quiz, Écriture, Résultats). Une connexion par montage d'écran, sur /ws.
// `myParticipantId`, une fois connu (après le join), abonne en plus au canal de feedback
// privé du Quiz (/answer-result/{participantId}), pas disponible au moment de la connexion.
export function useRoomSocket(code: string, myParticipantId: number | null, handlers: RoomSocketHandlers) {
  const clientRef = useRef<Client | null>(null)
  const [connected, setConnected] = useState(false)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`) as unknown as WebSocket,
      reconnectDelay: 3000,
    })

    client.onConnect = () => {
      setConnected(true)
      client.subscribe(`/topic/room/${code}`, (message) => {
        handlersRef.current.onRoomState?.(JSON.parse(message.body) as RoomState)
      })
      client.subscribe(`/topic/room/${code}/round`, (message) => {
        handlersRef.current.onRound?.(JSON.parse(message.body) as RoundPayload)
      })
      client.subscribe(`/topic/room/${code}/round-status`, (message) => {
        handlersRef.current.onRoundStatus?.(JSON.parse(message.body) as RoundStatusPayload)
      })
      client.subscribe(`/topic/room/${code}/results`, (message) => {
        handlersRef.current.onResults?.(JSON.parse(message.body) as ResultsPayload)
      })
    }
    client.onWebSocketClose = () => setConnected(false)

    client.activate()
    clientRef.current = client

    return () => {
      client.deactivate()
      clientRef.current = null
    }
  }, [code])

  useEffect(() => {
    if (!connected || myParticipantId == null) return
    const client = clientRef.current
    if (!client) return
    const subscription = client.subscribe(
      `/topic/room/${code}/answer-result/${myParticipantId}`,
      (message) => {
        handlersRef.current.onAnswerResult?.(JSON.parse(message.body) as AnswerResultPayload)
      },
    )
    return () => subscription.unsubscribe()
  }, [connected, myParticipantId, code])

  const sendAnswer = useCallback(
    (
      sessionToken: string,
      answer: { selectedOption: string } | { strokeScore: number; strokeMistakes: number },
    ) => {
      clientRef.current?.publish({
        destination: `/app/room/${code}/answer`,
        body: JSON.stringify({ sessionToken, ...answer }),
      })
    },
    [code],
  )

  const sendEnterLobby = useCallback(
    (sessionToken: string) => {
      clientRef.current?.publish({
        destination: `/app/room/${code}/enter-lobby`,
        body: JSON.stringify({ sessionToken }),
      })
    },
    [code],
  )

  return { connected, sendAnswer, sendEnterLobby }
}
