import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getSessionToken } from '../lib/session'
import { getGuestName } from '../lib/guest'
import { joinRoom, type RoomState } from '../lib/rooms'

// Rejoint (ou reconnecte, de façon idempotente) le salon `code` au montage, en gérant le cas
// où un invité n'a pas encore de nom mémorisé. Partagé par Lobby/Quiz/Écriture/Résultats :
// chacun de ces écrans peut être atteint directement (rafraîchissement de page) et doit donc
// pouvoir se reconnecter seul, pas seulement recevoir l'état via la navigation depuis le Lobby.
export function useRoomConnection(code: string | undefined) {
  const { profile, loading: authLoading } = useAuth()
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [myParticipantId, setMyParticipantId] = useState<number | null>(null)
  const [needsGuestName, setNeedsGuestName] = useState(false)
  const [error, setError] = useState('')

  const applyState = useCallback((state: RoomState) => {
    setRoomState(state)
    const mine = state.participants.find((p) => p.isYou)
    if (mine) setMyParticipantId(mine.id)
  }, [])

  useEffect(() => {
    if (!code || authLoading) return
    const sessionToken = getSessionToken()
    const guestName = profile ? undefined : (getGuestName() ?? undefined)
    if (!profile && !guestName) {
      setNeedsGuestName(true)
      return
    }
    let cancelled = false
    joinRoom(code, sessionToken, guestName)
      .then((state) => {
        if (!cancelled) applyState(state)
      })
      .catch(() => {
        if (!cancelled) setError('Ce salon est introuvable ou la partie a déjà commencé.')
      })
    return () => {
      cancelled = true
    }
  }, [code, profile, authLoading, applyState])

  return { roomState, myParticipantId, needsGuestName, setNeedsGuestName, error, applyState }
}
