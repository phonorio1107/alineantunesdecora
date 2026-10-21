import { useState } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import { orcamentos } from '../data/demo'
import { useStore } from '../data/store'
import { pacoteLabel, statusOrcamentoCor, statusOrcamentoLabel, tipoEventoLabel } from '../data/labels'
import type { StatusOrcamento } from '../data/types'
import { formatBRL, formatDate } from '../lib/format'
import { Badge, EmptyState, PageHeader, Tabs } from '../components/ui'

type Filtro = 'todos' | StatusOrcamento

export default function Orcamentos() {
  const { clientePorId } = useStore()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const lista = orcamentos
    .filter((o) => filtro === 'todos' || o.status === filtro)
    .sort((a, b) => b.numero - a.numero)
  const conta = (s: StatusOrcamento) => orcamentos.filter((o) => o.status === s).length

  return (
    <div>
      <PageHeader
        title="Orçamentos"
        subtitle="Propostas enviadas, aprovadas e em negociação."
        action={<button className="btn-primary"><Plus className="size-4" /> Novo orçamento</button>}
      />
      <Tabs<Filtro>
        value={filtro}
        onChange={setFiltro}
        options={[
          { value: 'todos', label: 'Todos', count: orcamentos.length },
          { value: 'enviado', label: 'Enviados', count: conta('enviado') },
          { value: 'aprovado', label: 'Aprovados', count: conta('aprovado') },
          { value: 'rascunho', label: 'Rascunhos', count: conta('rascunho') },
          { value: 'recusado', label: 'Recusados', count: conta('recusado') },
        ]}
      />
      {lista.length === 0 ? (
        <EmptyState>Nenhum orçamento aqui.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {lista.map((o) => (
            <div key={o.id} className="card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink-400">Nº {o.numero} · {tipoEventoLabel[o.tipo]} · Pacote {pacoteLabel[o.pacote]}</p>
                  <p className="mt-1 truncate font-semibold">{clientePorId(o.clienteId)?.nome}</p>
                  <p className="truncate text-sm text-ink-500">{o.descricao}</p>
                </div>
                <Badge className={statusOrcamentoCor[o.status]}>{statusOrcamentoLabel[o.status]}</Badge>
              </div>
              <div className="mt-4 flex items-end justify-between border-t border-brand-50 pt-3">
                <p className="flex items-center gap-1.5 text-sm text-ink-500">
                  <CalendarDays className="size-4 text-brand-500" /> {formatDate(o.dataEvento, { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <div className="text-right">
                  <p className="text-lg font-bold text-ink-900">{formatBRL(o.valor)}</p>
                  {o.sinal > 0 && <p className="text-xs text-emerald-700">Sinal pago {formatBRL(o.sinal)}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
