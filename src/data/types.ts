export type TipoEvento = 'infantil' | 'casamento' | 'quinze_anos' | 'cha' | 'batizado' | 'corporativo' | 'outro'

export interface Cliente {
  id: string
  nome: string
  telefone: string
  email?: string
  cidade: string
  origem: 'instagram' | 'whatsapp' | 'indicacao' | 'site' | 'outro'
}

export type StatusEvento = 'confirmado' | 'pendente' | 'realizado' | 'cancelado'

export interface Evento {
  id: string
  clienteId: string
  titulo: string
  tipo: TipoEvento
  tema: string
  data: string // AAAA-MM-DD
  horaMontagem: string
  horaInicio: string
  local: string
  convidados: number
  status: StatusEvento
}

export type Pacote = 'especial' | 'excepcional' | 'extraordinario' | 'exclusivo'

export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'recusado'

export interface Orcamento {
  id: string
  numero: number
  clienteId: string
  eventoId?: string
  pacote: Pacote
  descricao: string
  tipo: TipoEvento
  dataEvento: string
  valor: number
  sinal: number
  status: StatusOrcamento
  criadoEm: string
}

export type StatusOS = 'a_preparar' | 'separado' | 'em_montagem' | 'concluida'

export interface OrdemServico {
  id: string
  numero: number
  eventoId: string
  status: StatusOS
  equipe: string[]
  checklist: { item: string; feito: boolean }[]
}

export type CategoriaItem = 'paineis' | 'mobiliario' | 'boleiras' | 'bandejas' | 'arranjos' | 'tecidos' | 'iluminacao' | 'consumo'

export type Conservacao = 'otimo' | 'bom' | 'reparo'

export interface ItemEstoque {
  id: string
  nome: string
  categoria: CategoriaItem
  quantidade: number
  valorUnitario: number
  volumeLitros: number // volume unitário, para planejar transporte
  cor: string
  neutra: boolean // peça neutra (combina com vários temas) ou tematizada
  local: string
  conservacao: Conservacao
}
