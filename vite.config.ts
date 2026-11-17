import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Safe variables can be defined here if needed.
      },
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'react-dom/client',
          'react/jsx-runtime',
          'react/jsx-dev-runtime',
          'lucide-react',
          'motion/react',
          'leaflet',
          'react-leaflet',
          'recharts',
          'papaparse',
          'suncalc',
          'firebase/app',
          'firebase/auth',
          'firebase/firestore',
          'idb',
          'react-markdown'
        ]
      },
      resolve: {
        dedupe: ['react', 'react-dom'],
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
