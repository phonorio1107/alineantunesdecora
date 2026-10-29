import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Cabeçalhos de segurança do Cloudflare (dist/_headers), gerados no build para a CSP liberar só o Supabase deste cliente.
function cabecalhos(supabaseUrl: string | undefined): Plugin {
  let origem = 'https://*.supabase.co'
  try {
    if (supabaseUrl) origem = new URL(supabaseUrl).origin
  } catch {
    /* URL inválida: fica a regra genérica do Supabase */
  }
  const ws = origem.replace(/^https:/, 'wss:')
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' data: blob: ${origem} ${ws}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
  const conteudo = `/*
  Content-Security-Policy: ${csp}
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin
  X-Robots-Tag: noindex, nofollow

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/index.html
  Cache-Control: no-cache
`
  return {
    name: 'cabecalhos-cloudflare',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_headers', source: conteudo })
    },
  }
}

// "demo" gera a prévia: tudo embutido num arquivo só, com banco simulado (src/demo/banco.ts).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), tailwindcss(), ...(mode === 'demo' ? [] : [cabecalhos(env.VITE_SUPABASE_URL)])],
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
  }
})
