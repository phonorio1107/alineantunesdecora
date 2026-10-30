// Leitura e escrita no Supabase com TanStack Query. Nada de dado de cliente no aparelho:
// o cache do TanStack vive só na memória da aba e some ao sair.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { verificar } from '../lib/erros'
import { dividirEmParcelas } from '../lib/calculos'
import { somarMeses } from '../lib/format'
import { sincronizarGoogle } from './agenda'
// Os formulários validam com os esquemas Zod (./esquemas); aqui chegam só dados já validados.
import type { ClienteValido, EventoValido, InscricaoValida, LancamentoValido, PecaValida } from './esquemas'
import type {
  Areas, Categoria, Cliente, Conta, Contrato, DadosContrato, Empresa, Evento, FechamentoMensal, InscricaoWorkshop, ItemVenda, Lancamento,
  MovimentoEstoque, Papel, Peca, Recorrencia, ResultadoEvento, SaldoConta, Vinculo,
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
  fechamentos: (e: string) => ['fechamentos', e] as const,
  documentos: (e: string) => ['documentos', e] as const,
  contratos: (e: string) => ['contratos', e] as const,
  equipe: (e: string) => ['equipe', e] as const,
  itens: (ev: string) => ['itens', ev] as const,
  estoque: (e: string) => ['estoque', e] as const,
}

/**
 * Empresa e papel de quem está logado. Filtra pelo próprio usuário: a proprietária enxerga os vínculos
 * da equipe inteira, então sem esse filtro o sistema poderia carregar o perfil de outra pessoa.
 */
export function useVinculo(usuarioId: string) {
  return useQuery({
    queryKey: [...chaves.vinculo, usuarioId],
    enabled: !!usuarioId,
    queryFn: async () => {
      const r = await supabase
        .from('usuarios_empresas')
        .select('empresa_id, papel, financeiro_liberado, empresas(*)')
        .eq('usuario_id', usuarioId)
        .is('excluido_em', null)
        .order('criado_em')
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

/** CPF/CNPJ e inscrição estadual (para o contrato). Só a proprietária recebe algo. */
export async function buscarDadosFiscais(cliente: string): Promise<{ cpf_cnpj: string; inscricao_estadual: string | null } | null> {
  const r = await supabase.from('clientes_documentos').select('cpf_cnpj, inscricao_estadual').eq('cliente_id', cliente).maybeSingle()
  return verificar('documento', r) as { cpf_cnpj: string; inscricao_estadual: string | null } | null
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
    mutationFn: async ({ l, nomeCategoria }: { l: LancamentoValido; nomeCategoria: string }) => {
      const base = {
        empresa_id: empresa,
        tipo: l.tipo,
        conta_id: l.conta_id,
        categoria_id: l.categoria_id,
        evento_id: l.evento_id ?? null,
      }
      if (l.repetir === 'parcelado' && l.parcelas) {
        // Todas as parcelas num insert só: ou entram todas, ou nenhuma.
        const grupo = crypto.randomUUID()
        const nome = l.descricao || nomeCategoria
        const linhas = dividirEmParcelas(l.valor, l.parcelas).map((valor, i) => ({
          ...base,
          valor,
          data_vencimento: somarMeses(l.data, i),
          data_pagamento: i === 0 && l.pago ? l.data : null,
          descricao: `${nome} (${i + 1}/${l.parcelas})`.slice(0, 120),
          parcela_grupo: grupo,
          parcela_num: i + 1,
          parcela_total: l.parcelas,
        }))
        verificar('criar parcelas', await supabase.from('lancamentos').insert(linhas))
        return
      }
      let recorrencia_id: string | null = null
      if (l.repetir === 'mensal') {
        const r = await supabase
          .from('recorrencias')
          .insert({
            empresa_id: empresa, tipo: l.tipo, descricao: (l.descricao || nomeCategoria).slice(0, 80), valor: l.valor,
            dia_vencimento: Number(l.data.slice(8, 10)), categoria_id: l.categoria_id, conta_id: l.conta_id, inicio: l.data,
          })
          .select('id')
          .single()
        recorrencia_id = (verificar('criar repetição', r) as { id: string }).id
      }
      verificar('criar lançamento', await supabase.from('lancamentos').insert({
        ...base,
        valor: l.valor,
        data_vencimento: l.data,
        data_pagamento: l.pago ? l.data : null,
        descricao: l.descricao || null,
        recorrencia_id,
      }))
      // Os próximos meses já aparecem previstos no caixa.
      if (recorrencia_id) verificar('gerar repetições', await supabase.rpc('gerar_recorrencias', { p_empresa: empresa, p_ate: proximosMeses(6) }))
    },
    onSuccess: () => invalidar('lancamentos', 'saldos', 'resultados', 'recorrencias'),
  })
}

/** Exclui esta parcela e as seguintes que ainda não foram pagas. */
export function useExcluirParcelas() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ grupo, aPartirDe }: { grupo: string; aPartirDe: number }) => {
      verificar('excluir parcelas', await supabase.from('lancamentos').update({ excluido_em: new Date().toISOString() })
        .eq('parcela_grupo', grupo).gte('parcela_num', aPartirDe).is('data_pagamento', null))
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
    mutationFn: async ({ cpf_cnpj, inscricao_estadual, ...dados }: ClienteValido) => {
      const r = await supabase.from('clientes').insert({ ...dados, empresa_id: empresa }).select('id').single()
      const { id } = verificar('criar cliente', r) as { id: string }
      if (cpf_cnpj) {
        verificar('documento do cliente', await supabase.from('clientes_documentos').insert({ cliente_id: id, empresa_id: empresa, cpf_cnpj, inscricao_estadual }))
      }
      return id
    },
    onSuccess: () => invalidar('clientes', 'documentos'),
  })
}

