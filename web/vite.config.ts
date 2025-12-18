import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base path for GitHub Pages (set to repo name if deploying to username.github.io/repo-name)
// Leave empty if deploying to username.github.io (root domain)
const base = process.env.GITHUB_PAGES_BASE || '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT ? parseInt(process.env.PORT) : 4173,
    allowedHosts: [
      'web-production-b143.up.railway.app',
      '.railway.app', // Allow all Railway subdomains
    ],
  },
});

