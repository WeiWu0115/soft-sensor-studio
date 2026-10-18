import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({base:'/soft-sensor-studio/',build:{rollupOptions:{input:{editor:'index.html',showcase:'showcase.html'}}},plugins:[react(),tailwindcss()]});
