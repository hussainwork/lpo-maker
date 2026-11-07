import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served from https://hussainwork.github.io/lpo-maker/
export default defineConfig({
  base: '/lpo-maker/',
  plugins: [react()],
})
