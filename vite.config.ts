import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// без @types/node — точечное объявление, чтобы не тащить зависимость
declare const process: { env: Record<string, string | undefined> }

const base = process.env.GITHUB_PAGES === 'true' ? '/fitness-tracker/' : '/'

export default defineConfig({
  base,
  // уважаем PORT из окружения (напр. превью-обёртка), иначе дефолт vite
  server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : undefined,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // SW и scope строго под subdirectory GitHub Pages
      base,
      scope: base,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      workbox: {
        // offline SPA: любые навигации в scope отдают index.html
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
      manifest: {
        id: base,
        name: 'Fitness Tracker',
        short_name: 'Fitness',
        description: 'Журнал силовых тренировок и прогресс',
        lang: 'ru',
        theme_color: '#0B0F17',
        background_color: '#0B0F17',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
})
