import { Routes, Route } from 'react-router-dom'
import { HomeScreen } from './screens/HomeScreen'
import { AuthScreen } from './screens/AuthScreen'
import { LobbyScreen } from './screens/LobbyScreen'
import { QuizScreen } from './screens/QuizScreen'
import { WritingScreen } from './screens/WritingScreen'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/connexion" element={<AuthScreen />} />
      <Route path="/lobby/:code" element={<LobbyScreen />} />
      <Route path="/lobby/:code/quiz" element={<QuizScreen />} />
      <Route path="/lobby/:code/ecriture" element={<WritingScreen />} />
    </Routes>
  )
}

export default App
