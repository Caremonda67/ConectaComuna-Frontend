import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  build: {
    // Separamos los vendors pesados: en gama baja / 3G el chunk del mapa
    // (leaflet) solo se descarga cuando el usuario abre la vista de mapa.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('leaflet')) return 'map'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('node_modules/react')) return 'react'
          return undefined
        },
      },
    },
  },
})
