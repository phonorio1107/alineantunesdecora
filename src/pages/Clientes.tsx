import { useState } from 'react'
import { MapPin, MessageCircle, Plus, Search } from 'lucide-react'
import { clientes, eventos } from '../data/demo'
import { EmptyState, PageHeader } from '../components/ui'

const origemLabel = { instagram: 'Instagram', whatsapp: 'WhatsApp', indicacao: 'Indicação', site: 'Site', outro: 'Outro' }

export default function Clientes() {
  const [busca, setBusca] = useState('')
  const termo = busca.trim().toLowerCase()
  const lista = clientes.filter((c) => !termo || c.nome.toLowerCase().includes(termo) || c.telefone.includes(termo))

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.length} clientes cadastrados`}
        action={<button className="btn-primary"><Plus className="size-4" /> Novo cliente</button>}
      />
      <div className="relative mb-5">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-400" />
        <input className="input pl-10" placeholder="Buscar por nome ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      {lista.length === 0 ? (
        <EmptyState>Nenhum cliente encontrado.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((c) => {
            const festas = eventos.filter((e) => e.clienteId === c.id).length
            const iniciais = c.nome.split(' ').map((p) => p[0]).slice(0, 2).join('')
            return (
              <div key={c.id} className="card flex items-center gap-3 p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{iniciais}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.nome}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-ink-500">
                    <MapPin className="size-3 shrink-0" /> {c.cidade} · {origemLabel[c.origem]} · {festas} {festas === 1 ? 'festa' : 'festas'}
                  </p>
                </div>
                <a
                  href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                  aria-label={`WhatsApp de ${c.nome}`}
                >
                  <MessageCircle className="size-[18px]" />
                </a>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