export function useCriarEvento(empresa: string) {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (e: EventoValido) => {
      const r = await supabase.rpc('criar_evento', {
        p_empresa: empresa,
        p_titulo: e.titulo,
        p_tipo: e.turma ? 'workshop' : e.tipo,
        p_fonte: e.fonte,
        p_cliente: e.turma ? null : e.cliente_id,
        p_data_evento: e.data_evento,
        p_cidade: e.cidade,
        p_valor_fechado: e.turma ? 0 : e.valor_fechado,
        p_entrada_percentual: e.entrada_percentual,
        p_data_entrada: e.data_entrada,
        p_conta: e.conta_id,
        p_vagas: e.turma ? e.vagas : null,
        p_valor_inscricao: e.turma ? e.valor_inscricao : null,
        p_areas: e.areasValores,
        p_orcamento: !e.fechado,
      })
      const id = verificar('criar evento', r) as string
      if (e.local_nome || e.local_endereco || e.entrega_em || e.devolucao_em || e.observacoes) {
        verificar('logística do evento', await supabase.from('eventos').update({
          local_nome: e.local_nome, local_endereco: e.local_endereco, entrega_em: e.entrega_em, devolucao_em: e.devolucao_em, observacoes: e.observacoes,
        }).eq('id', id))
      }
      return id
    },
    onSuccess: (id) => { sincronizarGoogle('evento', id); return invalidar('eventos', 'resultados', 'lancamentos') },
  })
}

/** Fecha o orçamento: vira contrato, guarda o valor de cada área e cria entrada e saldo. */
export function useFecharOrcamento() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (p: { evento: string; valor: number; areas: Areas; entrada_percentual: number; data_entrada: string; conta: string | null }) => {
      verificar('fechar orçamento', await supabase.rpc('fechar_orcamento', {
        p_evento: p.evento, p_valor: p.valor, p_areas: p.areas, p_entrada_percentual: p.entrada_percentual, p_data_entrada: p.data_entrada, p_conta: p.conta,
      }))
      return p.evento
    },
    onSuccess: (id) => { sincronizarGoogle('evento', id); return invalidar('eventos', 'resultados', 'lancamentos', 'estoque', 'saldos') },
  })
}

