import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// BASE_PATH="/digito/" para GitHub Pages; "/" para Vercel/Netlify
export default defineConfig({ base: process.env.BASE_PATH || '/', plugins: [react()], build: { chunkSizeWarningLimit: 1200 } });
