import { createClient } from '@supabase/supabase-js'

// Só a chave pública (anon) entra no front-end. A service_role nunca vem para cá.
export const modoDemo = import.meta.env.MODE === 'demo'
const url = modoDemo ? 'https://demo.local' : (import.meta.env.VITE_SUPABASE_URL as string | undefined)
const anonKey = modoDemo ? 'demo' : (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

export const supabaseConfigurado = Boolean(url && anonKey)

// Na prévia (npm run build:demo) a rede é trocada por um banco simulado na memória da aba.
// O import é dinâmico e fica num ramo que só existe no build "demo": a produção não leva esse código.
const memoria = new Map<string, string>()
const opcoesDemo = modoDemo
  ? {
      auth: { storage: { getItem: (k: string) => memoria.get(k) ?? null, setItem: (k: string, v: string) => void memoria.set(k, v), removeItem: (k: string) => void memoria.delete(k) }, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (...a: Parameters<typeof fetch>) => import('../demo/banco').then((m) => m.fetchDemo(...a)) },
    }
  : {}

export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'chave-ausente', {
  ...opcoesDemo,
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, ...opcoesDemo.auth },
})
