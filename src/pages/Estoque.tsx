import { useState } from 'react'
import { Box, MapPin, Plus, Search, Wrench } from 'lucide-react'
import { estoque } from '../data/demo'
import { categoriaLabel, conservacaoLabel } from '../data/labels'
import type { CategoriaItem } from '../data/types'
import { formatBRL } from '../lib/format'
import { EmptyState, PageHeader, Tabs } from '../components/ui'

type Filtro = 'todas' | CategoriaItem

export default function Estoque() {
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [busca, setBusca] = useState('')
  const termo = busca.trim().toLowerCase()
  const lista = estoque.filter(
    (i) => (filtro === 'todas' || i.categoria === filtro) && (!termo || i.nome.toLowerCase().includes(termo)),
  )

  const valorTotal = estoque.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0)
  const volumeTotal = estoque.reduce((s, i) => s + i.quantidade * i.volumeLitros, 0) / 1000
  const reparo = estoque.filter((i) => i.conservacao === 'reparo').length
  const pctNeutras = Math.round((estoque.filter((i) => i.neutra).length / estoque.length) * 100)
  const categorias = [...new Set(estoque.map((i) => i.categoria))]

  return (
    <div>
      <PageHeader
        title="Acervo"
        subtitle="Itens próprios usados nas decorações."
        action={<button className="btn-primary"><Plus className="size-4" /> Novo item</button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-ink-500">Valor do acervo</p>
          <p className="mt-1 text-base font-bold sm:text-xl">{formatBRL(valorTotal)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-500">Volume total</p>
          <p className="mt-1 text-base font-bold sm:text-xl">{volumeTotal.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m³</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-500">Peças neutras</p>
          <p className="mt-1 text-base font-bold sm:text-xl">{pctNeutras}%</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-500">Precisam reparo</p>
          <p className="mt-1 text-base font-bold text-amber-700 sm:text-xl">{reparo}</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-400" />
        <input className="input pl-10" placeholder="Buscar item" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <Tabs<Filtro>
        value={filtro}
        onChange={setFiltro}
        options={[{ value: 'todas', label: 'Todas' }, ...categorias.map((c) => ({ value: c, label: categoriaLabel[c] }))]}
      />

      {lista.length === 0 ? (
        <EmptyState>Nenhum item encontrado.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((i) => (
            <div key={i.id} className="card p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600">
                  <Box className="size-5" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{i.nome}</p>
                  <p className="text-xs text-ink-500">{categoriaLabel[i.categoria]} · {i.cor} · {i.neutra ? 'Neutra' : 'Tematizada'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl leading-none font-bold">{i.quantidade}</p>
                  <p className="text-[11px] text-ink-400">unid.</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-brand-50/60 p-2.5 text-center">
                <div>
                  <p className="text-[11px] text-ink-400">Valor unit.</p>
                  <p className="text-sm font-semibold">{formatBRL(i.valorUnitario)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-ink-400">Volume</p>
                  <p className="text-sm font-semibold">{i.volumeLitros} L</p>
                </div>
                <div>
                  <p className="text-[11px] text-ink-400">Total</p>
                  <p className="text-sm font-semibold">{formatBRL(i.valorUnitario * i.quantidade)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
                <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {i.local}</span>
                {i.conservacao === 'reparo' ? (
                  <span className="flex items-center gap-1 font-semibold text-amber-700"><Wrench className="size-3.5" /> {conservacaoLabel[i.conservacao]}</span>
                ) : (
                  <span>{conservacaoLabel[i.conservacao]}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
