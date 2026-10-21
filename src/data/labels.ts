import type { CategoriaItem, Conservacao, StatusEvento, StatusOrcamento, StatusOS, TipoEvento } from './types'

export const tipoEventoLabel: Record<TipoEvento, string> = {
  infantil: 'Festa infantil',
  casamento: 'Casamento',
  quinze_anos: '15 anos',
  cha: 'Chá',
  batizado: 'Batizado',
  corporativo: 'Corporativo',
  outro: 'Outro',
}

export const tipoEventoCor: Record<TipoEvento, string> = {
  infantil: 'bg-amber-100 text-amber-800',
  casamento: 'bg-brand-100 text-brand-700',
  quinze_anos: 'bg-violet-100 text-violet-800',
  cha: 'bg-sky-100 text-sky-800',
  batizado: 'bg-teal-100 text-teal-800',
  corporativo: 'bg-slate-100 text-slate-700',
  outro: 'bg-stone-100 text-stone-700',
}

export const statusEventoLabel: Record<StatusEvento, string> = {
  confirmado: 'Confirmado',
  pendente: 'Aguardando sinal',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
}

export const statusOrcamentoLabel: Record<StatusOrcamento, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
}

export const statusOrcamentoCor: Record<StatusOrcamento, string> = {
  rascunho: 'bg-stone-100 text-stone-700',
  enviado: 'bg-sky-100 text-sky-800',
  aprovado: 'bg-emerald-100 text-emerald-800',
  recusado: 'bg-rose-100 text-rose-700',
}

export const statusOSLabel: Record<StatusOS, string> = {
  a_preparar: 'A preparar',
  separado: 'Itens separados',
  em_montagem: 'Em montagem',
  concluida: 'Concluída',
}

export const statusOSCor: Record<StatusOS, string> = {
  a_preparar: 'bg-amber-100 text-amber-800',
  separado: 'bg-sky-100 text-sky-800',
  em_montagem: 'bg-brand-100 text-brand-700',
  concluida: 'bg-emerald-100 text-emerald-800',
}

export const categoriaLabel: Record<CategoriaItem, string> = {
  paineis: 'Painéis',
  mobiliario: 'Mobiliário',
  boleiras: 'Boleiras',
  bandejas: 'Bandejas',
  arranjos: 'Arranjos',
  tecidos: 'Tecidos',
  iluminacao: 'Iluminação',
  letreiros: 'Letreiros',
  consumo: 'Consumo',
}

export const conservacaoLabel: Record<Conservacao, string> = {
  otimo: 'Ótimo',
  bom: 'Bom',
  reparo: 'Precisa reparo',
}
