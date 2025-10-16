import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy any request starting with /NFT_Backend to the backend server to avoid CORS in development
      '/NFT_Backend': {
        target: process.env.SYS_BACKEND_URL || 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
        // preserve path
      },
    },
  },
})
