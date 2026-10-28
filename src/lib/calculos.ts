// Os números que o sistema responde para a Aline (docs/fase-2-modelagem.md, seção 1).
// Funções puras: recebem os dados já carregados e não falam com o banco.
import type { Categoria, FonteReceita, Lancamento, Recorrencia, ResultadoEvento } from '../data/tipos'
import { addMes, mesDe } from './format'

const soma = <T,>(lista: T[], valor: (x: T) => number) => lista.reduce((t, x) => t + valor(x), 0)
const arred = (v: number) => Math.round(v * 100) / 100

export interface ResumoMes {
  entradas: number
  custosVariaveis: number
  custosFixos: number
  retiradas: number
  /** Entradas menos custos, sem contar as retiradas da proprietária. */
  lucro: number
  /** O que ficou na empresa depois das retiradas. */
  ficouNaEmpresa: number
  entradasPorCategoria: [string, number][]
  variaveisPorCategoria: [string, number][]
  fixosPorCategoria: [string, number][]
}

const agrupar = (lista: Lancamento[]) => {
  const m = new Map<string, number>()
  for (const l of lista) m.set(l.categoria_id, (m.get(l.categoria_id) ?? 0) + Number(l.valor))
  return [...m.entries()].map(([c, v]) => [c, arred(v)] as [string, number]).sort((a, b) => b[1] - a[1])
}

/** Regime de caixa: conta o que foi pago ou recebido dentro do mês. */
export function resumoMes(lancamentos: Lancamento[], categorias: Categoria[], ym: string): ResumoMes {
  const natureza = new Map(categorias.map((c) => [c.id, c.natureza]))
  const pagos = lancamentos.filter((l) => !l.excluido_em && l.data_pagamento && mesDe(l.data_pagamento) === ym)
  const entradas = pagos.filter((l) => l.tipo === 'entrada')
  const saidas = pagos.filter((l) => l.tipo === 'saida')
  const variaveis = saidas.filter((l) => natureza.get(l.categoria_id) === 'variavel')
  const fixos = saidas.filter((l) => natureza.get(l.categoria_id) === 'fixo')
  const retiradas = saidas.filter((l) => natureza.get(l.categoria_id) === 'retirada')
  const r = {
    entradas: arred(soma(entradas, (l) => Number(l.valor))),
    custosVariaveis: arred(soma(variaveis, (l) => Number(l.valor))),
    custosFixos: arred(soma(fixos, (l) => Number(l.valor))),
    retiradas: arred(soma(retiradas, (l) => Number(l.valor))),
  }
  const lucro = arred(r.entradas - r.custosVariaveis - r.custosFixos)
  return {
    ...r,
    lucro,
    ficouNaEmpresa: arred(lucro - r.retiradas),
    entradasPorCategoria: agrupar(entradas),
    variaveisPorCategoria: agrupar(variaveis),
    fixosPorCategoria: agrupar(fixos),
  }
}

export const custoFixoMensal = (recorrencias: Recorrencia[]) =>
  arred(soma(recorrencias.filter((r) => r.ativa && !r.excluido_em), (r) => Number(r.valor)))

/** Quantos meses a empresa aguenta sem receber nada: saldo ÷ (custos fixos + retirada mínima). */
export function folego(saldo: number, fixosMensais: number, retiradaMinima: number) {
  const gastoMensal = fixosMensais + retiradaMinima
  if (gastoMensal <= 0) return saldo > 0 ? Infinity : 0
  return Math.max(0, saldo / gastoMensal)
}

/** Quanto ainda dá para retirar no mês sem passar do lucro e sem furar a reserva. */
export function podeRetirar(lucroMes: number, retiradoMes: number, saldo: number, reserva: number) {
  return arred(Math.max(0, Math.min(lucroMes - retiradoMes, saldo - reserva)))
}

export interface MesFluxo {
  ym: string
  entradas: number
  saidas: number
  saldoFinal: number
  previsto: boolean
}

/**
 * Fluxo de caixa: meses passados (realizado) e futuros (previsto).
 * O passado é reconstruído a partir do saldo de hoje, desfazendo os pagamentos posteriores a cada mês.
 * O futuro soma os lançamentos ainda não pagos e uma retirada mínima por mês.
 */
