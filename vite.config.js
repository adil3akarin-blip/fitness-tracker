import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    // уважаем PORT из окружения (напр. превью-обёртка), иначе дефолт vite
    server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : undefined,
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icon.svg', 'apple-touch-icon.png'],
            manifest: {
                name: 'Fitness Tracker',
                short_name: 'Fitness',
                description: 'Журнал силовых тренировок и прогресс',
                lang: 'ru',
                theme_color: '#0B0F17',
                background_color: '#0B0F17',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                icons: [
                    { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                    { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                    { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                    { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
                ],
            },
        }),
    ],
});
