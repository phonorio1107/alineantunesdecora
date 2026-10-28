// Monta os arquivos (PDF, Excel, CSV) a partir dos dados das telas e entrega para download.
// PDF e Excel são carregados só quando usados, para o sistema abrir rápido no celular.
import type { Cliente, Contrato, DadosContrato, Empresa, Evento, InscricaoWorkshop, Lancamento } from '../data/tipos'
import type { MesFluxo, ResumoMes } from '../lib/calculos'
import { lucroEvento } from '../lib/calculos'
import { dataBR, formatTelefone, mascararDoc, nomeMes } from '../lib/format'
import type { ResultadoEvento } from '../data/tipos'
import { baixarArquivo, gerarCSV, gerarExcel, nomeArquivo, type Aba } from './planilha'

const nomeEmpresa = (e: Partial<Empresa>) => e.nome ?? 'Aline Antunes Decora'
const FONTE = { decoracao: 'Decoração', assessoria: 'Assessoria', workshop: 'Workshop' } as const

// ---------------------------------------------------------------------------
// Planilhas
// ---------------------------------------------------------------------------
export function abaLancamentos(lancamentos: Lancamento[], nomeCategoria: (id: string) => string, titulos: Map<string, string>, contas: Map<string, string>, ym: string): Aba {
  return {
    nome: 'Lançamentos',
    titulo: `Lançamentos de ${nomeMes(ym)}`,
    subtitulo: 'Valores de saída aparecem negativos',
    colunas: [
      { titulo: 'Vencimento', chave: 'venc', tipo: 'data' },
      { titulo: 'Pagamento', chave: 'pag', tipo: 'data' },
      { titulo: 'Tipo', chave: 'tipo', tipo: 'texto', largura: 10 },
      { titulo: 'Descrição', chave: 'desc', tipo: 'texto', largura: 34 },
      { titulo: 'Categoria', chave: 'cat', tipo: 'texto', largura: 24 },
      { titulo: 'Evento', chave: 'ev', tipo: 'texto', largura: 34 },
      { titulo: 'Conta', chave: 'conta', tipo: 'texto', largura: 16 },
      { titulo: 'Situação', chave: 'sit', tipo: 'texto', largura: 12 },
      { titulo: 'Valor', chave: 'valor', tipo: 'moeda', total: true },
    ],
    linhas: lancamentos.map((l) => ({
      venc: l.data_vencimento,
      pag: l.data_pagamento,
      tipo: l.tipo === 'entrada' ? 'Entrada' : 'Saída',
      desc: l.descricao ?? nomeCategoria(l.categoria_id),
      cat: nomeCategoria(l.categoria_id),
      ev: l.evento_id ? titulos.get(l.evento_id) ?? '' : '',
      conta: contas.get(l.conta_id) ?? '',
      sit: l.data_pagamento ? (l.tipo === 'entrada' ? 'Recebido' : 'Pago') : 'Previsto',
      valor: l.tipo === 'entrada' ? Number(l.valor) : -Number(l.valor),
    })),
  }
}

export function abaFechamento(r: ResumoMes, nomeCategoria: (id: string) => string, ym: string): Aba {
  const linhas = [
    ...r.entradasPorCategoria.map(([c, v]) => ({ grupo: 'Entradas', item: nomeCategoria(c), valor: v })),
    ...r.variaveisPorCategoria.map(([c, v]) => ({ grupo: 'Custos dos eventos', item: nomeCategoria(c), valor: -v })),
    ...r.fixosPorCategoria.map(([c, v]) => ({ grupo: 'Custos fixos', item: nomeCategoria(c), valor: -v })),
  ]
  return {
    nome: 'Fechamento',
    titulo: `Fechamento de ${nomeMes(ym)}`,
    subtitulo: 'Regime de caixa',
    colunas: [
      { titulo: 'Grupo', chave: 'grupo', tipo: 'texto', largura: 22 },
      { titulo: 'Categoria', chave: 'item', tipo: 'texto', largura: 32 },
      { titulo: 'Valor', chave: 'valor', tipo: 'moeda', total: true },
    ],
    linhas,
    resumo: [
      ['Entradas', r.entradas],
      ['Custos dos eventos', -r.custosVariaveis],
      ['Custos fixos', -r.custosFixos],
      ['Lucro do mês', r.lucro],
      ['Retiradas da proprietária', -r.retiradas],
      ['Ficou na empresa', r.ficouNaEmpresa],
    ],
  }
}

