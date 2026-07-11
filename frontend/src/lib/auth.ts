import { api, ApiError } from './api'

const AUTH_TOKEN_KEY = 'kanji-game:authToken'

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return getAuthToken() !== null
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

interface TokenResponse {
  token: string
}

export async function signup(pseudo: string, email: string, password: string): Promise<void> {
  const { token } = await api.post<TokenResponse>('/api/auth/signup', { pseudo, email, password })
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export async function login(email: string, password: string): Promise<void> {
  const { token } = await api.post<TokenResponse>('/api/auth/login', { email, password })
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export interface Profile {
  pseudo: string
  email: string
  objectiveLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | null
}

export function getProfile(): Promise<Profile> {
  return api.get<Profile>('/api/profile/me')
}

export function isAuthError(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status
}
