import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:3010',
        secure: false,
      },
      '/projects': {
        target: 'http://localhost:3010',
        secure: false,
      },
      '/maintenance': {
        target: 'http://localhost:3010',
        secure: false,
      },
    },
  },
});



