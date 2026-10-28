import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Lock, Plus, Search } from 'lucide-react'
import { useEmpresa, useFolhas } from '../app/contexto'
import { MESES_ANTES, MESES_DEPOIS, useFinanceiro } from '../app/dados'
import { useContas, useEventos, useFechamentos } from '../data/consultas'
import { LinhaLancamento, Situacao } from '../components/LinhaLancamento'
import { Carregando, ErroCaixa, Exportar, Vazio } from '../components/ui'
import { abaLancamentos, baixarCSV, baixarExcel } from '../export/acoes'
import { addMes, formatBRL, mesDe, nomeMes } from '../lib/format'

type Filtro = 'todos' | 'entrada' | 'saida' | 'previsto'

export default function Lancamentos() {
  const { empresaId, empresa } = useEmpresa()
  const { abrir } = useFolhas()
  const f = useFinanceiro()
  const eventos = useEventos(empresaId)
  const contas = useContas(empresaId)
  const fechamentos = useFechamentos(empresaId)
  const [mes, setMes] = useState(f.mes)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')

  const titulos = useMemo(() => new Map((eventos.data ?? []).map((e) => [e.id, e.titulo])), [eventos.data])
  const nomesContas = useMemo(() => new Map((contas.data ?? []).map((c) => [c.id, c.nome])), [contas.data])
  const doMes = f.lancamentos.filter((l) => mesDe(l.data_pagamento ?? l.data_vencimento) === mes)
  const q = busca.trim().toLowerCase()
  const visiveis = doMes
    .filter((l) => filtro === 'todos' || (filtro === 'previsto' ? !l.data_pagamento : l.tipo === filtro))
    .filter((l) => !q || `${l.descricao ?? ''} ${f.nomeCategoria(l.categoria_id)} ${titulos.get(l.evento_id ?? '') ?? ''}`.toLowerCase().includes(q))
    .sort((a, b) => (b.data_pagamento ?? b.data_vencimento).localeCompare(a.data_pagamento ?? a.data_vencimento))
  const entradas = doMes.filter((l) => l.tipo === 'entrada').reduce((t, l) => t + Number(l.valor), 0)
  const saidas = doMes.filter((l) => l.tipo === 'saida').reduce((t, l) => t + Number(l.valor), 0)
  const fechado = (fechamentos.data ?? []).some((x) => x.mes_referencia.slice(0, 7) === mes)
  const aba = () => abaLancamentos(visiveis, f.nomeCategoria, titulos, nomesContas, mes)
  const minimo = addMes(f.mes, -(MESES_ANTES - 1))
  const maximo = addMes(f.mes, MESES_DEPOIS)
  const chip = (v: Filtro, t: string) => <button type="button" className="chip" aria-pressed={filtro === v} onClick={() => setFiltro(v)}>{t}</button>

  return (
    <>
      <div className="cabecalho">
        <div><h1>Lançamentos</h1><p className="muted">Tudo o que entrou e saiu, e o que ainda está previsto.</p></div>
        <div className="acoes">
          <Exportar opcoes={[
            { rotulo: 'Planilha Excel', formato: 'xlsx', gerar: () => baixarExcel([aba()], empresa, `lancamentos-${mes}`) },
            { rotulo: 'CSV', formato: 'csv', gerar: async () => baixarCSV(aba(), `lancamentos-${mes}`) },
          ]} />
          <button type="button" className="btn btn-p" onClick={() => abrir({ tipo: 'lancar' })}><Plus size={20} aria-hidden="true" />Lançar</button>
        </div>
      </div>
      <div className="barra">
        <div className="navmes">
          <button type="button" className="icone-btn" onClick={() => setMes(addMes(mes, -1))} disabled={mes <= minimo} aria-label="Mês anterior"><ChevronLeft size={20} /></button>
          <b>{nomeMes(mes)}</b>
          <button type="button" className="icone-btn" onClick={() => setMes(addMes(mes, 1))} disabled={mes >= maximo} aria-label="Próximo mês"><ChevronRight size={20} /></button>
        </div>
        {fechado ? <span className="pill atencao"><Lock size={14} aria-hidden="true" /> Mês fechado</span> : null}
        <label className="busca">
          <Search size={18} aria-hidden="true" />
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por descrição, categoria ou evento" aria-label="Buscar lançamentos" />
        </label>
      </div>
      <div className="chips" role="group" aria-label="Filtrar">{chip('todos', 'Todos')}{chip('entrada', 'Entradas')}{chip('saida', 'Saídas')}{chip('previsto', 'Previstos')}</div>
      <div className="resumo-linha">
        <span>Entradas <b>{formatBRL(entradas)}</b></span><span>Saídas <b>{formatBRL(saidas)}</b></span><span>Resultado <b>{formatBRL(entradas - saidas)}</b></span>
      </div>
      <section className="cartao">
        {f.carregando ? <Carregando /> : f.erro ? <ErroCaixa erro={f.erro} aoTentar={f.recarregar} /> : (
          <div className="linhas">
            {visiveis.length ? visiveis.map((l) => (
              <LinhaLancamento key={l.id} l={l} categoria={f.nomeCategoria(l.categoria_id)} evento={l.evento_id ? titulos.get(l.evento_id) : undefined} acao={<Situacao l={l} />} />
            )) : <Vazio titulo="Nenhum lançamento com esses filtros." texto="Limpe a busca ou escolha “Todos”. Para registrar algo novo, toque em Lançar." />}
          </div>
        )}
      </section>
    </>
  )
}
