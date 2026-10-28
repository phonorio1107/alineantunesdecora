import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { useAvisar, useEmpresa } from '../app/contexto'
import { MESES_ANTES, useFinanceiro, type Financeiro } from '../app/dados'
import { useFechamentos, useFecharMes, useReabrirMes, useResultadosEventos } from '../data/consultas'
import { Alerta, Carregando, Confirmar, ErroCaixa, Exportar } from '../components/ui'
import { abaEventos, abaFechamento, abaFluxo, baixarCSV, baixarExcel, baixarPdfFechamento, baixarPdfFluxo } from '../export/acoes'
import { lucroPorArea } from '../lib/calculos'
import { addMes, dataBR, formatBRL, formatBRL0, formatPct, mesCurto, nomeMes } from '../lib/format'
import { mensagemErro } from '../lib/erros'
import { FONTE_NOME } from './Eventos'

type Aba = 'fechamento' | 'fluxo' | 'areas'

export default function Relatorios() {
  const [params, setParams] = useSearchParams()
  const aba = (params.get('aba') as Aba) || 'fechamento'
  const f = useFinanceiro()
  const tab = (k: Aba, t: string) => <button role="tab" type="button" aria-selected={aba === k} onClick={() => setParams({ aba: k })}>{t}</button>
  return (
    <>
      <div className="cabecalho"><div><h1>Relatórios</h1><p className="muted">Fechamento do mês, fluxo de caixa e o que mais dá lucro.</p></div></div>
      <div className="abas" role="tablist">{tab('fechamento', 'Fechamento do mês')}{tab('fluxo', 'Fluxo de caixa')}{tab('areas', 'Lucro por área')}</div>
      {f.carregando ? <Carregando /> : f.erro ? <ErroCaixa erro={f.erro} aoTentar={f.recarregar} /> : aba === 'fechamento' ? <Fechamento f={f} /> : aba === 'fluxo' ? <Fluxo f={f} /> : <Areas />}
    </>
  )
}

function Fechamento({ f }: { f: Financeiro }) {
  const { empresaId, empresa, ehProprietaria } = useEmpresa()
  const avisar = useAvisar()
  const fechamentos = useFechamentos(empresaId)
  const fechar = useFecharMes(empresaId)
  const reabrir = useReabrirMes()
  const [mes, setMes] = useState(f.mes)
  const [confirmando, setConfirmando] = useState(false)
  const r = f.resumoDe(mes)
  const fechamento = (fechamentos.data ?? []).find((x) => x.mes_referencia.slice(0, 7) === mes)
  const aReceber = f.lancamentos.filter((l) => !l.data_pagamento && l.tipo === 'entrada' && l.evento_id).reduce((t, l) => t + Number(l.valor), 0)
  const linhas = (lista: [string, number][]) => lista.map(([c, v]) => <div key={c} className="l recuo"><span>{f.nomeCategoria(c)}</span><span>{formatBRL(v)}</span></div>)
  const nome = nomeMes(mes)
  return (
    <section className="cartao">
      <div className="cartao-h">
        <div className="navmes">
          <button type="button" className="icone-btn" onClick={() => setMes(addMes(mes, -1))} disabled={mes <= addMes(f.mes, -(MESES_ANTES - 1))} aria-label="Mês anterior"><ChevronLeft size={20} /></button>
          <b>{nome}</b>
          <button type="button" className="icone-btn" onClick={() => setMes(addMes(mes, 1))} disabled={mes >= f.mes} aria-label="Próximo mês"><ChevronRight size={20} /></button>
        </div>
        <div className="acoes">
          {fechamento ? <span className="pill atencao"><Lock size={14} aria-hidden="true" /> Fechado em {dataBR(fechamento.criado_em.slice(0, 10))}</span> : <span className="pill neutro">Aberto</span>}
          <Exportar opcoes={[
            { rotulo: 'PDF do fechamento', formato: 'pdf', gerar: () => baixarPdfFechamento({ empresa, ym: mes, resumo: r, nomeCategoria: f.nomeCategoria, saldoHoje: f.saldoHoje, folegoMeses: f.folego, aReceber, fechadoEm: fechamento?.criado_em.slice(0, 10) ?? null }) },
            { rotulo: 'Planilha Excel', formato: 'xlsx', gerar: () => baixarExcel([abaFechamento(r, f.nomeCategoria, mes)], empresa, `fechamento-${mes}`) },
            { rotulo: 'CSV', formato: 'csv', gerar: async () => baixarCSV(abaFechamento(r, f.nomeCategoria, mes), `fechamento-${mes}`) },
          ]} />
        </div>
      </div>
      <div className="dre">
        <div className="sec">Entradas</div>{linhas(r.entradasPorCategoria)}<div className="l tot"><span>Total de entradas</span><span>{formatBRL(r.entradas)}</span></div>
        <div className="sec">Custos dos eventos</div>{linhas(r.variaveisPorCategoria)}<div className="l tot"><span>Total de custos variáveis</span><span>− {formatBRL(r.custosVariaveis)}</span></div>
        <div className="sec">Custos fixos</div>{linhas(r.fixosPorCategoria)}<div className="l tot"><span>Total de custos fixos</span><span>− {formatBRL(r.custosFixos)}</span></div>
        <div className="l grande"><span>Lucro do mês</span><span>{formatBRL(r.lucro)}</span></div>
        <div className="l"><span>Retiradas da proprietária</span><span>− {formatBRL(r.retiradas)}</span></div>
        <div className="l tot"><span>Ficou na empresa</span><span>{formatBRL(r.ficouNaEmpresa)}</span></div>
      </div>
      <p className="muted">Parte das entradas pode ser entrada de eventos que ainda vão acontecer. Faltam receber {formatBRL(aReceber)} de eventos já fechados.</p>
      {fechar.isError || reabrir.isError ? <p className="erro-caixa" role="alert">{mensagemErro(fechar.error ?? reabrir.error)}</p> : null}
      {ehProprietaria ? (
        fechamento ? (
          <div className="acoes" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-s" disabled={reabrir.isPending} onClick={async () => { await reabrir.mutateAsync(fechamento.id); avisar(`${nome} reaberto (fica registrado no histórico)`) }}>Reabrir {nome}</button>
          </div>
        ) : confirmando ? (
          <Confirmar titulo={`Fechar ${nome}?`} texto="Os lançamentos do mês ficam travados. Só a proprietária pode reabrir, e a reabertura fica registrada." rotulo="Fechar mês" perigo={false} ocupado={fechar.isPending}
            aoCancelar={() => setConfirmando(false)}
            aoConfirmar={async () => {
              await fechar.mutateAsync({ mes, resumo: { entradas: r.entradas, custos_variaveis: r.custosVariaveis, custos_fixos: r.custosFixos, lucro: r.lucro, retiradas: r.retiradas } })
              setConfirmando(false)
              avisar(`${nome} fechado`)
            }} />
        ) : (
          <div className="acoes" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-p" onClick={() => setConfirmando(true)}><Lock size={18} aria-hidden="true" />Fechar {nome}</button>
          </div>
        )
      ) : null}
    </section>
  )
}

