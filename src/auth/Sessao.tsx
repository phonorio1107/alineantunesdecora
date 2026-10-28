import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface ContextoSessao {
  sessao: Session | null
  carregando: boolean
  sair: (todosDispositivos?: boolean) => Promise<void>
}

const Contexto = createContext<ContextoSessao | null>(null)

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)
  const qc = useQueryClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setCarregando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSessao(nova)
      // Troca de usuário: nada do anterior pode ficar na memória.
      if (!nova) qc.clear()
    })
    return () => data.subscription.unsubscribe()
  }, [qc])

  const sair = async (todosDispositivos = false) => {
    await supabase.auth.signOut({ scope: todosDispositivos ? 'global' : 'local' })
    qc.clear()
  }

  return <Contexto.Provider value={{ sessao, carregando, sair }}>{children}</Contexto.Provider>
}

export function useSessao() {
  const c = useContext(Contexto)
  if (!c) throw new Error('useSessao precisa estar dentro de <SessaoProvider>')
  return c
}