export function abaFluxo(fluxo: MesFluxo[]): Aba {
  return {
    nome: 'Fluxo de caixa',
    titulo: 'Fluxo de caixa',
    subtitulo: 'Meses previstos somam parcelas a receber, custos fixos e a retirada mínima',
    colunas: [
      { titulo: 'Mês', chave: 'mes', tipo: 'texto', largura: 26 },
      { titulo: 'Situação', chave: 'sit', tipo: 'texto', largura: 12 },
      { titulo: 'Entradas', chave: 'e', tipo: 'moeda' },
      { titulo: 'Saídas', chave: 's', tipo: 'moeda' },
      { titulo: 'Saldo no fim do mês', chave: 'saldo', tipo: 'moeda', largura: 20 },
    ],
    linhas: fluxo.map((m) => ({ mes: nomeMes(m.ym), sit: m.previsto ? 'Previsto' : 'Realizado', e: m.entradas, s: m.saidas, saldo: m.saldoFinal })),
  }
}

export function abaEventos(resultados: ResultadoEvento[]): Aba {
  return {
    nome: 'Eventos',
    titulo: 'Lucro por evento',
    colunas: [
      { titulo: 'Data', chave: 'data', tipo: 'data' },
      { titulo: 'Evento', chave: 'titulo', tipo: 'texto', largura: 40 },
      { titulo: 'Área', chave: 'area', tipo: 'texto', largura: 14 },
      { titulo: 'Receita', chave: 'receita', tipo: 'moeda', total: true },
      { titulo: 'Recebido', chave: 'recebido', tipo: 'moeda', total: true },
      { titulo: 'A receber', chave: 'areceber', tipo: 'moeda', total: true },
      { titulo: 'Custos', chave: 'custos', tipo: 'moeda', total: true },
      { titulo: 'Lucro', chave: 'lucro', tipo: 'moeda', total: true },
      { titulo: 'Margem', chave: 'margem', tipo: 'pct', largura: 10 },
    ],
    linhas: [...resultados]
      .sort((a, b) => a.data_evento.localeCompare(b.data_evento))
      .map((r) => {
        const l = lucroEvento(r)
        return { data: r.data_evento, titulo: r.titulo, area: FONTE[r.fonte], receita: l.receita, recebido: Number(r.recebido), areceber: Number(r.a_receber), custos: l.custos, lucro: l.lucro, margem: l.margem }
      }),
  }
}

/** Clientes: o CPF/CNPJ sai mascarado; para o número completo, abra o cadastro. */
export function abaClientes(clientes: Cliente[], docs: Map<string, string>): Aba {
  const ORIGEM = { instagram: 'Instagram', indicacao: 'Indicação', whatsapp: 'WhatsApp', site: 'Site', outra: 'Outra' }
  return {
    nome: 'Clientes',
    titulo: 'Clientes',
    subtitulo: 'CPF/CNPJ mascarado por proteção de dados',
    colunas: [
      { titulo: 'Nome', chave: 'nome', tipo: 'texto', largura: 32 },
      { titulo: 'Telefone', chave: 'tel', tipo: 'texto', largura: 18 },
      { titulo: 'E-mail', chave: 'email', tipo: 'texto', largura: 30 },
      { titulo: 'Cidade', chave: 'cidade', tipo: 'texto', largura: 18 },
      { titulo: 'Origem', chave: 'origem', tipo: 'texto', largura: 14 },
      { titulo: 'CPF/CNPJ', chave: 'doc', tipo: 'texto', largura: 20 },
    ],
    linhas: clientes.map((c) => ({ nome: c.nome, tel: formatTelefone(c.telefone), email: c.email, cidade: c.cidade, origem: ORIGEM[c.origem], doc: mascararDoc(docs.get(c.id)) })),
  }
}

