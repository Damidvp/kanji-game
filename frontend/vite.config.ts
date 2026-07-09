import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // En dev on reste à la racine (plus simple en local) ; en build, base = sous-chemin GitHub Pages.
  base: command === 'build' ? '/kanji-game/' : '/',
}))
