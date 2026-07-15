import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from './Logo'
import { PlayButton } from './PlayButton'
import { useAuth } from '../contexts/AuthContext'
import styles from './TopNav.module.css'

export function TopNav() {
  const navigate = useNavigate()
  const { profile, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
  }

  function handleLogout() {
    closeMenu()
    logout()
    navigate('/')
  }

  const initials = profile?.pseudo.trim().slice(0, 2).toUpperCase()

  return (
    <nav className={styles.nav}>
      <Logo />

      <div className={styles.links}>
        <Link to="/">Accueil</Link>
        <Link to="/mini-jeux">Mini-jeux</Link>
        <Link to="/niveaux-jlpt">Niveaux JLPT</Link>
      </div>

      <div className={styles.actions}>
        {profile ? (
          <>
            <Link to="/profil" className={styles.userBadge}>
              <span className={styles.userBadgeAvatar}>{initials}</span>
              <span>
                Bonjour, <strong>{profile.pseudo}</strong>
              </span>
            </Link>
            <button type="button" className={styles.logoutLink} onClick={handleLogout}>
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

      <button
        type="button"
        className={menuOpen ? `${styles.menuToggle} ${styles.menuToggleOpen}` : styles.menuToggle}
        aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          <Link to="/" onClick={closeMenu}>
            Accueil
          </Link>
          <Link to="/mini-jeux" onClick={closeMenu}>
            Mini-jeux
          </Link>
          <Link to="/niveaux-jlpt" onClick={closeMenu}>
            Niveaux JLPT
          </Link>
          {profile ? (
            <>
              <Link to="/profil" className={styles.userBadge} onClick={closeMenu}>
                <span className={styles.userBadgeAvatar}>{initials}</span>
                <span>
                  Bonjour, <strong>{profile.pseudo}</strong>
                </span>
              </Link>
              <button type="button" className={styles.mobileTextButton} onClick={handleLogout}>
                Déconnexion
              </button>
            </>
          ) : (
            <Link to="/connexion" onClick={closeMenu}>
              Connexion
            </Link>
          )}
          <PlayButton variant="accent" className={styles.mobilePlayButton}>
            Jouer maintenant
          </PlayButton>
        </div>
      )}
    </nav>
  )
}
