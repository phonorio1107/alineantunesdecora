import { jsPDF } from 'jspdf'
import logoUrl from '../assets/logo.png'
import { categoriaLabel, statusOSLabel, tipoEventoLabel } from '../data/labels'
import type { Cliente, Evento, ItemEstoque, OrdemServico } from '../data/types'
import { formatDate } from './format'

// Paleta da marca em RGB
const ROSA: [number, number, number] = [222, 121, 155]
const ROSA_CLARO: [number, number, number] = [253, 240, 245]
const TINTA: [number, number, number] = [43, 39, 41]
const CINZA: [number, number, number] = [105, 105, 105]
const LINHA: [number, number, number] = [240, 214, 224]

const A4 = { w: 210, h: 297 }
const M = 16 // margem lateral

async function carregarLogo(): Promise<{ data: string; w: number; h: number }> {
  const blob = await (await fetch(logoUrl)).blob()
  const data = await new Promise<string>((ok) => {
    const r = new FileReader()
    r.onload = () => ok(r.result as string)
    r.readAsDataURL(blob)
  })
  const img = await new Promise<HTMLImageElement>((ok) => {
    const i = new Image()
    i.onload = () => ok(i)
    i.src = data
  })
  return { data, w: img.naturalWidth, h: img.naturalHeight }
}

