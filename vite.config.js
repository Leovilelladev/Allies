import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { criarHandlerAlinho } from './server/alinho.js';

export default defineConfig(({ mode }) => ({
  plugins: [react(), {
    name: 'alinho-api-local',
    configureServer(server) {
      const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
      server.middlewares.use('/api/alinho', criarHandlerAlinho({ env }));
    },
  }],
  base: './',
}));
