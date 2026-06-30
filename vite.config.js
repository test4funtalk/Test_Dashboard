import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
          if (id.includes('react-router'))      return 'vendor-router';
          if (
            id.includes('@reduxjs') || id.includes('react-redux') || id.includes('immer') ||
            id.includes('redux-thunk') || id.includes('reselect') || id.includes('use-sync-external-store') ||
            /[\\/]redux[\\/]/.test(id)
          ) return 'vendor-redux';
          if (id.includes('lucide-react'))      return 'vendor-icons';
          if (id.includes('axios'))             return 'vendor-axios';
          return 'vendor';
        },
      },
    },
  },
})
