import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    base: './',
    envPrefix: ['VITE_', 'SUPABASE_'],
    define: {
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_PUBLISHABLE_KEY': JSON.stringify(env.SUPABASE_PUBLISHABLE_KEY),
      'process.env.SUPABASE_SECRET_KEY': JSON.stringify(env.SUPABASE_SECRET_KEY),
      'process.env.SUPABASE_JWKS_URL': JSON.stringify(env.SUPABASE_JWKS_URL),
    },
  };
});
