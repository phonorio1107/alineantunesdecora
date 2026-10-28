import { useState } from 'react'
import { CheckCircle2, Circle, Download, Loader2, MapPin, Package, Plus, Users } from 'lucide-react'
import { estoque } from '../data/demo'
import { statusOSCor, statusOSLabel } from '../data/labels'
import { useStore } from '../data/store'
import type { OrdemServico } from '../data/types'
import { formatDate, relativeDay } from '../lib/format'
import { salvarArquivo } from '../lib/download'
import { Badge, EmptyState, PageHeader, Tabs } from '../components/ui'

type Filtro = 'abertas' | 'concluidas'

export default function OrdensServico() {
  const { ordens, eventoPorId, clientePorId, alternarChecklist, abrirNovaOS, avisar } = useStore()
  const [filtro, setFiltro] = useState<Filtro>('abertas')
  const [gerando, setGerando] = useState<string | null>(null)

  const lista = ordens
    .filter((o) => (filtro === 'abertas' ? o.status !== 'concluida' : o.status === 'concluida'))
    .sort((a, b) => (eventoPorId(a.eventoId)?.data ?? '').localeCompare(eventoPorId(b.eventoId)?.data ?? ''))

  const baixarPdf = async (os: OrdemServico) => {
    const ev = eventoPorId(os.eventoId)
    if (!ev) return
    setGerando(os.id)
    try {
      // Carrega o gerador só quando precisa, para o app abrir mais rápido.
      const { gerarPdfOrdem } = await import('../lib/pdfOrdem')
      const { blob, nomeArquivo } = await gerarPdfOrdem(os, ev, clientePorId(ev.clienteId), estoque)
      await salvarArquivo(nomeArquivo, blob)
    } catch (e) {
      const codigo = (e as { code?: string })?.code
      if (codigo === 'declined') return
      avisar(codigo === 'unavailable' ? 'Este aparelho não permitiu baixar arquivos aqui.' : 'Não foi possível baixar o PDF. Tente de novo.')
    } finally {
      setGerando(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Ordens de serviço"
        subtitle="O que separar, quem vai e o que falta para cada festa."
        action={<button className="btn-primary hidden sm:inline-flex" onClick={abrirNovaOS}><Plus className="size-4" /> Nova OS</button>}
      />
      <Tabs<Filtro>
        value={filtro}
        onChange={setFiltro}
        options={[
          { value: 'abertas', label: 'Em andamento', count: ordens.filter((o) => o.status !== 'concluida').length },
          { value: 'concluidas', label: 'Concluídas', count: ordens.filter((o) => o.status === 'concluida').length },
        ]}
      />
      {lista.length === 0 ? (
        <EmptyState>Nenhuma ordem aqui. Toque no + para criar uma.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {lista.map((os) => {
            const ev = eventoPorId(os.eventoId)
            const feitos = os.checklist.filter((c) => c.feito).length
            const pecas = os.itens.reduce((s, i) => s + i.quantidade, 0)
            return (
              <div key={os.id} className="card flex flex-col p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-400">
                      OS {os.numero}{ev && ` · ${formatDate(ev.data)} · ${relativeDay(ev.data)}`}
                    </p>
                    <p className="mt-1 truncate font-semibold">{ev?.titulo}</p>
                    {ev && <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-ink-500"><MapPin className="size-3.5 shrink-0" /> {ev.local || 'Local a definir'}</p>}
                  </div>
                  <Badge className={statusOSCor[os.status]}>{statusOSLabel[os.status]}</Badge>
                </div>
                <ul className="mt-3 flex-1 space-y-0.5">
                  {os.checklist.map((c, i) => (
                    <li key={`${c.item}-${i}`}>
                      <button
                        onClick={() => alternarChecklist(os.id, i)}
                        className={`-mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-brand-50 ${c.feito ? 'text-ink-400 line-through' : 'text-ink-700'}`}
                      >
                        {c.feito ? <CheckCircle2 className="size-[18px] shrink-0 text-emerald-500" /> : <Circle className="size-[18px] shrink-0 text-brand-300" />}
                        {c.item}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-brand-50 pt-3 text-sm text-ink-500">
                  <span className="flex items-center gap-1.5"><Users className="size-4 text-brand-500" /> {os.equipe.join(', ') || 'Equipe a definir'}</span>
                  <span className="flex items-center gap-1.5"><Package className="size-4 text-brand-500" /> {pecas} peças</span>
                  <span className="ml-auto font-medium">{feitos}/{os.checklist.length} feitos</span>
                </div>
                <button
                  onClick={() => baixarPdf(os)}
                  disabled={gerando === os.id}
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-60"
                >
                  {gerando === os.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  {gerando === os.id ? 'Gerando PDF...' : 'Baixar PDF'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