export async function gerarPdfOrdem(os: OrdemServico, evento: Evento, cliente: Cliente | undefined, acervo: ItemEstoque[]) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const logo = await carregarLogo()
  let y = 0

  const cor = (c: [number, number, number]) => doc.setTextColor(...c)
  const fonte = (estilo: 'normal' | 'bold', tamanho: number) => {
    doc.setFont('helvetica', estilo)
    doc.setFontSize(tamanho)
  }

  const cabecalho = () => {
    doc.setFillColor(...ROSA)
    doc.rect(0, 0, A4.w, 3, 'F')
    const lw = 58
    doc.addImage(logo.data, 'PNG', M, 10, lw, (lw * logo.h) / logo.w)
    fonte('bold', 9)
    cor(ROSA)
    doc.text('ORDEM DE SERVIÇO', A4.w - M, 14, { align: 'right' })
    fonte('bold', 22)
    cor(TINTA)
    doc.text(`Nº ${os.numero}`, A4.w - M, 23, { align: 'right' })
    fonte('normal', 8.5)
    cor(CINZA)
    doc.text(`Emitida em ${new Date().toLocaleDateString('pt-BR')}  ·  ${statusOSLabel[os.status]}`, A4.w - M, 29, { align: 'right' })
    doc.setDrawColor(...LINHA)
    doc.setLineWidth(0.3)
    doc.line(M, 35, A4.w - M, 35)
    y = 42
  }

  const garantirEspaco = (altura: number) => {
    if (y + altura > A4.h - 22) {
      doc.addPage()
      cabecalho()
    }
  }

  const titulo = (texto: string) => {
    garantirEspaco(16)
    if (y > 50) y += 2.5
    fonte('bold', 10)
    cor(ROSA)
    doc.text(texto.toUpperCase(), M, y, { charSpace: 0.5 })
    y += 5
  }

  cabecalho()

  // Destaque do evento
  doc.setFillColor(...ROSA_CLARO)
  doc.roundedRect(M, y, A4.w - 2 * M, 26, 3, 3, 'F')
  fonte('bold', 15)
  cor(TINTA)
  doc.text(evento.titulo, M + 6, y + 9)
  fonte('normal', 10)
  cor(CINZA)
  doc.text(`${tipoEventoLabel[evento.tipo]}  ·  Tema: ${evento.tema || '—'}`, M + 6, y + 15)
  fonte('bold', 10.5)
  cor(TINTA)
  const dataLonga = formatDate(evento.data, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(dataLonga.charAt(0).toUpperCase() + dataLonga.slice(1), M + 6, y + 21.5)
  y += 31

  // Dados do evento em duas colunas
  titulo('Dados do evento')
  const campos: [string, string][] = [
    ['Cliente', cliente?.nome ?? '—'],
    ['Telefone', cliente?.telefone ?? '—'],
    ['Local', evento.local || '—'],
    ['Convidados', evento.convidados ? String(evento.convidados) : '—'],
    ['Chegada e montagem', evento.horaMontagem || '—'],
    ['Início da festa', evento.horaInicio || '—'],
    ['Equipe', os.equipe.length ? os.equipe.join(', ') : '—'],
  ]
  const colW = (A4.w - 2 * M - 8) / 2
  for (let i = 0; i < campos.length; i += 2) {
    const linhas = campos.slice(i, i + 2).map(([, v]) => doc.splitTextToSize(v, colW))
    const alt = 5 + Math.max(...linhas.map((l) => l.length)) * 4.4
    garantirEspaco(alt)
    campos.slice(i, i + 2).forEach(([rotulo], j) => {
      const x = M + j * (colW + 8)
      fonte('normal', 7.5)
      cor(CINZA)
      doc.text(rotulo.toUpperCase(), x, y + 1, { charSpace: 0.3 })
      fonte('normal', 10.5)
      cor(TINTA)
      doc.text(linhas[j], x, y + 6)
    })
    y += alt + 1.5
  }
  y += 2

  // Checklist
  titulo('Checklist de preparação')
  os.checklist.forEach((c) => {
    const linhas = doc.splitTextToSize(c.item, A4.w - 2 * M - 12)
    const alt = linhas.length * 4.6 + 1.8
    garantirEspaco(alt)
    doc.setDrawColor(...ROSA)
    doc.setLineWidth(0.4)
    if (c.feito) {
      doc.setFillColor(...ROSA)
      doc.roundedRect(M, y - 0.4, 4, 4, 0.8, 0.8, 'FD')
      doc.setDrawColor(255, 255, 255)
      doc.setLineWidth(0.6)
      doc.line(M + 0.9, y + 1.7, M + 1.7, y + 2.6)
      doc.line(M + 1.7, y + 2.6, M + 3.2, y + 0.6)
    } else {
      doc.roundedRect(M, y - 0.4, 4, 4, 0.8, 0.8, 'S')
    }
    fonte('normal', 10)
    cor(c.feito ? CINZA : TINTA)
    doc.text(linhas, M + 7, y + 2.8)
    y += alt
  })
  y += 3

  // Peças do acervo: base para a conferência de saída e de retorno
  const pecas = os.itens
    .map((it) => ({ ...it, item: acervo.find((a) => a.id === it.itemId) }))
    .filter((p) => p.item)
  if (pecas.length) {
    titulo('Peças do acervo')
    const cols = [
      { t: 'Peça', w: 66 },
      { t: 'Categoria', w: 30 },
      { t: 'Local', w: 34 },
      { t: 'Qtd', w: 12, c: true },
      { t: 'Saída', w: 18, c: true },
      { t: 'Retorno', w: 18, c: true },
    ]
    const cabecalhoTabela = () => {
      doc.setFillColor(...ROSA)
      doc.rect(M, y, A4.w - 2 * M, 7, 'F')
      fonte('bold', 8)
      doc.setTextColor(255, 255, 255)
      let x = M
      cols.forEach((c) => {
        doc.text(c.t.toUpperCase(), c.c ? x + c.w / 2 : x + 2.5, y + 4.7, { align: c.c ? 'center' : 'left' })
        x += c.w
      })
      y += 7
    }
    garantirEspaco(16)
    cabecalhoTabela()
    pecas.forEach((p, i) => {
      if (y + 7 > A4.h - 22) {
        doc.addPage()
        cabecalho()
        cabecalhoTabela()
      }
      if (i % 2 === 1) {
        doc.setFillColor(...ROSA_CLARO)
        doc.rect(M, y, A4.w - 2 * M, 7, 'F')
      }
      const valores = [p.item!.nome, categoriaLabel[p.item!.categoria], p.item!.local, String(p.quantidade)]
      fonte('normal', 9)
      cor(TINTA)
      let x = M
      cols.forEach((c, j) => {
        if (j < 4) {
          const txt = doc.splitTextToSize(valores[j], c.w - 4)[0]
          doc.text(txt, c.c ? x + c.w / 2 : x + 2.5, y + 4.8, { align: c.c ? 'center' : 'left' })
        } else {
          doc.setDrawColor(...CINZA)
          doc.setLineWidth(0.3)
          doc.rect(x + c.w / 2 - 1.8, y + 1.6, 3.6, 3.6, 'S')
        }
        x += c.w
      })
      y += 7
    })
    doc.setDrawColor(...LINHA)
    doc.line(M, y, A4.w - M, y)
    fonte('normal', 8)
    cor(CINZA)
    y += 5
    const total = pecas.reduce((s, p) => s + p.quantidade, 0)
    doc.text(`${total} peças no total. Na volta, confira cada uma e anote quebras ou faltas nas observações.`, M, y)
    y += 7
  }

  // Observações
  const obs = doc.splitTextToSize(os.observacoes || '', A4.w - 2 * M - 10)
  const altObs = Math.max(18, obs.length * 4.8 + 8)
  garantirEspaco(altObs + 6)
  titulo('Observações')
  doc.setDrawColor(...LINHA)
  doc.setLineWidth(0.3)
  doc.roundedRect(M, y, A4.w - 2 * M, altObs, 2, 2, 'S')
  if (os.observacoes) {
    fonte('normal', 10)
    cor(TINTA)
    doc.text(obs, M + 5, y + 7)
  }
  y += altObs + 12

  // Assinaturas
  garantirEspaco(6)
  const assW = (A4.w - 2 * M - 16) / 2
  ;['Responsável pela montagem', 'Conferência de retorno'].forEach((rotulo, i) => {
    const x = M + i * (assW + 16)
    doc.setDrawColor(...CINZA)
    doc.setLineWidth(0.3)
    doc.line(x, y, x + assW, y)
    fonte('normal', 8.5)
    cor(CINZA)
    doc.text(rotulo, x + assW / 2, y + 5, { align: 'center' })
  })

  // Rodapé em todas as páginas
  const paginas = doc.getNumberOfPages()
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p)
    doc.setDrawColor(...LINHA)
    doc.line(M, A4.h - 14, A4.w - M, A4.h - 14)
    fonte('normal', 8)
    cor(CINZA)
    doc.text('Aline Antunes Decora  ·  Assessoria e decoração de eventos  ·  Louveira/SP', M, A4.h - 9)
    doc.text(`Página ${p} de ${paginas}`, A4.w - M, A4.h - 9, { align: 'right' })
  }

  const nomeArquivo = `OS-${os.numero}-${evento.titulo}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
  return { blob: doc.output('blob'), nomeArquivo: `${nomeArquivo}.pdf` }
}
