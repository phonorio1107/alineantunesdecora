import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import App from './App'
import { SessaoProvider } from './auth/Sessao'
import './index.css'
import { modoDemo } from './lib/supabase'

// A prévia roda dentro de uma página que não controla o endereço: navega em memória.
const Roteador = modoDemo ? MemoryRouter : BrowserRouter

// Tema escolhido em Configurações (o claro é o padrão).
try {
  if (localStorage.getItem('tema') === 'escuro') document.documentElement.classList.add('escuro')
} catch {
  /* sem armazenamento: fica no tema claro */
}

// Cache só em memória: nada de dado de cliente salvo no aparelho.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
    mutations: { retry: 0 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessaoProvider>
        <Roteador>
          <App />
        </Roteador>
      </SessaoProvider>
    </QueryClientProvider>
  </StrictMode>,
)
