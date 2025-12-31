import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'fs';
import { join } from 'path';

// Base path for GitHub Pages (set to repo name if deploying to username.github.io/repo-name)
// Leave empty if deploying to username.github.io (root domain)
const base = process.env.GITHUB_PAGES_BASE || '/';

// Plugin to copy index.html to 404.html for client-side routing support
const copy404Plugin = () => {
  return {
    name: 'copy-404',
    writeBundle() {
      // After build, copy index.html to 404.html
      // This allows client-side routing to work on static hosts like GitHub Pages
      const distPath = join(process.cwd(), 'dist');
      try {
        copyFileSync(join(distPath, 'index.html'), join(distPath, '404.html'));
        console.log('✓ Copied index.html to 404.html');
      } catch (error) {
        console.warn('⚠ Could not copy index.html to 404.html:', error);
      }
    },
  };
};

export default defineConfig({
  base,
  plugins: [react(), copy404Plugin()],
  server: {
    host: '0.0.0.0', // Allow external connections
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

