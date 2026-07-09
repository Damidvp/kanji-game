import { Routes, Route } from 'react-router-dom'
import { HomeScreen } from './screens/HomeScreen'
import { AuthScreen } from './screens/AuthScreen'
import { LobbyScreen } from './screens/LobbyScreen'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/connexion" element={<AuthScreen />} />
      <Route path="/lobby/:code" element={<LobbyScreen />} />
    </Routes>
  )
}

export default App