// ---------------------------------------------------------------------------
// Itens da venda (peças e serviços) e estoque
// ---------------------------------------------------------------------------
export function useItens(evento: string) {
  return useQuery({
    queryKey: chaves.itens(evento),
    enabled: !!evento,
    queryFn: () => ativos<ItemVenda[]>('itens')(supabase.from('eventos_itens').select('*').eq('evento_id', evento).order('ordem').order('criado_em')),
  })
}

/** Itens com peça do estoque de várias vendas (para saber o que já está reservado no mesmo dia). */
export function useItensDasVendas(eventos: string[]) {
  return useQuery({
    queryKey: ['itens', 'varios', ...eventos],
    enabled: eventos.length > 0,
    queryFn: () => ativos<ItemVenda[]>('itens')(supabase.from('eventos_itens').select('*').in('evento_id', eventos).not('peca_id', 'is', null)),
  })
}

type ItemNovo = Pick<ItemVenda, 'tipo' | 'peca_id' | 'descricao' | 'quantidade' | 'valor_unitario'> & { ordem?: number }
export function useSalvarItem(empresa: string, evento: string) {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, ...campos }: Partial<ItemNovo> & { id?: string; perdidas?: number }) => {
      if (id) verificar('atualizar item', await supabase.from('eventos_itens').update(campos).eq('id', id))
      else verificar('adicionar item', await supabase.from('eventos_itens').insert({ ...campos, empresa_id: empresa, evento_id: evento }))
    },
    onSuccess: () => invalidar('itens', 'estoque'),
  })
}

export function useExcluirItem() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => { verificar('tirar item', await supabase.from('eventos_itens').delete().eq('id', id)) },
    onSuccess: () => invalidar('itens', 'estoque'),
  })
}

export function useEstoque(empresa: string) {
  return useQuery({
    queryKey: chaves.estoque(empresa),
    queryFn: () => ativos<Peca[]>('estoque')(supabase.from('estoque_pecas').select('*').eq('empresa_id', empresa).order('nome').range(0, 1999)),
  })
}

export function useMovimentos(peca: string) {
  return useQuery({
    queryKey: ['estoque', 'movimentos', peca],
    enabled: !!peca,
    queryFn: () => ativos<MovimentoEstoque[]>('movimentos')(supabase.from('estoque_movimentos').select('*').eq('peca_id', peca).order('criado_em', { ascending: false }).range(0, 49)),
  })
}

/** Cadastra ou altera uma peça. A quantidade vira um movimento de ajuste (a diferença para a atual). */
export function useSalvarPeca(empresa: string) {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, atual = 0, p }: { id?: string; atual?: number; p: PecaValida }) => {
      const { quantidade, ...campos } = p
      let pecaId = id
      if (id) verificar('atualizar peça', await supabase.from('pecas').update(campos).eq('id', id))
      else pecaId = (verificar('cadastrar peça', await supabase.from('pecas').insert({ ...campos, empresa_id: empresa }).select('id').single()) as { id: string }).id
      const dif = quantidade - atual
      if (dif !== 0) {
        verificar('ajustar quantidade', await supabase.from('estoque_movimentos').insert({
          empresa_id: empresa, peca_id: pecaId, quantidade: dif, motivo: 'ajuste', observacao: id ? 'Ajuste de quantidade' : 'Cadastro',
        }))
      }
    },
    onSuccess: () => invalidar('estoque'),
  })
}

export function useArquivarPeca() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => { verificar('tirar peça', await supabase.from('pecas').update({ excluido_em: new Date().toISOString() }).eq('id', id)) },
    onSuccess: () => invalidar('estoque'),
  })
}

export function useCriarInscricao(empresa: string, evento: string, valor: number) {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (i: InscricaoValida) => {
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

// ---------------------------------------------------------------------------
// Parcelas e lançamentos
// ---------------------------------------------------------------------------
export function useAtualizarLancamento() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, ...campos }: { id: string; valor?: number; data_vencimento?: string; data_pagamento?: string | null; descricao?: string | null }) => {
      verificar('atualizar lançamento', await supabase.from('lancamentos').update(campos).eq('id', id))
    },
    onSuccess: () => invalidar('lancamentos', 'saldos', 'resultados'),
  })
}

