import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Project site: https://laurendudu.github.io/pacific-dataviz-challenge-2026/
  base: '/pacific-dataviz-challenge-2026/',
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
  },
})