function Fluxo({ f }: { f: Financeiro }) {
  const { empresa } = useEmpresa()
  const P = f.fluxo
  const W = 760, H = 300, L = 64, R = 16, T = 20, B = 36
  const pw = W - L - R, ph = H - T - B
  const hi = Math.max(1, ...P.map((m) => Math.max(m.entradas, m.saidas, m.saldoFinal)))
  const lo = Math.min(0, ...P.map((m) => m.saldoFinal))
  const bruto = (hi - lo) / 4
  const mag = Math.pow(10, Math.floor(Math.log10(bruto)))
  const passo = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => k >= bruto) ?? bruto
  const yMin = Math.floor(lo / passo) * passo
  const yMax = Math.ceil(hi / passo) * passo
  const y = (v: number) => T + ph - ((v - yMin) / (yMax - yMin)) * ph
  const gw = pw / P.length
  const bw = Math.min(16, gw * 0.28)
  const marcas: number[] = []
  for (let v = yMin; v <= yMax + 1e-6; v += passo) marcas.push(v)
  const pontos = P.map((m, i) => [L + gw * i + gw / 2, y(m.saldoFinal)] as const)
  const iHoje = P.findIndex((m) => m.ym === f.mes)
  const xHoje = L + gw * (iHoje + 1)
  return (
    <>
      {f.negativoEm ? <Alerta><b>Sem novos eventos, o caixa fica negativo em {nomeMes(f.negativoEm.ym)}.</b> A previsão conta as parcelas a receber, os custos fixos e uma retirada de {formatBRL0(f.retiradaMinima)} por mês. Cada evento novo empurra essa data para frente.</Alerta> : null}
      <section className="cartao">
        <div className="cartao-h">
          <h2>Fluxo de caixa</h2>
          <div className="acoes">
            <div className="legenda"><span><i style={{ background: 'var(--deco)' }} />Entradas</span><span><i style={{ background: 'var(--bar-s)' }} />Saídas</span><span><i style={{ background: 'var(--ink)', height: 3 }} />Saldo no fim do mês</span></div>
            <Exportar opcoes={[
              { rotulo: 'PDF do fluxo de caixa', formato: 'pdf', gerar: () => baixarPdfFluxo({ empresa, fluxo: P, retiradaMinima: f.retiradaMinima }) },
              { rotulo: 'Planilha Excel', formato: 'xlsx', gerar: () => baixarExcel([abaFluxo(P)], empresa, 'fluxo-de-caixa') },
              { rotulo: 'CSV', formato: 'csv', gerar: async () => baixarCSV(abaFluxo(P), 'fluxo-de-caixa') },
            ]} />
          </div>
        </div>
        <div className="grafico">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Entradas, saídas e saldo de ${nomeMes(P[0].ym)} a ${nomeMes(P[P.length - 1].ym)}`}>
            {marcas.map((v) => (
              <g key={v}>
                <line className={v === 0 ? 'g-zero' : 'g-grade'} x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
                <text className="g-txt" x={L - 8} y={y(v) + 4} textAnchor="end">{v === 0 ? 'R$ 0' : `${(v / 1000).toLocaleString('pt-BR')} mil`}</text>
              </g>
            ))}
            {P.map((m, i) => {
              const cx = L + gw * i + gw / 2
              const fut = m.previsto ? ' g-fut' : ''
              return (
                <g key={m.ym}>
                  <rect className={`g-e${fut}`} x={cx - bw - 1} y={y(Math.max(0, m.entradas))} width={bw} height={Math.max(0, y(0) - y(m.entradas))} rx={3} />
                  <rect className={`g-s${fut}`} x={cx + 1} y={y(Math.max(0, m.saidas))} width={bw} height={Math.max(0, y(0) - y(m.saidas))} rx={3} />
                  <text className="g-txt" x={cx} y={H - 12} textAnchor="middle">{mesCurto(m.ym)}</text>
                </g>
              )
            })}
            <polyline className="g-linha" points={pontos.map((p) => p.join(',')).join(' ')} />
            {pontos.map((p, i) => <circle key={i} className={`g-pt${P[i].saldoFinal < 0 ? ' neg' : ''}`} cx={p[0]} cy={p[1]} r={4} />)}
            {iHoje >= 0 && iHoje < P.length - 1 ? (
              <>
                <line className="g-hoje" x1={xHoje} x2={xHoje} y1={T} y2={T + ph} />
                <text className="g-rot" x={xHoje + 6} y={T + 10}>previsto</text>
              </>
            ) : null}
          </svg>
        </div>
        <div className="rolagem">
          <table className="tabela">
            <thead><tr><th scope="col">Mês</th><th scope="col">Entradas</th><th scope="col">Saídas</th><th scope="col">Saldo</th></tr></thead>
            <tbody>
              {P.map((m) => (
                <tr key={m.ym} className={m.previsto ? 'fut' : ''}>
                  <td>{mesCurto(m.ym)}{m.previsto ? ' (previsto)' : ''}</td>
                  <td>{formatBRL0(m.entradas)}</td><td>{formatBRL0(m.saidas)}</td>
                  <td className={m.saldoFinal < 0 ? 'neg' : ''}>{formatBRL0(m.saldoFinal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted">Os meses passados vêm dos lançamentos pagos. Os próximos somam o que está previsto e uma retirada mínima de {formatBRL0(f.retiradaMinima)} por mês (ajuste em Configurações).</p>
      </section>
    </>
  )
}

function Areas() {
  const { empresaId, empresa } = useEmpresa()
  const resultados = useResultadosEventos(empresaId)
  if (resultados.isPending) return <Carregando />
  if (resultados.isError) return <ErroCaixa erro={resultados.error} aoTentar={() => resultados.refetch()} />
  const realizados = (resultados.data ?? []).filter((r) => r.data_evento <= new Date().toISOString().slice(0, 10))
  const areas = lucroPorArea(realizados)
  const max = Math.max(1, ...areas.map((a) => a.receita))
  const melhor = [...areas].filter((a) => a.receita > 0).sort((a, b) => b.margem - a.margem)[0]
  return (
    <section className="cartao">
      <div className="cartao-h">
        <h2>Lucro por área</h2>
        <Exportar opcoes={[
          { rotulo: 'Lucro por evento (Excel)', formato: 'xlsx', gerar: () => baixarExcel([abaEventos(realizados)], empresa, 'lucro-por-evento') },
          { rotulo: 'Lucro por evento (CSV)', formato: 'csv', gerar: async () => baixarCSV(abaEventos(realizados), 'lucro-por-evento') },
        ]} />
      </div>
      <p className="muted">Eventos já realizados. Lucro = valor do evento menos os custos lançados nele.</p>
      {areas.map((a) => (
        <div key={a.fonte} className="hbar">
          <div className="topo3">
            <b>{FONTE_NOME[a.fonte]}{melhor?.fonte === a.fonte ? <span className="pill bom" style={{ marginLeft: 8 }}>Maior margem</span> : null}</b>
            <span className="num">{formatBRL0(a.lucro)} de lucro · margem {formatPct(a.margem)}</span>
          </div>
          <div className="trilho" role="img" aria-label={`${FONTE_NOME[a.fonte]}: receita ${formatBRL0(a.receita)}, custos ${formatBRL0(a.custos)}`}>
            <i style={{ width: `${(Math.max(0, a.lucro) / max) * 100}%`, background: 'var(--deco)' }} />
            <i style={{ width: `${(a.custos / max) * 100}%`, background: 'var(--bar-s)' }} />
          </div>
          <span className="muted num" style={{ fontSize: 14 }}>Receita {formatBRL0(a.receita)} · custos {formatBRL0(a.custos)}</span>
        </div>
      ))}
      <div className="legenda"><span><i style={{ background: 'var(--deco)' }} />Lucro</span><span><i style={{ background: 'var(--bar-s)' }} />Custos</span></div>
    </section>
  )
}
