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
}

export interface Recorrencia extends Padrao {
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