export function useAtualizarEvento() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, ...campos }: Partial<Evento> & { id: string }) => {
      verificar('atualizar evento', await supabase.from('eventos').update(campos).eq('id', id))
      return id
    },
    onSuccess: (id) => { sincronizarGoogle('evento', id); return invalidar('eventos', 'resultados', 'estoque') },
  })
}

/** Cria os lançamentos previstos dos custos fixos até a data (sem duplicar). Roda ao abrir o sistema. */
export function useGerarRecorrencias(empresa: string) {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (ate: string) => verificar('gerar custos fixos', await supabase.rpc('gerar_recorrencias', { p_empresa: empresa, p_ate: ate })) as number,
    onSuccess: (criados) => (criados > 0 ? invalidar('lancamentos') : undefined),
  })
}

// ---------------------------------------------------------------------------
// Fechamento do mês
// ---------------------------------------------------------------------------
export function useFechamentos(empresa: string) {
  return useQuery({
    queryKey: chaves.fechamentos(empresa),
    queryFn: () =>
      ativos<FechamentoMensal[]>('fechamentos')(
        supabase.from('fechamentos_mensais').select('*').eq('empresa_id', empresa).is('excluido_em', null),
      ),
  })
}

export function useReabrirMes() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => {
      verificar('reabrir mês', await supabase.from('fechamentos_mensais').update({ excluido_em: new Date().toISOString() }).eq('id', id))
    },
    onSuccess: () => invalidar('fechamentos', 'lancamentos'),
  })
}

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------
export function useAtualizarEmpresa(empresa: string) {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (campos: Partial<Empresa>) => {
      verificar('atualizar empresa', await supabase.from('empresas').update(campos).eq('id', empresa))
    },
    onSuccess: () => invalidar('vinculo'),
  })
}

export function useCriarConta(empresa: string) {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (c: { nome: string; saldo_inicial: number; data_saldo_inicial: string }) => {
      verificar('criar conta', await supabase.from('contas').insert({ ...c, empresa_id: empresa }))
    },
    onSuccess: () => invalidar('contas', 'saldos'),
  })
}

export function useCriarRecorrencia(empresa: string) {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (r: { descricao: string; valor: number; dia_vencimento: number; categoria_id: string; conta_id: string }) => {
      verificar('criar custo fixo', await supabase.from('recorrencias').insert({ ...r, empresa_id: empresa }))
      // Já cria os meses seguintes, para aparecer na previsão do caixa.
      verificar('gerar custos fixos', await supabase.rpc('gerar_recorrencias', { p_empresa: empresa, p_ate: proximosMeses(6) }))
    },
    onSuccess: () => invalidar('recorrencias', 'lancamentos'),
  })
}

/** Para de repetir e tira os meses previstos (não pagos) depois de "depoisDe"; o que já foi pago fica. */
export function useDesativarRecorrencia() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, depoisDe }: { id: string; depoisDe: string }) => {
      verificar('parar repetição', await supabase.from('recorrencias').update({ ativa: false }).eq('id', id))
      verificar('tirar meses previstos', await supabase.from('lancamentos').update({ excluido_em: new Date().toISOString() })
        .eq('recorrencia_id', id).is('data_pagamento', null).gt('data_vencimento', depoisDe))
    },
    onSuccess: () => invalidar('recorrencias', 'lancamentos', 'saldos', 'resultados'),
  })
}

export function useCriarCategoria(empresa: string) {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (c: Pick<Categoria, 'nome' | 'tipo' | 'natureza'>) => {
      verificar('criar categoria', await supabase.from('categorias').insert({ ...c, empresa_id: empresa }))
    },
    onSuccess: () => invalidar('categorias'),
  })
}

