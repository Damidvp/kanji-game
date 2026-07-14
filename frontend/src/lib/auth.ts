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

export interface ProfileLevelStat {
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  averageScore: number
}

export interface Profile {
  pseudo: string
  email: string
  objectiveLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | null
  memberSince: string
  gamesPlayed: number
  averageScore: number
  perLevel: ProfileLevelStat[]
}

export function getProfile(): Promise<Profile> {
  return api.get<Profile>('/api/profile/me')
}

export function updateObjectiveLevel(objectiveLevel: NonNullable<Profile['objectiveLevel']>): Promise<Profile> {
  return api.put<Profile>('/api/profile/objective-level', { objectiveLevel })
}

export interface UpdateProfileInput {
  pseudo: string
  email: string
  currentPassword: string
  newPassword?: string
}

interface UpdateProfileResponse {
  profile: Profile
  token: string
}

export async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  const { profile, token } = await api.put<UpdateProfileResponse>('/api/profile', input)
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  return profile
}

export function isAuthError(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status
}

export function requestPasswordReset(email: string): Promise<void> {
  return api.post<void>('/api/auth/forgot-password', { email })
}

export function resetPassword(token: string, newPassword: string): Promise<void> {
  return api.post<void>('/api/auth/reset-password', { token, newPassword })
}
