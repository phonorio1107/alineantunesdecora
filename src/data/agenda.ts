// Agenda: compromissos do sistema e ligação com o Google Agenda (Edge Function google-agenda).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { verificar } from '../lib/erros'
import type { Compromisso } from './tipos'

export interface StatusGoogle { conectado: boolean; email: string | null; erro: string | null; indisponivel?: boolean }
export interface ItemGoogle { id: string; titulo: string; inicio: string; fim: string; dia_inteiro: boolean; local: string | null }

// Sabido pela última consulta de status: evita chamar o Google a cada gravação quando não há conta ligada.
let conectado: boolean | null = null

async function chamar<T>(corpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('google-agenda', { body: corpo })
  if (error) {
    // A função devolve { erro } com a explicação; o supabase-js entrega a resposta em error.context.
    const ctx = (error as { context?: Response }).context
    const msg = ctx ? ((await ctx.json().catch(() => null)) as { erro?: string } | null)?.erro : null
    throw new Error(msg ?? 'Não foi possível falar com o Google agora.')
  }
  return data as T
}

/** Manda para o Google o que mudou. Não trava a tela: se falhar, o erro aparece no cartão do Google na Agenda. */
export function sincronizarGoogle(origem: 'evento' | 'compromisso', id: string) {
  if (conectado === false) return
  void chamar<{ conectado: boolean }>({ acao: 'sincronizar', origem, id })
    .then((r) => { conectado = r.conectado })
    .catch(() => undefined)
}

export function useStatusGoogle(ativo: boolean) {
  return useQuery({
    queryKey: ['google', 'status'],
    enabled: ativo,
    staleTime: 5 * 60_000,
    retry: 0,
    queryFn: async (): Promise<StatusGoogle> => {
      try {
        const s = await chamar<StatusGoogle>({ acao: 'status' })
        conectado = s.conectado
        return s
      } catch {
        // Função ainda não publicada no Supabase: a Agenda funciona sem o Google.
        conectado = false
        return { conectado: false, email: null, erro: null, indisponivel: true }
      }
    },
  })
}

export function useAgendaGoogle(de: string, ate: string, ativo: boolean) {
  return useQuery({
    queryKey: ['google', 'itens', de, ate],
    enabled: ativo,
    staleTime: 2 * 60_000,
    retry: 0,
    queryFn: async () => (await chamar<{ itens: ItemGoogle[] }>({ acao: 'listar', de, ate })).itens,
  })
}

export function useAcaoGoogle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (acao: 'conectar' | 'desconectar' | 'sincronizar_tudo') => {
      const r = await chamar<{ url?: string; conectado?: boolean; eventos?: number; compromissos?: number }>({ acao })
      if (acao === 'conectar' && r.url) window.location.assign(r.url)
      return r
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['google'] }),
  })
}

export function useCompromissos(empresa: string, de: string, ate: string) {
  return useQuery({
    queryKey: ['compromissos', empresa, de, ate],
    queryFn: async () =>
      verificar('compromissos', await supabase.from('compromissos').select('*').eq('empresa_id', empresa).is('excluido_em', null)
        .gte('inicio', `${de}T00:00:00-03:00`).lte('inicio', `${ate}T23:59:59-03:00`).order('inicio')) as Compromisso[],
  })
}

export type NovoCompromisso = Pick<Compromisso, 'titulo' | 'inicio' | 'fim' | 'dia_inteiro' | 'local' | 'notas' | 'evento_id'>

export function useSalvarCompromisso(empresa: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...c }: NovoCompromisso & { id?: string }) => {
      const r = id
        ? await supabase.from('compromissos').update(c).eq('id', id).select('id').single()
        : await supabase.from('compromissos').insert({ ...c, empresa_id: empresa }).select('id').single()
      return (verificar('salvar compromisso', r) as { id: string }).id
    },
    onSuccess: (id) => { sincronizarGoogle('compromisso', id); return qc.invalidateQueries({ queryKey: ['compromissos'] }) },
  })
}

export function useExcluirCompromisso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      verificar('excluir compromisso', await supabase.from('compromissos').update({ excluido_em: new Date().toISOString() }).eq('id', id))
      return id
    },
    onSuccess: (id) => { sincronizarGoogle('compromisso', id); return qc.invalidateQueries({ queryKey: ['compromissos'] }) },
  })
}
