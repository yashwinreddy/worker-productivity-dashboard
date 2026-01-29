import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Allow Render preview host when running inside Render or Codespaces
    // Add any additional hosts here if needed
    allowedHosts: [
      'https://productivity-frontend-f1vn.onrender.com'
    ],
    watch: {
      usePolling: true
    }
  }
})
