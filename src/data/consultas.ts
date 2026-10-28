// Leitura e escrita no Supabase com TanStack Query. Nada de dado de cliente no aparelho:
// o cache do TanStack vive só na memória da aba e some ao sair.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { verificar } from '../lib/erros'
import { esquemaCliente, esquemaEvento, esquemaInscricao, esquemaLancamento } from './esquemas'
import type { NovaInscricao, NovoCliente, NovoEvento, NovoLancamento } from './esquemas'
import type {
  Categoria, Cliente, Conta, Evento, InscricaoWorkshop, Lancamento, Recorrencia, ResultadoEvento, SaldoConta, Vinculo,
} from './tipos'

export const chaves = {
  vinculo: ['vinculo'] as const,
  contas: (e: string) => ['contas', e] as const,
  saldos: (e: string) => ['saldos', e] as const,
  categorias: (e: string) => ['categorias', e] as const,
  recorrencias: (e: string) => ['recorrencias', e] as const,
  lancamentos: (e: string, de: string, ate: string) => ['lancamentos', e, de, ate] as const,
  eventos: (e: string) => ['eventos', e] as const,
  resultados: (e: string) => ['resultados', e] as const,
  clientes: (e: string) => ['clientes', e] as const,
  inscricoes: (ev: string) => ['inscricoes', ev] as const,
}

/** Empresa e papel de quem está logado (o primeiro vínculo ativo). */
export function useVinculo() {
  return useQuery({
    queryKey: chaves.vinculo,
    queryFn: async () => {
      const r = await supabase
        .from('usuarios_empresas')
        .select('empresa_id, papel, financeiro_liberado, empresas(*)')
        .is('excluido_em', null)
        .limit(1)
        .maybeSingle()
      return verificar('vinculo', r) as unknown as Vinculo | null
    },
  })
}

const ativos = <T,>(contexto: string) => async (consulta: PromiseLike<{ data: T | null; error: unknown }>) =>
  (verificar(contexto, await consulta) ?? []) as T

export function useContas(empresa: string) {
  return useQuery({
    queryKey: chaves.contas(empresa),
    queryFn: () => ativos<Conta[]>('contas')(supabase.from('contas').select('*').eq('empresa_id', empresa).is('excluido_em', null).order('nome')),
  })
}

export function useSaldos(empresa: string) {
  return useQuery({
    queryKey: chaves.saldos(empresa),
    queryFn: () => ativos<SaldoConta[]>('saldos')(supabase.from('saldos_contas').select('*').eq('empresa_id', empresa)),
  })
}

export function useCategorias(empresa: string) {
  return useQuery({
    queryKey: chaves.categorias(empresa),
    queryFn: () =>
      ativos<Categoria[]>('categorias')(
        supabase.from('categorias').select('*').eq('empresa_id', empresa).eq('ativa', true).is('excluido_em', null).order('nome'),
      ),
    staleTime: 5 * 60_000,
  })
}

export function useRecorrencias(empresa: string) {
  return useQuery({
    queryKey: chaves.recorrencias(empresa),
    queryFn: () =>
      ativos<Recorrencia[]>('recorrencias')(
        supabase.from('recorrencias').select('*').eq('empresa_id', empresa).eq('ativa', true).is('excluido_em', null).order('dia_vencimento'),
      ),
  })
}

/** Lançamentos com vencimento ou pagamento no período [de, ate]. */
export function useLancamentos(empresa: string, de: string, ate: string) {
  return useQuery({
    queryKey: chaves.lancamentos(empresa, de, ate),
    queryFn: () =>
      ativos<Lancamento[]>('lancamentos')(
        supabase
          .from('lancamentos')
          .select('*')
          .eq('empresa_id', empresa)
          .is('excluido_em', null)
          .or(`and(data_pagamento.gte.${de},data_pagamento.lte.${ate}),and(data_pagamento.is.null,data_vencimento.gte.${de},data_vencimento.lte.${ate})`)
          .order('data_vencimento', { ascending: false })
          .range(0, 999),
      ),
  })
}

export function useEventos(empresa: string) {
  return useQuery({
    queryKey: chaves.eventos(empresa),
    queryFn: () =>
      ativos<Evento[]>('eventos')(
        supabase.from('eventos').select('*').eq('empresa_id', empresa).is('excluido_em', null).order('data_evento', { ascending: false }).range(0, 499),
      ),
  })
}

export function useResultadosEventos(empresa: string) {
  return useQuery({
    queryKey: chaves.resultados(empresa),
    queryFn: () => ativos<ResultadoEvento[]>('resultados')(supabase.from('resultado_eventos').select('*').eq('empresa_id', empresa)),
  })
}

export function useClientes(empresa: string) {
  return useQuery({
    queryKey: chaves.clientes(empresa),
    queryFn: () =>
      ativos<Cliente[]>('clientes')(
        supabase.from('clientes').select('*').eq('empresa_id', empresa).is('excluido_em', null).order('nome').range(0, 999),
      ),
  })
}