export function useEquipe(empresa: string, ativo: boolean) {
  return useQuery({
    queryKey: chaves.equipe(empresa),
    enabled: ativo,
    queryFn: () =>
      ativos<{ id: string; usuario_id: string; papel: Papel; financeiro_liberado: boolean }[]>('equipe')(
        supabase.from('usuarios_empresas').select('id, usuario_id, papel, financeiro_liberado').eq('empresa_id', empresa).is('excluido_em', null),
      ),
  })
}

export function useAtualizarAcesso() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, financeiro_liberado }: { id: string; financeiro_liberado: boolean }) => {
      verificar('atualizar acesso', await supabase.from('usuarios_empresas').update({ financeiro_liberado }).eq('id', id))
    },
    onSuccess: () => invalidar('equipe'),
  })
}

// ---------------------------------------------------------------------------
// Documentos (CPF/CNPJ) e contratos: só a proprietária recebe dados
// ---------------------------------------------------------------------------
export function useDocumentos(empresa: string, ativo: boolean) {
  return useQuery({
    queryKey: chaves.documentos(empresa),
    enabled: ativo,
    queryFn: () =>
      ativos<{ cliente_id: string; cpf_cnpj: string; inscricao_estadual: string | null }[]>('documentos')(
        supabase.from('clientes_documentos').select('cliente_id, cpf_cnpj, inscricao_estadual').eq('empresa_id', empresa).is('excluido_em', null),
      ),
  })
}

export function useSalvarDocumento(empresa: string) {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ cliente, cpf_cnpj, inscricao_estadual }: { cliente: string; cpf_cnpj: string; inscricao_estadual: string | null }) => {
      verificar('salvar documento', await supabase.from('clientes_documentos').upsert({ cliente_id: cliente, empresa_id: empresa, cpf_cnpj, inscricao_estadual }))
    },
    onSuccess: () => invalidar('documentos'),
  })
}

export function useAtualizarCliente() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, ...campos }: Partial<Cliente> & { id: string }) => {
      verificar('atualizar cliente', await supabase.from('clientes').update(campos).eq('id', id))
    },
    onSuccess: () => invalidar('clientes'),
  })
}

/**
 * Exclui uma cliente. Sem eventos: apaga de vez (o CPF/CNPJ vai junto). Com eventos: apaga os dados pessoais
 * (LGPD) e mantém o histórico financeiro dos eventos, com o nome "Cliente removido".
 */
export function useExcluirCliente() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, temEventos }: { id: string; temEventos: boolean }) => {
      if (!temEventos) {
        verificar('excluir cliente', await supabase.from('clientes').delete().eq('id', id))
        return
      }
      verificar('apagar documento', await supabase.from('clientes_documentos').delete().eq('cliente_id', id))
      verificar('apagar dados pessoais', await supabase.from('clientes').update({
        nome: 'Cliente removido', telefone: null, email: null, cep: null, endereco: null, cidade: null, excluido_em: new Date().toISOString(),
      }).eq('id', id))
    },
    onSuccess: () => invalidar('clientes', 'documentos', 'eventos'),
  })
}

export function useContratos(empresa: string, ativo: boolean) {
  return useQuery({
    queryKey: chaves.contratos(empresa),
    enabled: ativo,
    queryFn: () =>
      ativos<Contrato[]>('contratos')(
        supabase.from('contratos').select('*').eq('empresa_id', empresa).is('excluido_em', null).order('emitido_em', { ascending: false }),
      ),
  })
}

export function useEmitirContrato() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ evento, dados }: { evento: string; dados: DadosContrato }) =>
      verificar('emitir contrato', await supabase.rpc('emitir_contrato', { p_evento: evento, p_dados: dados })) as Contrato,
    onSuccess: () => invalidar('contratos'),
  })
}

export function useAtualizarContrato() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, ...campos }: { id: string; assinado_em?: string | null; cancelado_em?: string | null }) => {
      verificar('atualizar contrato', await supabase.from('contratos').update(campos).eq('id', id))
    },
    onSuccess: () => invalidar('contratos'),
  })
}

function proximosMeses(n: number) {
  const d = new Date()
  d.setMonth(d.getMonth() + n + 1, 0)
  return d.toISOString().slice(0, 10)
}
