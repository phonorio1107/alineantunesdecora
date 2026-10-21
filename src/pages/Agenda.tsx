import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, MapPin, Users } from 'lucide-react'
import { clientePorId, eventos } from '../data/demo'
import { statusEventoLabel, tipoEventoCor, tipoEventoLabel } from '../data/labels'
import { capitalize, formatDate, toISODate } from '../lib/format'
import { Badge, EmptyState, PageHeader } from '../components/ui'

const semana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export default function Agenda() {
  const hoje = toISODate(new Date())
  const [mes, setMes] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  // Abre no dia de hoje ou, se não houver festa hoje, na próxima festa do mês.
  const [selecionado, setSelecionado] = useState(() => {
    const fimDoMes = toISODate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))
    const proxima = eventos.map((e) => e.data).filter((d) => d >= hoje && d <= fimDoMes).sort()[0]
    return proxima ?? hoje
  })

  const porDia = useMemo(() => {
    const map = new Map<string, typeof eventos>()
    for (const e of eventos) map.set(e.data, [...(map.get(e.data) ?? []), e])
    return map
  }, [])

  const dias = useMemo(() => {
    const inicio = new Date(mes)
    inicio.setDate(1 - mes.getDay())
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio)
      d.setDate(inicio.getDate() + i)
      return d
    })
  }, [mes])

  const mudarMes = (delta: number) => setMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1))
  const doDia = porDia.get(selecionado) ?? []

  return (
    <div>
      <PageHeader title="Agenda" subtitle="Todas as festas, montagens e compromissos." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card p-3 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <button className="btn-ghost" onClick={() => mudarMes(-1)} aria-label="Mês anterior"><ChevronLeft className="size-5" /></button>
            <p className="font-display text-lg font-semibold">
              {capitalize(mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))}
            </p>
            <button className="btn-ghost" onClick={() => mudarMes(1)} aria-label="Próximo mês"><ChevronRight className="size-5" /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold tracking-wide text-ink-400 uppercase">
            {semana.map((s) => <div key={s} className="pb-2">{s}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {dias.map((d) => {
              const iso = toISODate(d)
              const evs = porDia.get(iso) ?? []
              const foraDoMes = d.getMonth() !== mes.getMonth()
              const ativo = iso === selecionado
              return (
                <button
                  key={iso}
                  onClick={() => setSelecionado(iso)}
                  className={`flex aspect-square flex-col items-center rounded-xl p-1 text-sm transition sm:aspect-auto sm:min-h-20 sm:items-start sm:p-2 ${
                    ativo ? 'bg-brand-500 text-white' : foraDoMes ? 'text-ink-400/50 hover:bg-brand-50' : 'hover:bg-brand-50'
                  }`}
                >
                  <span className={`grid size-7 place-items-center rounded-full text-sm font-semibold ${iso === hoje && !ativo ? 'bg-brand-100 text-brand-700' : ''}`}>
                    {d.getDate()}
                  </span>
                  <span className="mt-auto flex gap-0.5 sm:hidden">
                    {evs.slice(0, 3).map((e) => <span key={e.id} className={`size-1.5 rounded-full ${ativo ? 'bg-white' : 'bg-brand-500'}`} />)}
                  </span>
                  <span className="mt-1 hidden w-full space-y-1 sm:block">
                    {evs.slice(0, 2).map((e) => (
                      <span key={e.id} className={`block truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium ${ativo ? 'bg-white/20' : tipoEventoCor[e.tipo]}`}>
                        {e.titulo}
                      </span>
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-display text-lg font-semibold">
            {capitalize(formatDate(selecionado, { weekday: 'long', day: 'numeric', month: 'long' }))}
          </h2>
          {doDia.length === 0 ? (
            <EmptyState>Nenhuma festa neste dia.</EmptyState>
          ) : (
            <div className="space-y-3">
              {doDia.map((e) => (
                <div key={e.id} className="card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={tipoEventoCor[e.tipo]}>{tipoEventoLabel[e.tipo]}</Badge>
                    <span className="text-xs font-medium text-ink-500">{statusEventoLabel[e.status]}</span>
                  </div>
                  <p className="mt-2 font-semibold">{e.titulo}</p>
                  <p className="text-sm text-ink-500">Tema: {e.tema} · {clientePorId(e.clienteId)?.nome}</p>
                  <div className="mt-3 space-y-1.5 text-sm text-ink-700">
                    <p className="flex items-center gap-2"><Clock className="size-4 text-brand-500" /> Montagem {e.horaMontagem} · Festa {e.horaInicio}</p>
                    <p className="flex items-center gap-2"><MapPin className="size-4 text-brand-500" /> {e.local}</p>
                    <p className="flex items-center gap-2"><Users className="size-4 text-brand-500" /> {e.convidados} convidados</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