export async function baixarExcel(abas: Aba[], empresa: Partial<Empresa>, base: string) {
  baixarArquivo(await gerarExcel(abas, nomeEmpresa(empresa)), nomeArquivo(base, 'xlsx'))
}

export function baixarCSV(aba: Aba, base: string) {
  baixarArquivo(gerarCSV(aba), nomeArquivo(base, 'csv'))
}

// ---------------------------------------------------------------------------
// PDFs
// ---------------------------------------------------------------------------
const pdfs = () => import('../pdf')

export async function baixarPdfFechamento(p: Parameters<Awaited<ReturnType<typeof pdfs>>['pdfFechamento']>[0]) {
  const m = await pdfs()
  baixarArquivo(await m.pdfFechamento(p), nomeArquivo(`fechamento-${p.ym}`, 'pdf'))
}

export async function baixarPdfFluxo(p: Parameters<Awaited<ReturnType<typeof pdfs>>['pdfFluxo']>[0]) {
  const m = await pdfs()
  baixarArquivo(await m.pdfFluxo(p), nomeArquivo(`fluxo-de-caixa-${new Date().toISOString().slice(0, 10)}`, 'pdf'))
}

export async function baixarPdfEvento(p: {
  empresa: Partial<Empresa>; evento: Evento; clienteNome: string | null; lancamentos: Lancamento[]; nomeCategoria: (id: string) => string;
  resultado?: ResultadoEvento; inscricoes?: InscricaoWorkshop[]
}) {
  const m = await pdfs()
  const parcelas = p.lancamentos.filter((l) => l.tipo === 'entrada').sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
  const custos = p.lancamentos.filter((l) => l.tipo === 'saida')
  const receita = p.resultado ? lucroEvento(p.resultado).receita : Number(p.evento.valor_fechado)
  const STATUS = { reservada: 'Reservada', paga: 'Paga', cancelada: 'Cancelada' }
  const blob = await m.pdfResumoEvento({
    empresa: p.empresa, evento: p.evento, clienteNome: p.clienteNome, parcelas, custos, nomeCategoria: p.nomeCategoria, receita,
    inscritas: p.inscricoes?.map((i) => ({ nome: i.nome, status: STATUS[i.status] })),
  })
  baixarArquivo(blob, nomeArquivo(`resumo-${p.evento.data_evento}-${p.evento.titulo}`, 'pdf'))
}

export async function baixarRecibo(p: { empresa: Partial<Empresa>; lancamento: Lancamento; evento: Evento | null; clienteNome: string; clienteDoc: string | null }) {
  const m = await pdfs()
  const l = p.lancamento
  const data = l.data_pagamento ?? l.data_vencimento
  const numero = `REC-${data.slice(2, 4)}${data.slice(5, 7)}${data.slice(8, 10)}-${l.id.slice(0, 4).toUpperCase()}`
  const parte = (l.descricao ?? 'pagamento').replace(/^./, (c) => c.toLowerCase())
  const referente = p.evento ? `${parte} do evento “${p.evento.titulo}” de ${dataBR(p.evento.data_evento)}` : parte
  const blob = await m.pdfRecibo({ empresa: p.empresa, r: { numero, valor: Number(l.valor), data, clienteNome: p.clienteNome, clienteDoc: p.clienteDoc, referente, forma: 'transferência ou Pix' } })
  baixarArquivo(blob, nomeArquivo(`recibo-${numero}`, 'pdf'))
}

export async function baixarContrato(c: Pick<Contrato, 'numero' | 'versao'> & { dados: DadosContrato }) {
  const m = await pdfs()
  baixarArquivo(await m.pdfContrato(c), nomeArquivo(`contrato-${c.numero.replace('/', '-')}-v${c.versao}-${c.dados.cliente.nome}`, 'pdf'))
}