export function useInscricoes(evento: string) {
  return useQuery({
    queryKey: chaves.inscricoes(evento),
    queryFn: () =>
      ativos<InscricaoWorkshop[]>('inscricoes')(
        supabase.from('inscricoes_workshop').select('*').eq('evento_id', evento).is('excluido_em', null).order('criado_em'),
      ),
  })
}

/** CPF/CNPJ de uma cliente. Só a proprietária recebe algo; para os outros perfis o banco devolve vazio. */
export async function buscarDocumento(cliente: string): Promise<string | null> {
  const r = await supabase.from('clientes_documentos').select('cpf_cnpj').eq('cliente_id', cliente).maybeSingle()
  return (verificar('documento', r) as { cpf_cnpj: string } | null)?.cpf_cnpj ?? null
}

// ---------------------------------------------------------------------------
// Escritas
// ---------------------------------------------------------------------------
function useInvalidar() {
  const qc = useQueryClient()
  return (...prefixos: string[]) => Promise.all(prefixos.map((p) => qc.invalidateQueries({ queryKey: [p] })))
}

export function useCriarLancamento(empresa: string) {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (entrada: NovoLancamento) => {
      const l = esquemaLancamento.parse(entrada)
      const r = await supabase.from('lancamentos').insert({
        empresa_id: empresa,
        tipo: l.tipo,
        valor: l.valor,
        data_vencimento: l.data,
        data_pagamento: l.pago ? l.data : null,
        conta_id: l.conta_id,
        categoria_id: l.categoria_id,
        evento_id: l.evento_id ?? null,
        descricao: l.descricao || null,
      })
      verificar('criar lançamento', r)
    },
    onSuccess: () => invalidar('lancamentos', 'saldos', 'resultados'),
  })
}

export function useMarcarPago() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: string }) => {
      verificar('marcar pago', await supabase.from('lancamentos').update({ data_pagamento: data }).eq('id', id))
    },
    onSuccess: () => invalidar('lancamentos', 'saldos', 'resultados'),
  })
}

/** Exclusão que dá para desfazer (excluido_em). */
export function useExcluirLancamento() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => {
      verificar('excluir lançamento', await supabase.from('lancamentos').update({ excluido_em: new Date().toISOString() }).eq('id', id))
    },
    onSuccess: () => invalidar('lancamentos', 'saldos', 'resultados'),
  })
}

export function useCriarCliente(empresa: string) {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (entrada: NovoCliente) => {
      const { cpf_cnpj, ...dados } = esquemaCliente.parse(entrada)
      const r = await supabase.from('clientes').insert({ ...dados, empresa_id: empresa }).select('id').single()
      const { id } = verificar('criar cliente', r) as { id: string }
      if (cpf_cnpj) {
        verificar('documento do cliente', await supabase.from('clientes_documentos').insert({ cliente_id: id, empresa_id: empresa, cpf_cnpj }))
      }
      return id
    },
    onSuccess: () => invalidar('clientes'),
  })
}

export function useCriarEvento(empresa: string) {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (entrada: NovoEvento) => {
      const e = esquemaEvento.parse(entrada)
      const r = await supabase.rpc('criar_evento', {
        p_empresa: empresa,
        p_titulo: e.titulo,
        p_tipo: e.tipo,
        p_fonte: e.fonte,
        p_cliente: e.cliente_id,
        p_data_evento: e.data_evento,
        p_cidade: e.cidade,
        p_valor_fechado: e.valor_fechado,
        p_entrada_percentual: e.entrada_percentual,
        p_data_entrada: e.data_entrada,
        p_conta: e.conta_id,
        p_vagas: e.vagas,
        p_valor_inscricao: e.valor_inscricao,
      })
      return verificar('criar evento', r) as string
    },
    onSuccess: () => invalidar('eventos', 'resultados', 'lancamentos'),
  })
}

export function useCriarInscricao(empresa: string, evento: string, valor: number) {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (entrada: NovaInscricao) => {
      const i = esquemaInscricao.parse(entrada)
      verificar('criar inscrição', await supabase.from('inscricoes_workshop').insert({ ...i, empresa_id: empresa, evento_id: evento, valor }))
    },
    onSuccess: () => invalidar('inscricoes'),
  })
}

export function usePagarInscricao() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ inscricao, conta }: { inscricao: string; conta: string }) => {
      verificar('pagar inscrição', await supabase.rpc('pagar_inscricao', { p_inscricao: inscricao, p_conta: conta }))
    },
    onSuccess: () => invalidar('inscricoes', 'lancamentos', 'saldos', 'resultados'),
  })
}

export function useFecharMes(empresa: string) {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ mes, resumo }: { mes: string; resumo: Record<string, number> }) => {
      verificar('fechar mês', await supabase.from('fechamentos_mensais').insert({ empresa_id: empresa, mes_referencia: `${mes}-01`, resumo }))
    },
    onSuccess: () => invalidar('fechamentos', 'lancamentos'),
  })
}
