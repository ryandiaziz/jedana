import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  clearScreen: false,
  plugins: [
    react(),
    tailwindcss(),
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