export function fluxoDeCaixa(params: {
  lancamentos: Lancamento[]
  saldoHoje: number
  hoje: string
  mesesAntes: number
  mesesDepois: number
  retiradaMinima: number
  /** Data do saldo inicial de cada conta: pagamentos anteriores a ela já estão dentro do saldo inicial. */
  inicioContas?: Map<string, string>
}): MesFluxo[] {
  const { lancamentos, saldoHoje, hoje, mesesAntes, mesesDepois, retiradaMinima, inicioContas } = params
  const ativos = lancamentos.filter((l) => !l.excluido_em)
  const entraNoSaldo = (l: Lancamento) => !inicioContas?.get(l.conta_id) || (l.data_pagamento ?? '') >= inicioContas.get(l.conta_id)!
  const sinal = (l: Lancamento) => (l.tipo === 'entrada' ? Number(l.valor) : -Number(l.valor))
  const mesAtual = mesDe(hoje)
  const out: MesFluxo[] = []

  for (let k = -mesesAntes; k <= 0; k++) {
    const ym = addMes(mesAtual, k)
    const pagos = ativos.filter((l) => l.data_pagamento && mesDe(l.data_pagamento) === ym)
    const depois = ativos.filter((l) => l.data_pagamento && mesDe(l.data_pagamento) > ym && entraNoSaldo(l))
    let saldoFinal = saldoHoje - soma(depois, sinal)
    let entradas = soma(pagos.filter((l) => l.tipo === 'entrada'), (l) => Number(l.valor))
    let saidas = soma(pagos.filter((l) => l.tipo === 'saida'), (l) => Number(l.valor))
    if (k === 0) {
      // Mês atual: o que já entrou e saiu + o que ainda está previsto até o fim do mês.
      const previstos = ativos.filter((l) => !l.data_pagamento && mesDe(l.data_vencimento) <= ym)
      entradas += soma(previstos.filter((l) => l.tipo === 'entrada'), (l) => Number(l.valor))
      saidas += soma(previstos.filter((l) => l.tipo === 'saida'), (l) => Number(l.valor))
      saldoFinal += soma(previstos, sinal)
    }
    out.push({ ym, entradas: arred(entradas), saidas: arred(saidas), saldoFinal: arred(saldoFinal), previsto: false })
  }

  let saldo = out[out.length - 1].saldoFinal
  for (let k = 1; k <= mesesDepois; k++) {
    const ym = addMes(mesAtual, k)
    const previstos = ativos.filter((l) => !l.data_pagamento && mesDe(l.data_vencimento) === ym)
    const entradas = soma(previstos.filter((l) => l.tipo === 'entrada'), (l) => Number(l.valor))
    const saidas = soma(previstos.filter((l) => l.tipo === 'saida'), (l) => Number(l.valor)) + retiradaMinima
    saldo += entradas - saidas
    out.push({ ym, entradas: arred(entradas), saidas: arred(saidas), saldoFinal: arred(saldo), previsto: true })
  }
  return out
}

export const primeiroMesNegativo = (fluxo: MesFluxo[]) => fluxo.find((m) => m.previsto && m.saldoFinal < 0)

export interface ResultadoArea {
  fonte: FonteReceita
  receita: number
  custos: number
  lucro: number
  margem: number
}

/** Lucro de cada evento: o valor fechado (ou o arrecadado, no workshop) menos os custos lançados. */
export function lucroEvento(r: ResultadoEvento) {
  const receita = r.fonte === 'workshop' ? Number(r.recebido) + Number(r.a_receber) : Number(r.valor_fechado)
  const lucro = receita - Number(r.custos)
  return { receita: arred(receita), custos: arred(Number(r.custos)), lucro: arred(lucro), margem: receita > 0 ? lucro / receita : 0 }
}

export function lucroPorArea(resultados: ResultadoEvento[]): ResultadoArea[] {
  const areas: FonteReceita[] = ['decoracao', 'assessoria', 'workshop']
  return areas.map((fonte) => {
    const doTipo = resultados.filter((r) => r.fonte === fonte).map(lucroEvento)
    const receita = arred(soma(doTipo, (x) => x.receita))
    const custos = arred(soma(doTipo, (x) => x.custos))
    const lucro = arred(receita - custos)
    return { fonte, receita, custos, lucro, margem: receita > 0 ? lucro / receita : 0 }
  })
}

/** Divide o valor do evento em entrada (percentual) e saldo, como no banco (criar_evento). */
export function parcelasSugeridas(valor: number, entradaPercentual: number) {
  const entrada = arred((valor * Math.min(100, Math.max(0, entradaPercentual))) / 100)
  return { entrada, saldo: arred(valor - entrada) }
}
