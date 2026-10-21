import { useState } from 'react'
import { CheckCircle2, Circle, MapPin, Users } from 'lucide-react'
import { eventoPorId, ordensServico } from '../data/demo'
import { statusOSCor, statusOSLabel } from '../data/labels'
import { formatDate, relativeDay } from '../lib/format'
import { Badge, PageHeader, Tabs } from '../components/ui'

type Filtro = 'abertas' | 'concluidas'

export default function OrdensServico() {
  const [filtro, setFiltro] = useState<Filtro>('abertas')
  const lista = ordensServico.filter((o) => (filtro === 'abertas' ? o.status !== 'concluida' : o.status === 'concluida'))

  return (
    <div>
      <PageHeader title="Ordens de serviço" subtitle="O que separar, quem vai e o que falta para cada festa." />
      <Tabs<Filtro>
        value={filtro}
        onChange={setFiltro}
        options={[
          { value: 'abertas', label: 'Em andamento' },
          { value: 'concluidas', label: 'Concluídas' },
        ]}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {lista.map((os) => {
          const ev = eventoPorId(os.eventoId)
          const feitos = os.checklist.filter((c) => c.feito).length
          return (
            <div key={os.id} className="card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink-400">
                    OS {os.numero}{ev && ` · ${formatDate(ev.data)} · ${relativeDay(ev.data)}`}
                  </p>
                  <p className="mt-1 truncate font-semibold">{ev?.titulo}</p>
                  {ev && <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-ink-500"><MapPin className="size-3.5 shrink-0" /> {ev.local}</p>}
                </div>
                <Badge className={statusOSCor[os.status]}>{statusOSLabel[os.status]}</Badge>
              </div>
              <ul className="mt-4 space-y-2">
                {os.checklist.map((c) => (
                  <li key={c.item} className={`flex items-center gap-2.5 text-sm ${c.feito ? 'text-ink-400 line-through' : 'text-ink-700'}`}>
                    {c.feito ? <CheckCircle2 className="size-[18px] shrink-0 text-emerald-500" /> : <Circle className="size-[18px] shrink-0 text-brand-300" />}
                    {c.item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between border-t border-brand-50 pt-3 text-sm text-ink-500">
                <span className="flex items-center gap-1.5"><Users className="size-4 text-brand-500" /> {os.equipe.join(', ')}</span>
                <span className="font-medium">{feitos}/{os.checklist.length} feitos</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
