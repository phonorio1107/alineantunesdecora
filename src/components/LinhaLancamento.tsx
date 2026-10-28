import type { ReactNode } from 'react'
import type { Lancamento } from '../data/tipos'
import { diaMes, formatBRL, hoje } from '../lib/format'
import { useFolhas } from '../app/contexto'

export function Situacao({ l }: { l: Lancamento }) {
  if (l.data_pagamento) return <span className="pill bom">{l.tipo === 'entrada' ? 'Recebido' : 'Pago'}</span>
  if (l.data_vencimento < hoje()) return <span className="pill ruim">Atrasado</span>
  return <span className="pill neutro">Previsto</span>
}

export function LinhaLancamento({ l, categoria, evento, acao }: { l: Lancamento; categoria: string; evento?: string; acao?: ReactNode }) {
  const { abrir } = useFolhas()
  const sinal = l.tipo === 'entrada' ? '+' : '−'
  return (
    <div className="linha linha-acao" style={{ padding: 0 }}>
      <button type="button" className="linha" style={{ borderTop: 0, flex: 1, width: 'auto', margin: 0, minWidth: 0 }} onClick={() => abrir({ tipo: 'lancamento', id: l.id })}>
        <span className={`bolinha ${l.tipo}`} aria-hidden="true">{sinal}</span>
        <span className="cresce">
          <span className="t">{l.descricao || categoria}</span>
          <span className="s">{categoria}{evento ? ` · ${evento}` : ''} · {diaMes(l.data_pagamento ?? l.data_vencimento)}</span>
        </span>
        <span className={`v ${l.tipo}`}>
          <span className="sr-only">{l.tipo === 'entrada' ? 'Entrada de' : 'Saída de'} </span>{sinal} {formatBRL(Number(l.valor))}
        </span>
      </button>
      {acao}
    </div>
  )
}
