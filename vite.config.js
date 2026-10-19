import {defineConfig} from 'vite';
export default defineConfig({build:{rollupOptions:{output:{manualChunks:{sdk:['genlayer-js','viem']}}}}});
