import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // All /api calls in dev go to Spring Boot on :8080
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    // Maven copies this output into the JAR as static resources
    outDir: '../src/main/resources/static',
    emptyOutDir: true,
  }
})
