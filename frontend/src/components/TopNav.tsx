import { Link } from 'react-router-dom'
import { Logo } from './Logo'
import { Button } from './Button'
import styles from './TopNav.module.css'

export function TopNav() {
  return (
    <nav className={styles.nav}>
      <Logo />
      <div className={styles.links}>
        <span>Accueil</span>
        <span>Mini-jeux</span>
        <span>Niveaux JLPT</span>
        <span>Classements</span>
      </div>
      <div className={styles.actions}>
        <Link to="/profil" className={styles.loginLink}>
          Profil
        </Link>
        <Link to="/connexion" className={styles.loginLink}>
          Connexion
        </Link>
        <Link to="/lobby/AB3F9K">
          <Button variant="accent">Jouer maintenant</Button>
        </Link>
      </div>
    </nav>
  )
}
