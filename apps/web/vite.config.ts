import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  clearScreen: false,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Jedana - Personal Finance',
        short_name: 'Jedana',
        description: 'Offline-first personal finance tracker',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/mcp/],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*$/,
            handler: 'NetworkOnly',
          },
        ]
      }
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // MCP endpoint ada di backend (:3000), bukan di Vite. Tanpa proxy ini,
      // config MCP yang ditampilkan web (window.location.origin + "/mcp")
      // akan 404 saat diakses dari dev server :5173.
      '/mcp': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
