const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const formatBRL = (value: number) => brl.format(value)

export const parseDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const toISODate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const formatDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }) =>
  parseDate(iso).toLocaleDateString('pt-BR', opts).replace('.', '')

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
