// Formatos brasileiros e datas. Datas do sistema são sempre texto ISO "AAAA-MM-DD" no fuso local.

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brl0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export const formatBRL = (valor: number) => brl.format(valor)
export const formatBRL0 = (valor: number) => brl0.format(valor)
export const formatPct = (v: number) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`
export const formatMeses = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export const parseDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const toISODate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const hoje = () => toISODate(new Date())

/** "28/10/2026" */
export const dataBR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
/** "28/10" */
export const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

export const formatDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }) =>
  parseDate(iso).toLocaleDateString('pt-BR', opts).replace('.', '')

export const addDias = (iso: string, n: number) => {
  const d = parseDate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Mesma data n meses depois; dia 31 vira o último dia do mês quando ele não existe. */
export const somarMeses = (iso: string, n: number) => {
  const ym = addMes(iso.slice(0, 7), n)
  const fim = Number(fimMes(ym).slice(8, 10))
  return `${ym}-${String(Math.min(Number(iso.slice(8, 10)), fim)).padStart(2, '0')}`
}

/** Mês no formato "AAAA-MM". */
export const mesDe = (iso: string) => iso.slice(0, 7)
export const addMes = (ym: string, n: number) => {
  let y = Number(ym.slice(0, 4))
  let m = Number(ym.slice(5, 7)) - 1 + n
  y += Math.floor(m / 12)
  m = ((m % 12) + 12) % 12
  return `${y}-${String(m + 1).padStart(2, '0')}`
}
export const inicioMes = (ym: string) => `${ym}-01`
export const fimMes = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return toISODate(new Date(y, m, 0))
}
/** "outubro de 2026" */
export const nomeMes = (ym: string) => `${MESES[Number(ym.slice(5, 7)) - 1]} de ${ym.slice(0, 4)}`
/** "out" ou "jan/27" na virada do ano */
export const mesCurto = (ym: string) => MESES[Number(ym.slice(5, 7)) - 1].slice(0, 3) + (ym.endsWith('-01') ? `/${ym.slice(2, 4)}` : '')

export const daysUntil = (iso: string) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((parseDate(iso).getTime() - today.getTime()) / 86_400_000)
}

export const relativeDay = (iso: string) => {
  const n = daysUntil(iso)
  if (n === 0) return 'Hoje'
  if (n === 1) return 'Amanhã'
  if (n === -1) return 'Ontem'
  return n > 0 ? `Em ${n} dias` : `Há ${-n} dias`
}

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export const soDigitos = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '')

export const formatTelefone = (t: string | null | undefined) => {
  const d = soDigitos(t)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return t ?? ''
}

export const formatDoc = (doc: string | null | undefined) => {
  const d = soDigitos(doc)
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
  return doc ?? ''
}

/** CPF/CNPJ para listas: só o miolo aparece. */
export const mascararDoc = (doc: string | null | undefined) => {
  const d = soDigitos(doc)
  if (d.length === 14) return `**.***.${d.slice(5, 8)}/${d.slice(8, 12)}-**`
  if (d.length === 11) return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`
  return ''
}
