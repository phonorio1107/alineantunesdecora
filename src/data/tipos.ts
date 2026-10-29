// Tipos das tabelas da migração supabase/migrations/20261028120000_estrutura_v1.sql.

export type Papel = 'proprietaria' | 'assistente' | 'freelancer'
export type OrigemCliente = 'instagram' | 'indicacao' | 'whatsapp' | 'site' | 'outra'
export type TipoEvento = 'infantil' | 'casamento' | 'quinze_anos' | 'cha' | 'batizado' | 'corporativo' | 'workshop' | 'outro'
export type FonteReceita = 'decoracao' | 'assessoria' | 'workshop'
export type StatusEvento = 'confirmado' | 'realizado' | 'cancelado'
export type StatusInscricao = 'reservada' | 'paga' | 'cancelada'
export type TipoLancamento = 'entrada' | 'saida'
export type NaturezaCategoria = 'receita' | 'variavel' | 'fixo' | 'retirada'

interface Padrao {
  id: string
  empresa_id: string
  criado_em: string
  atualizado_em: string
  criado_por: string | null
  excluido_em: string | null
}

export interface Empresa {
  id: string
  nome: string
  logo_url: string | null
  cor_destaque: string | null
  reserva_meses: number
  retirada_minima: number
  entrada_percentual: number
  dias_saldo_antes_evento: number
  percentual_lucro_empresa: number | null
  percentual_lucro_proprietaria: number | null
  razao_social: string | null
  cnpj: string | null
  telefones: string | null
  email_contato: string | null
  endereco: string | null
  cidade_foro: string | null
  banco_nome: string | null
  banco_agencia: string | null
  banco_conta: string | null
  banco_favorecido: string | null
  pix_chave: string | null
  responsavel_nome: string | null
}

export interface Vinculo {
  empresa_id: string
  papel: Papel
  financeiro_liberado: boolean
  empresas: Empresa
}

export interface Cliente extends Padrao {
  nome: string
  telefone: string | null
  email: string | null
  cep?: string | null
  endereco: string | null
  cidade: string | null
  origem: OrigemCliente
}

export interface Evento extends Padrao {
  cliente_id: string | null
  titulo: string
  tipo: TipoEvento
  fonte: FonteReceita
  data_evento: string
  cidade: string | null
  valor_fechado: number
  vagas: number | null
  valor_inscricao: number | null
  status: StatusEvento
  local_nome: string | null
  local_endereco: string | null
  entrega_em: string | null
  devolucao_em: string | null
}

export interface Compromisso extends Padrao {
  titulo: string
  /** Instantes ISO (com fuso). Dia inteiro: início e fim no mesmo dia, às 12h de São Paulo. */
  inicio: string
  fim: string
  dia_inteiro: boolean
  local: string | null
  notas: string | null
  evento_id: string | null
}

export interface Conta extends Padrao {
  nome: string
  saldo_inicial: number
  data_saldo_inicial: string
  ativa: boolean
}

export interface Categoria extends Padrao {
  nome: string
  tipo: TipoLancamento
  natureza: NaturezaCategoria
  fonte: FonteReceita | null
  ativa: boolean
}

export interface Lancamento extends Padrao {
  tipo: TipoLancamento
  valor: number
  data_vencimento: string
  data_pagamento: string | null
  conta_id: string
  categoria_id: string
  evento_id: string | null
  recorrencia_id: string | null
  descricao: string | null
  /** Parcelado: mesmo grupo em todas as parcelas, "2 de 5". */
  parcela_grupo?: string | null
  parcela_num?: number | null
  parcela_total?: number | null
}

export interface Recorrencia extends Padrao {
  /** Entrada ou saída que se repete todo mês (antes da migração de 30/10/2026, só saídas). */
  tipo?: TipoLancamento
  /** Primeiro mês da repetição; vazio = mês atual. */
  inicio?: string | null
  descricao: string
  valor: number
  dia_vencimento: number
  categoria_id: string
  conta_id: string
  ativa: boolean
}

export interface InscricaoWorkshop extends Padrao {
  evento_id: string
  nome: string
  telefone: string | null
  valor: number
  status: StatusInscricao
  lancamento_id: string | null
}

export interface SaldoConta {
  empresa_id: string
  conta_id: string
  nome: string
  saldo: number
}

export interface ResultadoEvento {
  empresa_id: string
  evento_id: string
  titulo: string
  fonte: FonteReceita
  data_evento: string
  valor_fechado: number
  recebido: number
  a_receber: number
  custos: number
}

export interface FechamentoMensal extends Padrao {
  mes_referencia: string
  resumo: Record<string, number>
}

export interface Contrato extends Padrao {
  evento_id: string
  numero: string
  versao: number
  emitido_em: string
  assinado_em: string | null
  cancelado_em: string | null
  dados: DadosContrato
}

/** Cópia congelada de tudo o que aparece no contrato no momento da emissão. */
export interface DadosContrato {
  modelo: string
  data_pedido: string
  atendente: string
  /** Prazo do saldo antes do evento, citado na cláusula 3. */
  dias_saldo: number
  empresa: Pick<Empresa, 'nome' | 'razao_social' | 'cnpj' | 'telefones' | 'email_contato' | 'endereco' | 'cidade_foro' | 'banco_nome' | 'banco_agencia' | 'banco_conta' | 'banco_favorecido' | 'pix_chave'>
  cliente: { nome: string; cpf_cnpj: string | null; telefone: string | null; endereco: string | null; cidade: string | null }
  evento: { titulo: string; data_evento: string; local_nome: string | null; local_endereco: string | null; entrega_em: string | null; devolucao_em: string | null }
  itens: { codigo: string; descricao: string; quantidade: number; valor_unitario: number }[]
  parcelas: { vencimento: string; descricao: string; valor: number; situacao: 'Pago' | 'Pendente'; forma: string }[]
  totais: { valor_servicos: number; extras: number; total: number; pago: number; pendente: number }
}
