import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { SessaoProvider } from './auth/Sessao'
import './index.css'

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
        <App />
      </SessaoProvider>
    </QueryClientProvider>
  </StrictMode>,
)
