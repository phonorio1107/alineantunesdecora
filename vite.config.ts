import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// "demo" gera uma versão com tudo embutido para publicar como página de teste.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  base: mode === 'demo' ? './' : '/',
  build: mode === 'demo'
    ? {
        outDir: 'dist-demo',
        assetsInlineLimit: 1_000_000,
        cssCodeSplit: false,
        modulePreload: false,
        rollupOptions: { output: { inlineDynamicImports: true } },
      }
    : undefined,
}))
