// Identifiant anonyme persistant, envoyé à chaque requête/message lié à un salon de jeu.
// Permet au backend de reconnaître un participant (avec ou sans compte) après un refresh de page.
const SESSION_TOKEN_KEY = 'kanji-game:sessionToken'

export function getSessionToken(): string {
  let token = localStorage.getItem(SESSION_TOKEN_KEY)
  if (!token) {
    token = crypto.randomUUID()
    localStorage.setItem(SESSION_TOKEN_KEY, token)
  }
  return token
}
