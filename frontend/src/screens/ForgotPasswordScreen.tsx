import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { Button } from '../components/Button'
import { requestPasswordReset } from '../lib/auth'
import styles from './AuthScreen.module.css'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function ForgotPasswordScreen() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!isValidEmail(email)) {
      setError('Adresse e-mail invalide.')
      return
    }
    setError('')
    setPending(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch {
      setError('Impossible d’envoyer le lien pour le moment. Réessaie dans un instant.')
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
            Mot de passe
            <br />
            oublié ?
          </h2>
          <p className={styles.pitchText}>
            Indique ton adresse e-mail, on t’envoie un lien pour en choisir un nouveau.
          </p>
        </div>
        <div className={styles.pitchFooter}>© Kanji Game — apprentissage des kanji</div>
      </div>

      <div className={styles.formColumn}>
        {sent ? (
          <div className={styles.form}>
            <p>
              Si un compte existe avec l’adresse <strong>{email}</strong>, un e-mail contenant un
              lien de réinitialisation vient d’être envoyé. Le lien est valable 1 heure.
            </p>
            <Button type="button" variant="outline" onClick={() => navigate('/connexion')}>
              Retour à la connexion
            </Button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <label className={styles.label} htmlFor="forgot-email">
              Adresse e-mail
            </label>
            <input
              id="forgot-email"
              type="email"
              className={styles.input}
              placeholder="toi@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <div className={styles.error}>{error}</div>}

            <Button type="submit" variant="primary" className={styles.submitButton} disabled={pending}>
              {pending ? 'Envoi…' : 'Envoyer le lien'}
            </Button>

            <Link to="/connexion" className={styles.backLink}>
              Retour à la connexion
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
