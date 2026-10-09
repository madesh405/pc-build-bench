import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use the repository subpath only on GitHub Actions / GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS === 'true' ? '/pc-build-bench/' : '/'
});
