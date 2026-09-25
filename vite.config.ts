import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Qué versión se está ejecutando.
 * ---------------------------------------------------------------------------
 * Netlify pone el commit publicado en COMMIT_REF. Se incrusta en el paquete y
 * se enseña en Ajustes, porque distinguir «esto está mal» de «tu navegador
 * tiene guardada la versión de antes» a ojo es imposible, y confundirlas cuesta
 * horas.
 */
const commit = (process.env.COMMIT_REF ?? '').slice(0, 7) || 'local';
const construido = new Date().toISOString().slice(0, 16).replace('T', ' ');

export default defineConfig({
  plugins: [react()],
  define: {
    __VERSION__: JSON.stringify(`${commit} · ${construido}`),
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: true, port: 5173 },
});
