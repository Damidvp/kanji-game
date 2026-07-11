const GUEST_NAME_KEY = 'kanji-game:guestName'

export function getGuestName(): string | null {
  return localStorage.getItem(GUEST_NAME_KEY)
}

export function setGuestName(name: string): void {
  localStorage.setItem(GUEST_NAME_KEY, name.trim())
}
