// Exportação para Excel (.xlsx formatado) e CSV (para importar em outros sistemas).
import { dataBR, parseDate } from '../lib/format'

export type TipoColuna = 'texto' | 'moeda' | 'data' | 'numero' | 'pct'

export interface Coluna {
  titulo: string
  chave: string
  tipo: TipoColuna
  largura?: number
  /** Soma a coluna na linha de total (só moeda e número). */
  total?: boolean
}

export type Celula = string | number | null | undefined

export interface Aba {
  nome: string
  titulo: string
  subtitulo?: string
  colunas: Coluna[]
  linhas: Record<string, Celula>[]
  /** Linhas de resumo abaixo da tabela, ex.: ["Lucro do mês", 8029]. */
  resumo?: [string, number][]
}

export function baixarArquivo(conteudo: Blob, nome: string) {
  // Na prévia, mostra o arquivo na tela também: algumas páginas de teste bloqueiam downloads.
  if (import.meta.env.MODE === 'demo') window.dispatchEvent(new CustomEvent('demo-arquivo', { detail: { blob: conteudo, nome } }))
  const url = URL.createObjectURL(conteudo)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export const nomeArquivo = (base: string, ext: string) =>
  `${base.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').toLowerCase()}.${ext}`

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------
const ROSA = 'FFB24A77'
const ROSA_CLARO = 'FFFFF8FA'
const TINTA = 'FF222220'
const CINZA = 'FF796B70'
const BORDA = 'FFF0E2E8'
const FORMATO: Record<TipoColuna, string | undefined> = {
  moeda: '"R$" #,##0.00;[Red]-"R$" #,##0.00',
  data: 'dd/mm/yyyy',
  numero: '#,##0',
  pct: '0%',
  texto: undefined,
}

export async function gerarExcel(abas: Aba[], empresa: string): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = `${empresa} · sistema de gestão`
  wb.created = new Date()

  for (const aba of abas) {
    const ws = wb.addWorksheet(aba.nome.slice(0, 31), {
      views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 } },
      headerFooter: { oddFooter: `&L${empresa}&RPágina &P de &N` },
    })
    const n = aba.colunas.length
    ws.columns = aba.colunas.map((c) => ({ key: c.chave, width: c.largura ?? (c.tipo === 'texto' ? 28 : c.tipo === 'data' ? 13 : 16) }))

    ws.mergeCells(1, 1, 1, n)
    const t = ws.getCell(1, 1)
    t.value = `${empresa} · ${aba.titulo}`
    t.font = { name: 'Arial', size: 15, bold: true, color: { argb: TINTA } }
    ws.getRow(1).height = 26

    ws.mergeCells(2, 1, 2, n)
    const st = ws.getCell(2, 1)
    st.value = [aba.subtitulo, `Gerado em ${dataBR(new Date().toISOString().slice(0, 10))}`].filter(Boolean).join(' · ')
    st.font = { name: 'Arial', size: 10, color: { argb: CINZA } }

    const cab = ws.getRow(4)
    aba.colunas.forEach((c, i) => {
      const cel = cab.getCell(i + 1)
      cel.value = c.titulo
      cel.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
      cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROSA } }
      cel.alignment = { vertical: 'middle', horizontal: c.tipo === 'texto' ? 'left' : 'right', wrapText: true }
    })
    cab.height = 22

    aba.linhas.forEach((linha, li) => {
      const row = ws.getRow(5 + li)
      aba.colunas.forEach((c, i) => {
        const cel = row.getCell(i + 1)
        const v = linha[c.chave]
        cel.value = v == null || v === '' ? null : c.tipo === 'data' && typeof v === 'string' ? parseDate(v) : v
        cel.numFmt = FORMATO[c.tipo] ?? '@'
        cel.font = { name: 'Arial', size: 10, color: { argb: TINTA } }
        cel.alignment = { vertical: 'middle', horizontal: c.tipo === 'texto' ? 'left' : 'right' }
        cel.border = { bottom: { style: 'thin', color: { argb: BORDA } } }
        if (li % 2 === 1) cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROSA_CLARO } }
      })
    })

    const ultima = 4 + aba.linhas.length
    if (aba.linhas.length > 0) {
      ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: ultima, column: n } }
      if (aba.colunas.some((c) => c.total)) {
        const tot = ws.getRow(ultima + 1)
        tot.getCell(1).value = 'Total'
        aba.colunas.forEach((c, i) => {
          const cel = tot.getCell(i + 1)
          if (c.total) {
            const letra = ws.getColumn(i + 1).letter
            const valor = aba.linhas.reduce((s, l) => s + (Number(l[c.chave]) || 0), 0)
            cel.value = { formula: `SUBTOTAL(109,${letra}5:${letra}${ultima})`, result: valor }
            cel.numFmt = FORMATO[c.tipo] ?? '@'
            cel.alignment = { horizontal: 'right' }
          }
          cel.font = { name: 'Arial', size: 10, bold: true, color: { argb: TINTA } }
          cel.border = { top: { style: 'medium', color: { argb: TINTA } } }
        })
      }
    }

    let r = ultima + (aba.colunas.some((c) => c.total) ? 3 : 2)
    for (const [rotulo, valor] of aba.resumo ?? []) {
      const a = ws.getCell(r, 1)
      a.value = rotulo
      a.font = { name: 'Arial', size: 10, bold: true }
      const b = ws.getCell(r, 2)
      b.value = valor
      b.numFmt = FORMATO.moeda!
      b.font = { name: 'Arial', size: 10, bold: true }
      r++
    }
  }

  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

// ---------------------------------------------------------------------------
// CSV (padrão do Excel brasileiro: ponto e vírgula, vírgula decimal, UTF-8 com BOM)
// ---------------------------------------------------------------------------
function celulaCSV(v: Celula, tipo: TipoColuna): string {
  if (v == null || v === '') return ''
  let s: string
  if (tipo === 'moeda' || tipo === 'numero') s = Number(v).toFixed(tipo === 'moeda' ? 2 : 0).replace('.', ',')
  else if (tipo === 'pct') s = (Number(v) * 100).toFixed(0).replace('.', ',') + '%'
  else if (tipo === 'data' && typeof v === 'string') s = dataBR(v)
  else s = String(v)
  // Proteção contra fórmula maliciosa ao abrir no Excel ("=", "+", "-", "@" no começo do texto).
  if (tipo === 'texto' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function gerarCSV(aba: Aba): Blob {
  const linhas = [
    aba.colunas.map((c) => celulaCSV(c.titulo, 'texto')).join(';'),
    ...aba.linhas.map((l) => aba.colunas.map((c) => celulaCSV(l[c.chave], c.tipo)).join(';')),
  ]
  return new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' })
}
