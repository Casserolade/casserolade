import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  root: 'src/client',
  // Everything the game loads, described by manifest.json (contract 1), served from the site root.
  publicDir: '../../assets/game',
  plugins: [vue()],
  server: {
    port: 5173,
    strictPort: false,
    // Online games in development: `npm run server` in another terminal.
    proxy: { '/ws': { target: 'ws://localhost:8080', ws: true } },
  },
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    // The game, the bestiary (/bestiaire) and the « À propos » page (/a-propos).
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./src/client/index.html', import.meta.url)),
        apropos: fileURLToPath(new URL('./src/client/a-propos.html', import.meta.url)),
        bestiaire: fileURLToPath(new URL('./src/client/bestiaire.html', import.meta.url)),
      },
    },
  },
});
