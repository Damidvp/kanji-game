import { Link } from 'react-router-dom'
import styles from './Logo.module.css'

export function Logo() {
  return (
    <Link to="/" className={styles.logo}>
      <span className={styles.kanji}>漢字</span>
      <span className={styles.wordmark}>KANJI GAME</span>
    </Link>
  )
}
