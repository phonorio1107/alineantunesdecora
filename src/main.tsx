import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import App from './App'
import ErroGeral from './components/ErroGeral'
import { SessaoProvider } from './auth/Sessao'
// Fontes servidas pelo próprio sistema (sem Google Fonts): menos um terceiro recebendo o IP de quem usa, e a CSP fica só com 'self'.
import '@fontsource-variable/dm-sans/opsz.css'
import '@fontsource-variable/dm-sans/opsz-italic.css'
import '@fontsource/playfair-display/latin-500.css'
import '@fontsource/playfair-display/latin-600.css'
import '@fontsource/playfair-display/latin-700.css'
import '@fontsource/playfair-display/latin-500-italic.css'
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
    <ErroGeral>
      <QueryClientProvider client={queryClient}>
        <SessaoProvider>
          <Roteador>
            <App />
          </Roteador>
        </SessaoProvider>
      </QueryClientProvider>
    </ErroGeral>
  </StrictMode>,
)
