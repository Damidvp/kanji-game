import { Routes, Route } from 'react-router-dom'
import { HomeScreen } from './screens/HomeScreen'
import { AuthScreen } from './screens/AuthScreen'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/connexion" element={<AuthScreen />} />
    </Routes>
  )
}

export default App
