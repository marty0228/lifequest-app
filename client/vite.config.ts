import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,   // 프론트 개발 서버 포트
    proxy: {
      '/auth': 'http://localhost:4000',
      '/quests': 'http://localhost:4000',
      '/goals': 'http://localhost:4000',
      '/schedules': 'http://localhost:4000',
      '/me': 'http://localhost:4000',
    }
  }
})
