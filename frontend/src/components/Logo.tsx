import { Link } from 'react-router-dom'
import styles from './Logo.module.css'

interface LogoProps {
  inverted?: boolean
}

export function Logo({ inverted = false }: LogoProps) {
  return (
    <Link to="/" className={inverted ? `${styles.logo} ${styles.inverted}` : styles.logo}>
      <span className={styles.kanji}>漢字</span>
      <span className={styles.wordmark}>KANJI GAME</span>
    </Link>
  )
}
