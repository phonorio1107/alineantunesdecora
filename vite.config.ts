import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// "demo" gera a prévia: tudo embutido num arquivo só, com banco simulado (src/demo/banco.ts).
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  base: mode === 'demo' ? './' : '/',
  build: mode === 'demo'
    ? {
        outDir: 'dist-demo',
        assetsInlineLimit: 10_000_000,
        cssCodeSplit: false,
        modulePreload: false,
        chunkSizeWarningLimit: 10_000,
        rollupOptions: { output: { inlineDynamicImports: true } },
      }
    : { chunkSizeWarningLimit: 1500 },
}))
