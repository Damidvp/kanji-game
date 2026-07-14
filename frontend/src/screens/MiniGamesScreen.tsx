import { TopNav } from '../components/TopNav'
import { PlayButton } from '../components/PlayButton'
import styles from './MiniGamesScreen.module.css'

const games = [
  {
    mode: 'QUIZ' as const,
    kanji: '問',
    title: 'Quiz Kanji',
    description:
      'Choisis la bonne signification parmi 4 propositions, avant la fin du chrono. Plus tu réponds vite, plus tu marques de points — jusqu’à 1000 par question.',
    cta: 'Essayer',
  },
  {
    mode: 'ECRITURE' as const,
    kanji: '書',
    title: 'Écriture de kanji',
    description:
      'Trace chaque kanji au bon endroit, dans le bon ordre de traits, avec une vraie reconnaissance de tracé. Ton score dépend de la précision de ton premier essai.',
    cta: 'Essayer',
  },
]

export function MiniGamesScreen() {
  return (
    <div>
      <TopNav />
      <div className={styles.page}>
        <h1 className={styles.title}>Mini-jeux</h1>
        <p className={styles.subtitle}>
          Deux façons de progresser sur les kanji, seul ou entre amis. Choisis un mode pour lancer un
          salon.
        </p>

        <div className={styles.grid}>
          {games.map((game) => (
            <div key={game.mode} className={styles.card}>
              <div className={styles.cardKanji}>{game.kanji}</div>
              <div className={styles.cardTitle}>{game.title}</div>
              <p className={styles.cardText}>{game.description}</p>
              <PlayButton variant="primary" gameMode={game.mode}>
                {game.cta}
              </PlayButton>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
