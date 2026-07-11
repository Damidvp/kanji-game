import { useState, type FormEvent } from 'react'
import { Button } from './Button'
import styles from './GuestNameModal.module.css'

interface GuestNameModalProps {
  onSubmit: (name: string) => void
  onCancel: () => void
}

export function GuestNameModal({ onSubmit, onCancel }: GuestNameModalProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('Au moins 2 caractères.')
      return
    }
    onSubmit(trimmed)
  }

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className={styles.title}>Comment veux-tu qu'on t'appelle ?</h2>
        <p className={styles.subtitle}>Ce nom sera visible par les autres joueurs du salon.</p>
        <input
          autoFocus
          className={styles.input}
          placeholder="ton-pseudo"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.actions}>
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" variant="accent">
            Continuer
          </Button>
        </div>
      </form>
    </div>
  )
}
