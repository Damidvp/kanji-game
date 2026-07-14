import { Routes, Route } from 'react-router-dom'
import { HomeScreen } from './screens/HomeScreen'
import { AuthScreen } from './screens/AuthScreen'
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen'
import { ResetPasswordScreen } from './screens/ResetPasswordScreen'
import { MiniGamesScreen } from './screens/MiniGamesScreen'
import { JlptLevelsScreen } from './screens/JlptLevelsScreen'
import { LobbyScreen } from './screens/LobbyScreen'
import { QuizScreen } from './screens/QuizScreen'
import { WritingScreen } from './screens/WritingScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import { ProfileScreen } from './screens/ProfileScreen'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/connexion" element={<AuthScreen />} />
      <Route path="/mot-de-passe-oublie" element={<ForgotPasswordScreen />} />
      <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordScreen />} />
      <Route path="/mini-jeux" element={<MiniGamesScreen />} />
      <Route path="/niveaux-jlpt" element={<JlptLevelsScreen />} />
      <Route path="/profil" element={<ProfileScreen />} />
      <Route path="/lobby/:code" element={<LobbyScreen />} />
      <Route path="/lobby/:code/quiz" element={<QuizScreen />} />
      <Route path="/lobby/:code/ecriture" element={<WritingScreen />} />
      <Route path="/lobby/:code/resultats" element={<ResultsScreen />} />
    </Routes>
  )
}

export default App
