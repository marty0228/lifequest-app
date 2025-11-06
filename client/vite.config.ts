import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: { enabled: true, type: 'module' }, // 로컬(dev)에서도 설치 테스트
      includeAssets: ['icons/192.png','icons/512.png','icons/512-maskable.png','icons/180.png'],
      manifest: {
        name: 'LifeQuest',
        short_name: 'LifeQuest',
        start_url: '/',
        display: 'standalone',
        theme_color: '#111827',
        background_color: '#111827',
        icons: [
          { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:4000',
      '/quests': 'http://localhost:4000',
      '/goals': 'http://localhost:4000',
      '/schedules': 'http://localhost:4000',
      '/me': 'http://localhost:4000',
    }
  }
})