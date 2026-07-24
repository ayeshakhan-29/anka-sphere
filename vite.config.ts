import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const targetUrl = env.VITE_API_URL || env.API_URL || 'http://localhost:3010';

  return {
    plugins: [tailwindcss()],
    define: {
      'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || ''),
      'process.env.API_URL': JSON.stringify(env.API_URL || ''),
    },
    server: {
      proxy: {
        '/auth': {
          target: targetUrl,
          secure: false,
        },
        '/projects': {
          target: targetUrl,
          secure: false,
        },
        '/maintenance': {
          target: targetUrl,
          secure: false,
        },
        '/integrations': {
          target: targetUrl,
          secure: false,
        },
      },
    },
  };
});




