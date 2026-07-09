import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { Button } from '../components/Button'
import styles from './AuthScreen.module.css'

type AuthTab = 'login' | 'signup'

interface FormErrors {
  pseudo?: string
  email?: string
  password?: string
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function AuthScreen() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<AuthTab>('login')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginErrors, setLoginErrors] = useState<FormErrors>({})

  const [signupPseudo, setSignupPseudo] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupErrors, setSignupErrors] = useState<FormErrors>({})

  function handleLogin(event: FormEvent) {
    event.preventDefault()
    const errors: FormErrors = {}
    if (!isValidEmail(loginEmail)) errors.email = 'Adresse e-mail invalide.'
    if (!loginPassword) errors.password = 'Mot de passe requis.'
    setLoginErrors(errors)
    if (Object.keys(errors).length === 0) {
      // Pas de backend branché pour l'instant : on simule une connexion réussie.
      navigate('/')
    }
  }

  function handleSignup(event: FormEvent) {
    event.preventDefault()
    const errors: FormErrors = {}
    if (signupPseudo.trim().length < 3) errors.pseudo = 'Au moins 3 caractères.'
    if (!isValidEmail(signupEmail)) errors.email = 'Adresse e-mail invalide.'
    if (signupPassword.length < 6) errors.password = 'Au moins 6 caractères.'
    setSignupErrors(errors)
    if (Object.keys(errors).length === 0) {
      // Pas de backend branché pour l'instant : on simule une création de compte réussie.
      navigate('/')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pitchColumn}>
        <div className={styles.pitchKanjiBg}>友</div>
        <div className={styles.pitchTop}>
          <Logo inverted />
        </div>
        <div className={styles.pitchMiddle}>
          <h2 className={styles.pitchTitle}>
            Garde une trace
            <br />
            de ta progression.
          </h2>
          <p className={styles.pitchText}>
            Un compte gratuit débloque tes statistiques par niveau JLPT, ton historique de parties,
            et la création de salons multijoueur.
          </p>
        </div>
        <div className={styles.pitchFooter}>© Kanji Game — apprentissage des kanji</div>
      </div>

      <div className={styles.formColumn}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={activeTab === 'login' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => setActiveTab('login')}
          >
            Connexion
          </button>
          <button
            type="button"
            className={activeTab === 'signup' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => setActiveTab('signup')}
          >
            Inscription
          </button>
        </div>

        {activeTab === 'login' ? (
          <form className={styles.form} onSubmit={handleLogin} noValidate>
            <label className={styles.label} htmlFor="login-email">
              Adresse e-mail
            </label>
            <input
              id="login-email"
              type="email"
              className={styles.input}
              placeholder="toi@exemple.fr"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
            />
            {loginErrors.email && <div className={styles.error}>{loginErrors.email}</div>}

            <label className={styles.label} htmlFor="login-password">
              Mot de passe
            </label>
            <input
              id="login-password"
              type="password"
              className={styles.input}
              placeholder="••••••••••"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
            {loginErrors.password && <div className={styles.error}>{loginErrors.password}</div>}

            <div className={styles.forgotPassword} title="Fonctionnalité bientôt disponible">
              Mot de passe oublié ?
            </div>

            <Button type="submit" variant="primary" className={styles.submitButton}>
              Se connecter
            </Button>

            <div className={styles.divider}>ou</div>

            <Button type="button" variant="outline" onClick={() => navigate('/')}>
              Continuer sans compte
            </Button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleSignup} noValidate>
            <label className={styles.label} htmlFor="signup-pseudo">
              Pseudo
            </label>
            <input
              id="signup-pseudo"
              type="text"
              className={styles.input}
              placeholder="ton-pseudo"
              value={signupPseudo}
              onChange={(e) => setSignupPseudo(e.target.value)}
            />
            {signupErrors.pseudo && <div className={styles.error}>{signupErrors.pseudo}</div>}

            <label className={styles.label} htmlFor="signup-email">
              Adresse e-mail
            </label>
            <input
              id="signup-email"
              type="email"
              className={styles.input}
              placeholder="toi@exemple.fr"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
            />
            {signupErrors.email && <div className={styles.error}>{signupErrors.email}</div>}

            <label className={styles.label} htmlFor="signup-password">
              Mot de passe
            </label>
            <input
              id="signup-password"
              type="password"
              className={styles.input}
              placeholder="••••••••••"
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
            />
            {signupErrors.password && <div className={styles.error}>{signupErrors.password}</div>}

            <Button type="submit" variant="primary" className={styles.submitButton}>
              Créer mon compte
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
