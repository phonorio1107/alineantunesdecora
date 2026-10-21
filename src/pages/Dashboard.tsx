import { Link } from 'react-router-dom'
import { ArrowRight, CalendarHeart, ClipboardList, FileText, MapPin, Package, Plus, Wallet } from 'lucide-react'
import { estoque, orcamentos } from '../data/demo'
import { useStore } from '../data/store'
import { statusOSCor, statusOSLabel, tipoEventoCor, tipoEventoLabel } from '../data/labels'
import { daysUntil, formatBRL, formatDate, parseDate, relativeDay } from '../lib/format'
import { Badge } from '../components/ui'

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default function Dashboard() {
  const { eventos, ordens: ordensServico, clientePorId, eventoPorId } = useStore()
  const proximas = eventos
    .filter((e) => daysUntil(e.data) >= 0 && daysUntil(e.data) <= 30 && e.status !== 'cancelado')
    .sort((a, b) => a.data.localeCompare(b.data))
  const hoje = new Date()
  const doMes = orcamentos.filter((o) => {
    const d = parseDate(o.dataEvento)
    return o.status === 'aprovado' && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear()
  })
  const emAberto = orcamentos.filter((o) => o.status === 'enviado')
  const osAbertas = ordensServico.filter((o) => o.status !== 'concluida')
  const pecas = estoque.reduce((s, i) => s + i.quantidade, 0)

  const kpis = [
    { label: 'Próximas festas', value: String(proximas.length), hint: 'nos próximos 30 dias', icon: CalendarHeart, to: '/agenda' },
    { label: 'Fechado no mês', value: formatBRL(doMes.reduce((s, o) => s + o.valor, 0)), hint: `${doMes.length} eventos`, icon: Wallet, to: '/orcamentos' },
    { label: 'Orçamentos em aberto', value: String(emAberto.length), hint: formatBRL(emAberto.reduce((s, o) => s + o.valor, 0)), icon: FileText, to: '/orcamentos' },
    { label: 'Peças no acervo', value: String(pecas), hint: `${estoque.length} itens cadastrados`, icon: Package, to: '/estoque' },
  ]

  const destaque = proximas[0]

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-400 to-brand-300 p-6 text-white shadow-lg shadow-brand-200 sm:p-8">
        <div className="absolute -top-16 -right-16 size-56 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 right-24 size-40 rounded-full bg-white/10" />
        <p className="relative text-sm font-medium text-white/85">
          {hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="relative mt-1 font-display text-3xl font-semibold sm:text-4xl">{saudacao()}, Aline!</h1>
        {destaque && (
          <p className="relative mt-3 max-w-xl text-sm text-white/90 sm:text-base">
            {relativeDay(destaque.data)} tem <strong>{destaque.titulo}</strong> com o tema “{destaque.tema}”.
          </p>
        )}
        <div className="relative mt-5 flex flex-wrap gap-2">
          <Link to="/orcamentos" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50">
            <Plus className="size-4" /> Novo orçamento
          </Link>
          <Link to="/agenda" className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/25">
            Ver agenda
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map(({ label, value, hint, icon: Icon, to }) => (
          <Link key={label} to={to} className="card group p-4 transition hover:-translate-y-0.5 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="size-[18px]" strokeWidth={1.8} />
              </span>
              <ArrowRight className="size-4 text-ink-400 opacity-0 transition group-hover:opacity-100" />
            </div>
            <p className="mt-4 text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">{value}</p>
            <p className="mt-0.5 text-xs font-medium text-ink-700 sm:text-sm">{label}</p>
            <p className="text-xs text-ink-400">{hint}</p>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Próximas festas</h2>
            <Link to="/agenda" className="text-sm font-medium text-brand-600 hover:text-brand-700">Ver todas</Link>
          </div>
          <div className="space-y-3">
            {proximas.slice(0, 4).map((e) => {
              const d = parseDate(e.data)
              return (
                <div key={e.id} className="card flex gap-4 p-4">
                  <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 py-2 text-brand-700">
                    <span className="text-xl leading-none font-bold">{d.getDate()}</span>
                    <span className="mt-1 text-[11px] font-semibold uppercase">{formatDate(e.data, { month: 'short' })}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{e.titulo}</p>
                      <Badge className={tipoEventoCor[e.tipo]}>{tipoEventoLabel[e.tipo]}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-ink-500">Tema: {e.tema} · {clientePorId(e.clienteId)?.nome}</p>
                    <p className="mt-1 flex items-center gap-1 truncate text-xs text-ink-400">
                      <MapPin className="size-3.5 shrink-0" /> {e.local} · montagem {e.horaMontagem}
                    </p>
                  </div>
                  <span className="hidden shrink-0 self-start text-xs font-semibold text-brand-600 sm:block">{relativeDay(e.data)}</span>
                </div>
              )
            })}
          </div>
        </section>

        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Ordens em andamento</h2>
            <Link to="/ordens" className="text-sm font-medium text-brand-600 hover:text-brand-700">Ver todas</Link>
          </div>
          <div className="card divide-y divide-brand-50">
            {osAbertas.map((os) => {
              const ev = eventoPorId(os.eventoId)
              const feitos = os.checklist.filter((c) => c.feito).length
              const pct = Math.round((feitos / os.checklist.length) * 100)
              return (
                <div key={os.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 truncate text-sm font-semibold">
                      <ClipboardList className="size-4 shrink-0 text-brand-500" /> OS {os.numero} · {ev?.titulo}
                    </p>
                    <Badge className={statusOSCor[os.status]}>{statusOSLabel[os.status]}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-50">
                      <div className="h-full rounded-full bg-brand-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-ink-500">{feitos}/{os.checklist.length}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
