import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Facebook',
        short_name: 'Facebook',
        description: 'Facebook UI clone built with Astryx',
        theme_color: '#0866FF',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png'},
          {src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png'},
          {src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(i\.pravatar\.cc|picsum\.photos|fastly\.picsum\.photos)\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {cacheName: 'images', expiration: {maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7}},
          },
        ],
      },
    }),
  ],
});
