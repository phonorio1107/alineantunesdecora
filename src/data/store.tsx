// Estado do app enquanto o Supabase não está conectado: parte dos dados de demonstração
// e guarda as alterações no próprio aparelho (localStorage).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as demo from './demo'
import type { Cliente, Evento, OrdemServico } from './types'

interface Dados {
  clientes: Cliente[]
  eventos: Evento[]
  ordens: OrdemServico[]
}

export interface NovaOrdem {
  evento: Evento | Omit<Evento, 'id'>
  novoCliente?: Omit<Cliente, 'id'>
  equipe: string[]
  checklist: string[]
  itens: { itemId: string; quantidade: number }[]
  observacoes: string
}

interface Store extends Dados {
  clientePorId: (id: string) => Cliente | undefined
  eventoPorId: (id: string) => Evento | undefined
  criarOrdem: (nova: NovaOrdem) => OrdemServico
  alternarChecklist: (ordemId: string, indice: number) => void
  novaOSAberta: boolean
  abrirNovaOS: () => void
  fecharNovaOS: () => void
  aviso: string | null
  avisar: (texto: string) => void
}

const CHAVE = 'aline-decora:v1'

function carregar(): Dados {
  const inicial = { clientes: demo.clientes, eventos: demo.eventos, ordens: demo.ordensServico }
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo) return { ...inicial, ...JSON.parse(salvo) }
  } catch {
    // Sem acesso ao armazenamento: segue com os dados de demonstração.
  }
  return inicial
}

const novoId = (prefixo: string) => `${prefixo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [dados, setDados] = useState<Dados>(carregar)
  const [novaOSAberta, setNovaOSAberta] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const atual = useRef(dados)
  atual.current = dados

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(dados))
    } catch {
      // Ignora: as alterações valem só até recarregar a página.
    }
  }, [dados])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 3500)
    return () => clearTimeout(t)
  }, [aviso])

  const criarOrdem = useCallback((nova: NovaOrdem) => {
    const d = atual.current
    let { clientes, eventos } = d
    let evento = nova.evento as Evento
    if (nova.novoCliente) {
      const cliente = { ...nova.novoCliente, id: novoId('c') }
      clientes = [...clientes, cliente]
      evento = { ...evento, clienteId: cliente.id }
    }
    if (!('id' in nova.evento)) {
      evento = { ...evento, id: novoId('e') }
      eventos = [...eventos, evento]
    }
    const criada: OrdemServico = {
      id: novoId('os'),
      numero: Math.max(300, ...d.ordens.map((o) => o.numero)) + 1,
      eventoId: evento.id,
      status: 'a_preparar',
      equipe: nova.equipe,
      checklist: nova.checklist.map((item) => ({ item, feito: false })),
      itens: nova.itens,
      observacoes: nova.observacoes || undefined,
    }
    const proximo = { clientes, eventos, ordens: [...d.ordens, criada] }
    atual.current = proximo
    setDados(proximo)
    return criada
  }, [])

  const alternarChecklist = useCallback((ordemId: string, indice: number) => {
    setDados((d) => ({
      ...d,
      ordens: d.ordens.map((o) =>
        o.id === ordemId ? { ...o, checklist: o.checklist.map((c, i) => (i === indice ? { ...c, feito: !c.feito } : c)) } : o,
      ),
    }))
  }, [])

  const value = useMemo<Store>(
    () => ({
      ...dados,
      clientePorId: (id) => dados.clientes.find((c) => c.id === id),
      eventoPorId: (id) => dados.eventos.find((e) => e.id === id),
      criarOrdem,
      alternarChecklist,
      novaOSAberta,
      abrirNovaOS: () => setNovaOSAberta(true),
      fecharNovaOS: () => setNovaOSAberta(false),
      aviso,
      avisar: setAviso,
    }),
    [dados, criarOrdem, alternarChecklist, novaOSAberta, aviso],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore precisa estar dentro de <StoreProvider>')
  return store
}
