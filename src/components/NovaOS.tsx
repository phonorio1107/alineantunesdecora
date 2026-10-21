import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Minus, Plus, Search, X } from 'lucide-react'
import { estoque } from '../data/demo'
import { categoriaLabel, tipoEventoLabel } from '../data/labels'
import { useStore } from '../data/store'
import type { Evento, TipoEvento } from '../data/types'
import { formatDate, toISODate } from '../lib/format'

const checklistPadrao: Record<TipoEvento, string[]> = {
  infantil: ['Separar painel e mobiliário', 'Conferir boleiras e bandejas', 'Encher balões', 'Carregar o carro', 'Conferir peças na volta'],
  casamento: ['Confirmar flores com fornecedor', 'Separar tecidos e castiçais', 'Montar arranjos de mesa', 'Conferir iluminação', 'Conferir peças na volta'],
  quinze_anos: ['Separar peças da composição', 'Montar arranjos florais', 'Encher balões', 'Conferir iluminação', 'Conferir peças na volta'],
  cha: ['Separar mini table', 'Encher balões', 'Carregar o carro', 'Conferir peças na volta'],
  batizado: ['Separar painel e arranjos', 'Conferir boleiras e bandejas', 'Carregar o carro', 'Conferir peças na volta'],
  corporativo: ['Confirmar horário de acesso ao local', 'Separar peças e arranjos', 'Carregar o carro', 'Conferir peças na volta'],
  outro: ['Separar peças', 'Carregar o carro', 'Conferir peças na volta'],
}

