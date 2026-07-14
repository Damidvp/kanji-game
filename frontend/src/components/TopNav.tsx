import { Link, useNavigate } from 'react-router-dom'
import { Logo } from './Logo'
import { PlayButton } from './PlayButton'
import { useAuth } from '../contexts/AuthContext'
import styles from './TopNav.module.css'

export function TopNav() {
  const navigate = useNavigate()
  const { profile, logout } = useAuth()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <nav className={styles.nav}>
      <Logo />
      <div className={styles.links}>
        <Link to="/">Accueil</Link>
        <Link to="/mini-jeux">Mini-jeux</Link>
        <Link to="/niveaux-jlpt">Niveaux JLPT</Link>
      </div>
      <div className={styles.actions}>
        <Link to="/profil" className={styles.loginLink}>
          Profil
        </Link>
        {profile ? (
          <>
            <span className={styles.loginLink}>{profile.pseudo}</span>
            <button type="button" className={styles.loginLink} onClick={handleLogout}>
              Déconnexion
            </button>
          </>
        ) : (
          <Link to="/connexion" className={styles.loginLink}>
            Connexion
          </Link>
        )}
        <PlayButton variant="accent">Jouer maintenant</PlayButton>
      </div>
    </nav>
  )
}
