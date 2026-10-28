import { describe, expect, it } from 'vitest'
import { custoFixoMensal, fluxoDeCaixa, folego, lucroEvento, lucroPorArea, parcelasSugeridas, podeRetirar, primeiroMesNegativo, resumoMes } from './calculos'
import { cnpjValido, cpfValido, esquemaCliente, esquemaLancamento, valorEmReais } from '../data/esquemas'
import { addMes, fimMes, mascararDoc, nomeMes } from './format'
import type { Categoria, Lancamento, Recorrencia, ResultadoEvento } from '../data/tipos'

const base = { empresa_id: 'e', criado_em: '', atualizado_em: '', criado_por: null, excluido_em: null }
const cat = (id: string, natureza: Categoria['natureza']): Categoria => ({
  ...base, id, nome: id, tipo: natureza === 'receita' ? 'entrada' : 'saida', natureza, fonte: null, ativa: true,
})
const categorias = [cat('dec', 'receita'), cat('flores', 'variavel'), cat('aluguel', 'fixo'), cat('ret', 'retirada')]
let n = 0
const lanc = (tipo: 'entrada' | 'saida', valor: number, cat: string, venc: string, pago: string | null): Lancamento => ({
  ...base, id: `l${++n}`, tipo, valor, categoria_id: cat, conta_id: 'c', data_vencimento: venc, data_pagamento: pago,
  evento_id: null, recorrencia_id: null, descricao: null,
})

describe('resumo do mês', () => {
  const ls = [
    lanc('entrada', 3000, 'dec', '2026-10-05', '2026-10-05'),
    lanc('entrada', 1000, 'dec', '2026-10-30', null), // previsto: não conta
    lanc('saida', 500, 'flores', '2026-10-03', '2026-10-03'),
    lanc('saida', 1200, 'aluguel', '2026-10-05', '2026-10-05'),
    lanc('saida', 800, 'ret', '2026-10-10', '2026-10-10'),
    lanc('saida', 99, 'flores', '2026-09-30', '2026-09-30'), // outro mês
  ]
  const r = resumoMes(ls, categorias, '2026-10')
  it('lucro não desconta a retirada da proprietária', () => {
    expect(r.entradas).toBe(3000)
    expect(r.custosVariaveis).toBe(500)
    expect(r.custosFixos).toBe(1200)
    expect(r.lucro).toBe(1300)
    expect(r.retiradas).toBe(800)
    expect(r.ficouNaEmpresa).toBe(500)
  })
  it('ignora lançamento excluído', () => {
    const exc = { ...lanc('entrada', 999, 'dec', '2026-10-01', '2026-10-01'), excluido_em: '2026-10-02' }
    expect(resumoMes([...ls, exc], categorias, '2026-10').entradas).toBe(3000)
  })
})

describe('fôlego e retirada', () => {
  it('fôlego = saldo ÷ (fixos + retirada mínima)', () => {
    expect(folego(10_000, 1500, 2500)).toBe(2.5)
    expect(folego(-100, 1500, 2500)).toBe(0)
  })
  it('pode retirar respeita lucro e reserva', () => {
    expect(podeRetirar(5000, 2000, 10_000, 4500)).toBe(3000)
    expect(podeRetirar(5000, 2000, 6000, 4500)).toBe(1500)
    expect(podeRetirar(1000, 2000, 6000, 4500)).toBe(0)
  })
  it('custo fixo mensal soma só as recorrências ativas', () => {
    const rec = (valor: number, ativa: boolean): Recorrencia => ({
      ...base, id: String(valor), descricao: 'x', valor, dia_vencimento: 5, categoria_id: 'aluguel', conta_id: 'c', ativa,
    })
    expect(custoFixoMensal([rec(1200, true), rec(180, true), rec(500, false)])).toBe(1380)
  })
})

describe('fluxo de caixa', () => {
  const ls = [
    lanc('entrada', 2000, 'dec', '2026-09-10', '2026-09-10'),
    lanc('saida', 500, 'flores', '2026-10-02', '2026-10-02'),
    lanc('entrada', 3000, 'dec', '2026-11-16', null),
    lanc('saida', 1200, 'aluguel', '2026-12-05', null),
  ]
  const f = fluxoDeCaixa({ lancamentos: ls, saldoHoje: 4000, hoje: '2026-10-28', mesesAntes: 1, mesesDepois: 3, retiradaMinima: 1000 })
  it('reconstrói o passado a partir do saldo de hoje', () => {
    expect(f[0]).toMatchObject({ ym: '2026-09', saldoFinal: 4500, previsto: false })
    expect(f[1]).toMatchObject({ ym: '2026-10', saldoFinal: 4000, previsto: false })
  })
  it('projeta o futuro com previstos e retirada mínima', () => {
    expect(f[2]).toMatchObject({ ym: '2026-11', entradas: 3000, saidas: 1000, saldoFinal: 6000, previsto: true })
    expect(f[3]).toMatchObject({ ym: '2026-12', saidas: 2200, saldoFinal: 3800 })
    expect(f[4]).toMatchObject({ ym: '2027-01', saldoFinal: 2800 })
    expect(primeiroMesNegativo(f)).toBeUndefined()
    const apertado = fluxoDeCaixa({ lancamentos: [], saldoHoje: 1500, hoje: '2026-10-28', mesesAntes: 0, mesesDepois: 3, retiradaMinima: 1000 })
    expect(primeiroMesNegativo(apertado)?.ym).toBe('2026-12')
  })
})

