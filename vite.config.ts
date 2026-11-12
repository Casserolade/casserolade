import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { assetVersions } from './src/server/assetVersions.ts';

export default defineConfig(({ command }) => ({
  root: 'src/client',
  // Everything the game loads, described by manifest.json (contract 1), served from the site root.
  publicDir: '../../assets/game',
  plugins: [vue()],
  // The version of each of these files, for their addresses (assetUrl): the server lets browsers keep them for good.
  define: { __ASSET_VERSIONS__: command === 'build' ? JSON.stringify(assetVersions('assets/game')) : 'undefined' },
  server: {
    port: 5173,
    strictPort: false,
    // Online games in development: `npm run server` in another terminal.
    proxy: { '/ws': { target: 'ws://localhost:8080', ws: true }, '/en-direct': 'http://localhost:8080' },
  },
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    // The game, its phone version (/m/), the bestiary (/bestiaire) and the « À propos » page (/a-propos).
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./src/client/index.html', import.meta.url)),
        apropos: fileURLToPath(new URL('./src/client/a-propos.html', import.meta.url)),
        bestiaire: fileURLToPath(new URL('./src/client/bestiaire.html', import.meta.url)),
        // The phone version, held upright (6 November 2026): phones are sent there from the home page.
        mobile: fileURLToPath(new URL('./src/client/m/index.html', import.meta.url)),
      },
    },
  },
}));
