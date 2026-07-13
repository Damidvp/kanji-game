import { getAuthToken } from './auth'

const API_BASE_OVERRIDE_KEY = 'kanji-game:apiBaseUrl'

// Permet de tester le site déployé (GitHub Pages) contre un backend qui tourne en local sur un
// autre appareil du même réseau (ex. téléphone + PC sur le même Wi-Fi) — le build statique ne
// peut pas savoir à l'avance quelle IP LAN utiliser. Ouvrir une fois
// https://damidvp.github.io/kanji-game/?api=http://<IP-LAN-du-PC>:8080 (voir ipconfig côté PC,
// et autoriser le port 8080 dans le pare-feu Windows) ; mémorisé ensuite en localStorage.
const queryOverride = new URLSearchParams(window.location.search).get('api')
if (queryOverride) {
  localStorage.setItem(API_BASE_OVERRIDE_KEY, queryOverride)
}

export const API_BASE_URL =
  localStorage.getItem(API_BASE_OVERRIDE_KEY) || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  const token = getAuthToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })

  if (!response.ok) {
    throw new ApiError(response.status, `${options.method ?? 'GET'} ${path} a échoué (${response.status})`)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

export const api = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, options),
  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
}