describe('eventos e áreas', () => {
  const r = (fonte: ResultadoEvento['fonte'], valor: number, recebido: number, aReceber: number, custos: number): ResultadoEvento => ({
    empresa_id: 'e', evento_id: fonte + valor, titulo: 'x', fonte, data_evento: '2026-10-01', valor_fechado: valor, recebido, a_receber: aReceber, custos,
  })
  it('lucro do evento usa o valor fechado; workshop usa o arrecadado', () => {
    expect(lucroEvento(r('decoracao', 4000, 1200, 2800, 1000))).toMatchObject({ receita: 4000, lucro: 3000, margem: 0.75 })
    expect(lucroEvento(r('workshop', 0, 1680, 0, 1250))).toMatchObject({ receita: 1680, lucro: 430 })
  })
  it('agrupa por área', () => {
    const a = lucroPorArea([r('decoracao', 4000, 0, 0, 1000), r('decoracao', 2000, 0, 0, 500), r('assessoria', 5000, 0, 0, 600)])
    expect(a.find((x) => x.fonte === 'decoracao')).toMatchObject({ receita: 6000, custos: 1500, lucro: 4500 })
    expect(a.find((x) => x.fonte === 'workshop')).toMatchObject({ receita: 0, margem: 0 })
  })
  it('parcelas sugeridas: 30% de entrada', () => {
    expect(parcelasSugeridas(5770, 30)).toEqual({ entrada: 1731, saldo: 4039 })
  })
})

describe('validação', () => {
  it('valor em reais aceita formatos brasileiros', () => {
    expect(valorEmReais.parse('1.250,50')).toBe(1250.5)
    expect(valorEmReais.parse('1250,5')).toBe(1250.5)
    expect(valorEmReais.parse('R$ 3.100')).toBe(3100)
    expect(valorEmReais.safeParse('abc').success).toBe(false)
  })
  it('CPF e CNPJ com dígito verificador', () => {
    expect(cpfValido('52998224725')).toBe(true)
    expect(cpfValido('52998224724')).toBe(false)
    expect(cpfValido('11111111111')).toBe(false)
    expect(cnpjValido('11222333000181')).toBe(true)
    expect(cnpjValido('11222333000180')).toBe(false)
  })
  it('cliente: telefone com DDD e documento válido', () => {
    const ok = esquemaCliente.safeParse({ nome: 'Camila Ferreira', telefone: '(11) 98765-4321', email: '', endereco: '', cidade: 'Louveira', origem: 'instagram', cpf_cnpj: '529.982.247-25' })
    expect(ok.success && ok.data.telefone).toBe('11987654321')
    expect(ok.success && ok.data.cpf_cnpj).toBe('52998224725')
    const ruim = esquemaCliente.safeParse({ nome: 'Ca', telefone: '1234', email: 'x', endereco: '', cidade: '', origem: 'outra', cpf_cnpj: '123' })
    expect(ruim.success).toBe(false)
  })
  it('lançamento exige valor positivo e categoria', () => {
    const r = esquemaLancamento.safeParse({ tipo: 'saida', valor: '0', categoria_id: '', conta_id: '', data: '2026-10-28', pago: true })
    expect(r.success).toBe(false)
  })
})

describe('formatos', () => {
  it('meses e máscara de documento', () => {
    expect(addMes('2026-12', 1)).toBe('2027-01')
    expect(addMes('2026-01', -1)).toBe('2025-12')
    expect(fimMes('2027-02')).toBe('2027-02-28')
    expect(nomeMes('2026-10')).toBe('outubro de 2026')
    expect(mascararDoc('52998224725')).toBe('***.982.247-**')
    expect(mascararDoc('11222333000181')).toBe('**.***.333/0001-**')
  })
})

import { reaisPorExtenso } from './extenso'
import { gerarCSV } from '../export/planilha'

describe('valor por extenso', () => {
  it('recibos', () => {
    expect(reaisPorExtenso(1)).toBe('um real')
    expect(reaisPorExtenso(100)).toBe('cem reais')
    expect(reaisPorExtenso(101.01)).toBe('cento e um reais e um centavo')
    expect(reaisPorExtenso(1250.5)).toBe('mil, duzentos e cinquenta reais e cinquenta centavos')
    expect(reaisPorExtenso(1100)).toBe('mil e cem reais')
    expect(reaisPorExtenso(2770)).toBe('dois mil, setecentos e setenta reais')
    expect(reaisPorExtenso(5770)).toBe('cinco mil, setecentos e setenta reais')
    expect(reaisPorExtenso(21000)).toBe('vinte e um mil reais')
    expect(reaisPorExtenso(1000000)).toBe('um milhão de reais')
    expect(reaisPorExtenso(0.5)).toBe('cinquenta centavos')
  })
})

describe('CSV', () => {
  it('ponto e vírgula, vírgula decimal, BOM e proteção contra fórmula', async () => {
    const blob = gerarCSV({
      nome: 'x', titulo: 'x',
      colunas: [{ titulo: 'Descrição', chave: 'd', tipo: 'texto' }, { titulo: 'Valor', chave: 'v', tipo: 'moeda' }, { titulo: 'Data', chave: 'dt', tipo: 'data' }],
      linhas: [{ d: '=HYPERLINK("x")', v: 1250.5, dt: '2026-10-28' }, { d: 'Flores; folhas', v: -10, dt: null }],
    })
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    const linhas = new TextDecoder().decode(bytes).split('\r\n')
    expect(linhas[0]).toBe('Descrição;Valor;Data')
    expect(linhas[1]).toBe(`"'=HYPERLINK(""x"")";1250,50;28/10/2026`)
    expect(linhas[2]).toBe('"Flores; folhas";-10,00;')
  })
})
