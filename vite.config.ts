import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    proxy: {
      '/projects': {
        target: 'http://localhost:3000',
        secure: false,
      },
      '/maintenance': {
        target: 'http://localhost:3000',
        secure: false,
      },
    },
  },
});
