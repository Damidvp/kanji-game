import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { Button } from '../components/Button'
import { resetPassword } from '../lib/auth'
import styles from './AuthScreen.module.css'

export function ResetPasswordScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (newPassword.length < 8) {
      setError('Au moins 8 caractères.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setError('')
    setPending(true)
    try {
      await resetPassword(token, newPassword)
      setDone(true)
    } catch {
      setError('Ce lien est invalide ou a expiré. Demande un nouveau lien de réinitialisation.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pitchColumn}>
        <div className={styles.pitchKanjiBg}>鍵</div>
        <div className={styles.pitchTop}>
          <Logo inverted />
        </div>
        <div className={styles.pitchMiddle}>
          <h2 className={styles.pitchTitle}>
            Choisis un nouveau
            <br />
            mot de passe.
          </h2>
        </div>
        <div className={styles.pitchFooter}>© Kanji Game — apprentissage des kanji</div>
      </div>

      <div className={styles.formColumn}>
        {!token ? (
          <div className={styles.form}>
            <p>Ce lien de réinitialisation est incomplet ou invalide.</p>
            <Button type="button" variant="outline" onClick={() => navigate('/mot-de-passe-oublie')}>
              Demander un nouveau lien
            </Button>
          </div>
        ) : done ? (
          <div className={styles.form}>
            <p>Ton mot de passe a été mis à jour. Tu peux te connecter avec ton nouveau mot de passe.</p>
            <Button type="button" variant="primary" onClick={() => navigate('/connexion')}>
              Se connecter
            </Button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <label className={styles.label} htmlFor="reset-new-password">
              Nouveau mot de passe
            </label>
            <input
              id="reset-new-password"
              type="password"
              className={styles.input}
              placeholder="••••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <label className={styles.label} htmlFor="reset-confirm-password">
              Confirmer le nouveau mot de passe
            </label>
            <input
              id="reset-confirm-password"
              type="password"
              className={styles.input}
              placeholder="••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {error && <div className={styles.error}>{error}</div>}

            <Button type="submit" variant="primary" className={styles.submitButton} disabled={pending}>
              {pending ? 'Enregistrement…' : 'Réinitialiser le mot de passe'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
