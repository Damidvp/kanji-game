import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getSessionToken } from '../lib/session'
import { ApiError } from '../lib/api'
import { joinRoom, type RoomState } from '../lib/rooms'

// Rejoint (ou reconnecte, de façon idempotente) le salon `code` au montage. Partagé par
// Lobby/Quiz/Écriture/Résultats : chacun de ces écrans peut être atteint directement
// (rafraîchissement de page, navigation interne depuis le Lobby) et doit donc pouvoir se
// reconnecter seul, pas seulement recevoir l'état via la navigation.
//
// Le nom d'invité n'est jamais mémorisé/deviné côté client (Damien veut pouvoir le redéfinir à
// chaque salon) : on tente toujours la jonction sans nom d'abord — le backend reconnecte
// silencieusement un participant déjà enregistré (même session_token) sans avoir besoin d'un
// nom, et ne répond 400 "guestName requis" que pour un tout nouveau participant invité, auquel
// cas on affiche la pop-up et on retente avec le nom saisi.
export function useRoomConnection(code: string | undefined) {
  const { profile, loading: authLoading } = useAuth()
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [myParticipantId, setMyParticipantId] = useState<number | null>(null)
  const [needsGuestName, setNeedsGuestName] = useState(false)
  const [pendingGuestName, setPendingGuestName] = useState<string | undefined>(undefined)
  const [error, setError] = useState('')
  // Incrémenté par submitGuestName/retry pour redéclencher la tentative de connexion — sans lui,
  // l'effet ci-dessous (dont les dépendances ne changent pas juste en sortant de l'état
  // "needsGuestName", ou après une erreur transitoire) ne retentait jamais, laissant l'écran
  // bloqué indéfiniment (bug remonté par Damien : lien direct vers un salon → page vide).
  const [attempt, setAttempt] = useState(0)

  const applyState = useCallback((state: RoomState) => {
    setRoomState(state)
    const mine = state.participants.find((p) => p.isYou)
    if (mine) setMyParticipantId(mine.id)
  }, [])

  useEffect(() => {
    if (!code || authLoading) return
    const sessionToken = getSessionToken()
    const guestName = profile ? undefined : pendingGuestName
    setNeedsGuestName(false)
    setError('')
    // AbortController plutôt qu'un simple flag "cancelled" : en StrictMode (dev), cet effet est
    // monté deux fois de suite au premier chargement, ce qui envoyait deux vraies requêtes
    // /join concurrentes pour le même sessionToken — la première du lot pouvait échouer selon
    // l'ordre d'arrivée côté serveur, affichant "salon introuvable" jusqu'à un Réessayer manuel.
    // Ici, la requête du montage fantôme est réellement annulée, une seule requête aboutit.
    const controller = new AbortController()
    joinRoom(code, sessionToken, guestName, { signal: controller.signal })
      .then((state) => applyState(state))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (!profile && err instanceof ApiError && err.status === 400) {
          setNeedsGuestName(true) // nouveau participant invité : un nom est requis
          return
        }
        setError('Ce salon est introuvable ou la partie a déjà commencé.')
      })
    return () => controller.abort()
  }, [code, profile, authLoading, applyState, attempt, pendingGuestName])

  function submitGuestName(name: string) {
    setPendingGuestName(name)
    setAttempt((n) => n + 1)
  }

  function retry() {
    setAttempt((n) => n + 1)
  }

  return { roomState, myParticipantId, needsGuestName, submitGuestName, error, retry, applyState }
}
