import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './Button'
import { GuestNameModal } from './GuestNameModal'
import { useAuth } from '../contexts/AuthContext'
import { getSessionToken } from '../lib/session'
import { getGuestName, setGuestName } from '../lib/guest'
import { createRoom, type GameMode } from '../lib/rooms'

interface PlayButtonProps {
  variant?: 'primary' | 'accent' | 'outline'
  className?: string
  children: ReactNode
  gameMode?: GameMode
}

// Bouton "Jouer maintenant" partagé (Accueil, TopNav, page Mini-jeux) : crée un nouveau salon
// avec des paramètres par défaut et redirige vers son Lobby. Demande un nom d'invité une seule
// fois si l'utilisateur n'a pas de compte, puis le mémorise pour les prochaines parties.
export function PlayButton({ variant = 'accent', className, children, gameMode = 'QUIZ' }: PlayButtonProps) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function startGame(guestName?: string) {
    setPending(true)
    setError('')
    try {
      const { code } = await createRoom({
        gameMode,
        levels: ['N5', 'N4'],
        questionCount: 20,
        timePerQuestion: 30,
        guestName,
        sessionToken: getSessionToken(),
      })
      navigate(`/lobby/${code}`)
    } catch {
      setError('Impossible de créer un salon pour le moment.')
    } finally {
      setPending(false)
    }
  }

  function handleClick() {
    if (profile) {
      void startGame()
      return
    }
    const storedName = getGuestName()
    if (storedName) {
      void startGame(storedName)
      return
    }
    setShowModal(true)
  }

  function handleModalSubmit(name: string) {
    setGuestName(name)
    setShowModal(false)
    void startGame(name)
  }

  return (
    <>
      <Button variant={variant} className={className} onClick={handleClick} disabled={pending}>
        {pending ? 'Création du salon…' : children}
      </Button>
      {error && <span role="alert">{error}</span>}
      {showModal && <GuestNameModal onSubmit={handleModalSubmit} onCancel={() => setShowModal(false)} />}
    </>
  )
}