// A equipe chega 3 horas antes do início da festa.
const tresHorasAntes = (hora: string) => {
  const [h, m] = hora.split(':').map(Number)
  const total = (h * 60 + m - 180 + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function Campo({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-ink-700">{label}</span>
      {children}
    </label>
  )
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="font-display text-lg font-semibold text-ink-900">{titulo}</h3>
      {children}
    </section>
  )
}

export default function NovaOS() {
  const store = useStore()
  const { novaOSAberta, fecharNovaOS } = store
  if (!novaOSAberta) return null
  return <Formulario onClose={fecharNovaOS} />
}

function Formulario({ onClose }: { onClose: () => void }) {
  const { clientes, eventos, ordens, clientePorId, criarOrdem, avisar } = useStore()
  const navigate = useNavigate()

  const semOS = eventos
    .filter((e) => e.status !== 'cancelado' && e.data >= toISODate(new Date()) && !ordens.some((o) => o.eventoId === e.id))
    .sort((a, b) => a.data.localeCompare(b.data))

  const [modo, setModo] = useState<'existente' | 'nova'>(semOS.length ? 'existente' : 'nova')
  const [eventoId, setEventoId] = useState(semOS[0]?.id ?? '')
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? '')
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '', cidade: 'Louveira' })
  const [festa, setFesta] = useState({
    titulo: '',
    tipo: 'infantil' as TipoEvento,
    tema: '',
    data: '',
    horaInicio: '15:00',
    horaMontagem: '12:00',
    local: '',
    convidados: '',
  })
  const [equipe, setEquipe] = useState<string[]>(['Aline'])
  const [nomeEquipe, setNomeEquipe] = useState('')
  const [checklist, setChecklist] = useState<string[]>(checklistPadrao.infantil)
  const [novoItemChecklist, setNovoItemChecklist] = useState('')
  const [pecas, setPecas] = useState<Record<string, number>>({})
  const [buscaPeca, setBuscaPeca] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const eventoSelecionado = modo === 'existente' ? eventos.find((e) => e.id === eventoId) : undefined
  const tipo = eventoSelecionado?.tipo ?? festa.tipo
  const dataFesta = eventoSelecionado?.data ?? festa.data

  // Troca o checklist sugerido quando muda o tipo de festa.
  useEffect(() => setChecklist(checklistPadrao[tipo]), [tipo])

  // Peças já comprometidas com outras festas no mesmo dia.
  const emUsoNoDia = useMemo(() => {
    const uso: Record<string, number> = {}
    if (!dataFesta) return uso
    for (const o of ordens) {
      const ev = eventos.find((e) => e.id === o.eventoId)
      if (ev?.data !== dataFesta) continue
      for (const it of o.itens) uso[it.itemId] = (uso[it.itemId] ?? 0) + it.quantidade
    }
    return uso
  }, [ordens, eventos, dataFesta])

  const termo = buscaPeca.trim().toLowerCase()
  const listaPecas = estoque.filter((i) => i.categoria !== 'consumo' && (!termo || i.nome.toLowerCase().includes(termo)))
  const totalPecas = Object.values(pecas).reduce((s, n) => s + n, 0)

  const ajustarPeca = (id: string, delta: number) =>
    setPecas((p) => {
      const n = Math.max(0, (p[id] ?? 0) + delta)
      const { [id]: _, ...resto } = p
      return n ? { ...resto, [id]: n } : resto
    })

  const adicionarEquipe = () => {
    const nome = nomeEquipe.trim()
    if (nome && !equipe.includes(nome)) setEquipe([...equipe, nome])
    setNomeEquipe('')
  }

  const adicionarChecklist = () => {
    const item = novoItemChecklist.trim()
    if (item) setChecklist([...checklist, item])
    setNovoItemChecklist('')
  }

  const salvar = (e: FormEvent) => {
    e.preventDefault()
    let evento: Evento | Omit<Evento, 'id'>
    let cliente: { nome: string; telefone: string; cidade: string; origem: 'outro' } | undefined
    if (modo === 'existente') {
      if (!eventoSelecionado) return setErro('Escolha a festa desta ordem de serviço.')
      evento = eventoSelecionado
    } else {
      if (clienteId === 'novo' && !novoCliente.nome.trim()) return setErro('Informe o nome da cliente.')
      if (!festa.titulo.trim()) return setErro('Dê um nome para a festa, por exemplo "1 aninho da Helena".')
      if (!festa.data) return setErro('Informe a data da festa.')
      if (clienteId === 'novo') cliente = { ...novoCliente, nome: novoCliente.nome.trim(), origem: 'outro' }
      evento = {
        clienteId: clienteId === 'novo' ? '' : clienteId,
        titulo: festa.titulo.trim(),
        tipo: festa.tipo,
        tema: festa.tema.trim(),
        data: festa.data,
        horaInicio: festa.horaInicio,
        horaMontagem: festa.horaMontagem,
        local: festa.local.trim(),
        convidados: Number(festa.convidados) || 0,
        status: 'confirmado',
      }
    }
    const os = criarOrdem({
      evento,
      novoCliente: cliente,
      equipe,
      checklist,
      itens: Object.entries(pecas).map(([itemId, quantidade]) => ({ itemId, quantidade })),
      observacoes: observacoes.trim(),
    })
    onClose()
    navigate('/ordens')
    avisar(`OS ${os.numero} criada`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="nova-os-titulo">
      <button className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]" onClick={onClose} aria-label="Fechar" />
      <form
        onSubmit={salvar}
        className="relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-canvas shadow-2xl sm:max-w-2xl sm:rounded-3xl"
      >
        <header className="flex items-center justify-between border-b border-brand-100 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Ordem de serviço</p>
            <h2 id="nova-os-titulo" className="font-display text-xl font-semibold">Nova OS</h2>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Fechar">
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5">
          <Secao titulo="Festa">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-brand-50 p-1">
              {(['existente', 'nova'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModo(m)}
                  disabled={m === 'existente' && !semOS.length}
                  className={`rounded-lg py-2 text-sm font-semibold transition disabled:opacity-40 ${modo === m ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500'}`}
                >
                  {m === 'existente' ? 'Festa da agenda' : 'Nova festa'}
                </button>
              ))}
            </div>

            {modo === 'existente' ? (
              <Campo label="Festa sem ordem de serviço">
                <select id="os-evento" className="input" value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
                  {semOS.map((e) => (
                    <option key={e.id} value={e.id}>
                      {formatDate(e.data)} · {e.titulo} ({clientePorId(e.clienteId)?.nome})
                    </option>
                  ))}
                </select>
              </Campo>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Campo label="Cliente" className="sm:col-span-2">
                  <select id="os-cliente" className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    <option value="novo">+ Nova cliente</option>
                  </select>
                </Campo>
                {clienteId === 'novo' && (
                  <>
                    <Campo label="Nome da cliente">
                      <input id="os-cliente-nome" className="input" value={novoCliente.nome} onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })} />
                    </Campo>
                    <Campo label="WhatsApp">
                      <input id="os-cliente-tel" className="input" inputMode="tel" placeholder="(19) 99999-9999" value={novoCliente.telefone} onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })} />
                    </Campo>
                  </>
                )}
                <Campo label="Nome da festa" className="sm:col-span-2">
                  <input id="os-titulo" className="input" placeholder="1 aninho da Helena" value={festa.titulo} onChange={(e) => setFesta({ ...festa, titulo: e.target.value })} />
                </Campo>
                <Campo label="Tipo">
                  <select id="os-tipo" className="input" value={festa.tipo} onChange={(e) => setFesta({ ...festa, tipo: e.target.value as TipoEvento })}>
                    {Object.entries(tipoEventoLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Campo>
                <Campo label="Tema">
                  <input id="os-tema" className="input" placeholder="Jardim Encantado" value={festa.tema} onChange={(e) => setFesta({ ...festa, tema: e.target.value })} />
                </Campo>
                <Campo label="Data">
                  <input id="os-data" type="date" className="input" value={festa.data} onChange={(e) => setFesta({ ...festa, data: e.target.value })} />
                </Campo>
                <Campo label="Convidados">
                  <input id="os-convidados" type="number" min="0" inputMode="numeric" className="input" value={festa.convidados} onChange={(e) => setFesta({ ...festa, convidados: e.target.value })} />
                </Campo>
                <Campo label="Início da festa">
                  <input
                    id="os-hora-inicio"
                    type="time"
                    className="input"
                    value={festa.horaInicio}
                    onChange={(e) => setFesta({ ...festa, horaInicio: e.target.value, horaMontagem: e.target.value ? tresHorasAntes(e.target.value) : festa.horaMontagem })}
                  />
                </Campo>
                <Campo label="Chegada da equipe (3h antes)">
                  <input id="os-hora-montagem" type="time" className="input" value={festa.horaMontagem} onChange={(e) => setFesta({ ...festa, horaMontagem: e.target.value })} />
                </Campo>
                <Campo label="Local" className="sm:col-span-2">
                  <input id="os-local" className="input" placeholder="Espaço Recanto — Louveira" value={festa.local} onChange={(e) => setFesta({ ...festa, local: e.target.value })} />
                </Campo>
              </div>
            )}
          </Secao>

          <Secao titulo="Equipe">
            <div className="flex flex-wrap gap-2">
              {equipe.map((n) => (
                <span key={n} className="inline-flex items-center gap-1 rounded-full bg-brand-100 py-1 pr-1.5 pl-3 text-sm font-medium text-brand-800">
                  {n}
                  <button type="button" onClick={() => setEquipe(equipe.filter((x) => x !== n))} className="rounded-full p-0.5 hover:bg-brand-200" aria-label={`Remover ${n}`}>
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                id="os-equipe"
                className="input"
                placeholder="Nome do freelancer"
                value={nomeEquipe}
                onChange={(e) => setNomeEquipe(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarEquipe())}
              />
              <button type="button" className="btn-ghost shrink-0 border border-brand-100 bg-white" onClick={adicionarEquipe}>Adicionar</button>
            </div>
          </Secao>

          <Secao titulo="Checklist">
            <ul className="space-y-2">
              {checklist.map((item, i) => (
                <li key={`${item}-${i}`} className="flex items-center gap-2 rounded-xl border border-brand-100 bg-white py-2 pr-2 pl-3 text-sm">
                  <span className="size-4 shrink-0 rounded border-2 border-brand-300" />
                  <span className="flex-1">{item}</span>
                  <button type="button" onClick={() => setChecklist(checklist.filter((_, j) => j !== i))} className="rounded-lg p-1 text-ink-400 hover:bg-brand-50" aria-label={`Remover ${item}`}>
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                id="os-checklist"
                className="input"
                placeholder="Nova tarefa"
                value={novoItemChecklist}
                onChange={(e) => setNovoItemChecklist(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarChecklist())}
              />
              <button type="button" className="btn-ghost shrink-0 border border-brand-100 bg-white" onClick={adicionarChecklist}>Adicionar</button>
            </div>
          </Secao>

          <Secao titulo={`Peças do acervo${totalPecas ? ` · ${totalPecas}` : ''}`}>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-400" />
              <input id="os-busca-peca" className="input pl-10" placeholder="Buscar peça" value={buscaPeca} onChange={(e) => setBuscaPeca(e.target.value)} />
            </div>
            <ul className="divide-y divide-brand-50 overflow-hidden rounded-2xl border border-brand-100 bg-white">
              {listaPecas.map((i) => {
                const qtd = pecas[i.id] ?? 0
                const livre = i.quantidade - (emUsoNoDia[i.id] ?? 0)
                const falta = qtd > livre
                return (
                  <li key={i.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{i.nome}</p>
                      <p className={`flex items-center gap-1 text-xs ${falta ? 'font-semibold text-amber-700' : 'text-ink-400'}`}>
                        {falta && <AlertTriangle className="size-3.5" />}
                        {categoriaLabel[i.categoria]} · {livre < i.quantidade ? `${Math.max(livre, 0)} ${livre === 1 ? 'livre' : 'livres'} no dia (de ${i.quantidade})` : `${i.quantidade} no acervo`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => ajustarPeca(i.id, -1)} disabled={!qtd} className="grid size-8 place-items-center rounded-lg border border-brand-100 text-ink-700 disabled:opacity-30" aria-label={`Menos ${i.nome}`}>
                        <Minus className="size-4" />
                      </button>
                      <span className="w-7 text-center text-sm font-semibold tabular-nums">{qtd}</span>
                      <button type="button" onClick={() => ajustarPeca(i.id, 1)} className="grid size-8 place-items-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700" aria-label={`Mais ${i.nome}`}>
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Secao>

          <Secao titulo="Observações">
            <textarea
              id="os-observacoes"
              className="input min-h-24 resize-y"
              placeholder="Acesso ao local, pedidos da cliente, cuidados especiais..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </Secao>
        </div>

        <footer className="pb-safe border-t border-brand-100 bg-white px-5 pt-3">
          {erro && <p className="mb-2 text-sm font-medium text-rose-700">{erro}</p>}
          <div className="flex gap-2 pb-3">
            <button type="button" className="btn-ghost flex-1 border border-brand-100" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary flex-[2]">Criar OS</button>
          </div>
        </footer>
      </form>
    </div>
  )
}
