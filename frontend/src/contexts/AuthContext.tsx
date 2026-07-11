import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  clearAuthToken,
  getAuthToken,
  getProfile,
  login as loginRequest,
  signup as signupRequest,
  type Profile,
} from '../lib/auth'

interface AuthContextValue {
  profile: Profile | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (pseudo: string, email: string, password: string) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function refreshProfile() {
    if (!getAuthToken()) {
      setProfile(null)
      return
    }
    try {
      setProfile(await getProfile())
    } catch {
      // Token invalide/expiré : on retombe en mode invité plutôt que de bloquer l'app.
      clearAuthToken()
      setProfile(null)
    }
  }

  useEffect(() => {
    refreshProfile().finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    await loginRequest(email, password)
    await refreshProfile()
  }

  async function signup(pseudo: string, email: string, password: string) {
    await signupRequest(pseudo, email, password)
    await refreshProfile()
  }

  function logout() {
    clearAuthToken()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ profile, loading, login, signup, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé sous AuthProvider')
  return context
}
