import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Check, Clock, MapPin, Plus } from 'lucide-react'
import { useAvisar, useEmpresa, useFolhas } from '../app/contexto'
import { useFinanceiro } from '../app/dados'
import { useClientes, useEventos, useMarcarPago, useResultadosEventos } from '../data/consultas'
import type { Evento, ResultadoEvento } from '../data/tipos'
import { LinhaLancamento } from '../components/LinhaLancamento'
import { Alerta, Carregando, ErroCaixa, Vazio } from '../components/ui'
import { lucroEvento } from '../lib/calculos'
import { addDias, daysUntil, formatBRL, formatBRL0, formatMeses, hoje, MESES, parseDate } from '../lib/format'
import { mensagemErro } from '../lib/erros'

const semMovimento = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Número que sobe até o valor na primeira vez que a tela abre (uma vez só; sem movimento se a pessoa pediu). */
function useContagem(alvo: number) {
  const [v, setV] = useState(() => (semMovimento() ? alvo : 0))
  const feito = useRef(false)
  useEffect(() => {
    if (feito.current || semMovimento()) { setV(alvo); return }
    feito.current = true
    const t0 = performance.now()
    let id = 0
    const passo = (t: number) => {
      const k = Math.min(1, (t - t0) / 700)
      setV(alvo * (1 - Math.pow(1 - k, 3)))
      if (k < 1) id = requestAnimationFrame(passo)
    }
    id = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(id)
  }, [alvo])
  return v
}

function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

const hora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace('.', '').replace(',', '')

function faltam(data: string) {
  const n = daysUntil(data)
  if (n === 0) return 'É hoje'
  if (n === 1) return 'Amanhã'
  return `Faltam ${n} dias`
}

/** O convite do próximo evento: a peça principal do Início. */
function primeiraVez(chave: string) {
  try {
    if (sessionStorage.getItem(chave)) return false
    sessionStorage.setItem(chave, '1')
  } catch { /* sem armazenamento: anima sempre */ }
  return true
}

function Convite({ evento: e, resultado, clienteNome }: { evento: Evento; resultado?: ResultadoEvento; clienteNome?: string }) {
  const { veFinanceiro } = useEmpresa()
  const [chega] = useState(() => primeiraVez('convite-visto'))
  const d = parseDate(e.data_evento)
  const semana = d.toLocaleDateString('pt-BR', { weekday: 'long' })
  const l = resultado ? lucroEvento(resultado) : null
  const recebido = Number(resultado?.recebido ?? 0)
  const pct = l && l.receita ? Math.min(100, (recebido / l.receita) * 100) : 0
  const local = [e.local_nome, e.cidade].filter(Boolean).join(', ')
  return (
    <article className={`convite${chega ? ' chega' : ''}`} aria-labelledby="convite-t">
      <div className="convite-data" aria-hidden="true">
        <span className="convite-semana">{semana}</span>
        <span className="convite-dia">{Number(e.data_evento.slice(8, 10))}</span>
        <span className="convite-mes">{MESES[d.getMonth()]}</span>
      </div>
      <div className="convite-corpo">
        <span className="convite-falta">{faltam(e.data_evento)}</span>
        <h2 id="convite-t" className="convite-titulo">{e.titulo}</h2>
        <p className="sr-only">{semana}, {d.toLocaleDateString('pt-BR')}</p>
        {clienteNome ? <p className="convite-cliente">{clienteNome}</p> : null}
        <ul className="convite-detalhes">
          {local ? <li><MapPin size={16} aria-hidden="true" />{local}</li> : null}
          {e.entrega_em ? <li><Clock size={16} aria-hidden="true" />Entrega {hora(e.entrega_em)}</li> : null}
          {e.devolucao_em ? <li><Clock size={16} aria-hidden="true" />Devolução {hora(e.devolucao_em)}</li> : null}
        </ul>
        {veFinanceiro && l && l.receita > 0 ? (
          <div className="convite-pago">
            <span className="num">{recebido >= l.receita ? 'Tudo recebido' : `Recebido ${formatBRL0(recebido)} de ${formatBRL0(l.receita)}`}</span>
            <span className="fio" role="img" aria-label={`${Math.round(pct)}% recebido`}><i style={{ width: `${pct}%` }} /></span>
          </div>
        ) : null}
        <Link className="btn btn-s convite-abrir" to={`/vendas/${e.id}`}>Abrir evento</Link>
      </div>
    </article>
  )
}

function ConviteVazio() {
  const { abrir } = useFolhas()
  return (
    <article className="convite convite-vazio">
      <div className="convite-corpo">
        <h2 className="convite-titulo">Nenhum evento marcado por enquanto.</h2>
        <p className="convite-cliente">Quando fechar a próxima, ela aparece aqui com a contagem dos dias.</p>
        <button type="button" className="btn btn-p" onClick={() => abrir({ tipo: 'novo-evento' })}><Plus size={18} aria-hidden="true" />Novo orçamento</button>
      </div>
    </article>
  )
}

export default function Inicio() {
  const { empresaId, empresa, veFinanceiro } = useEmpresa()
  const { abrir } = useFolhas()
  const eventos = useEventos(empresaId)
  const resultados = useResultadosEventos(empresaId)
  const clientes = useClientes(empresaId)
  const proximos = (eventos.data ?? []).filter((e) => e.data_evento >= hoje() && e.status !== 'cancelado' && e.status !== 'orcamento').sort((a, b) => a.data_evento.localeCompare(b.data_evento))
  const [primeiro, ...depois] = proximos
  const nomeCliente = (id: string | null) => clientes.data?.find((c) => c.id === id)?.nome
  const nome = (empresa.responsavel_nome ?? 'Aline').split(' ')[0]
  const hojeTexto = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="inicio">
      <header className="cabecalho">
        <div>
          <h1>{saudacao()}, {nome}</h1>
          <p className="muted">{hojeTexto.charAt(0).toUpperCase() + hojeTexto.slice(1)}</p>
        </div>
        {veFinanceiro ? <button className="btn btn-p" type="button" onClick={() => abrir({ tipo: 'lancar' })}><Plus size={20} aria-hidden="true" />Lançar entrada ou saída</button> : null}
      </header>

      <div className="palco">
        {eventos.isPending ? <Carregando /> : eventos.isError ? <ErroCaixa erro={eventos.error} aoTentar={() => eventos.refetch()} />
          : primeiro ? <Convite evento={primeiro} resultado={resultados.data?.find((r) => r.evento_id === primeiro.id)} clienteNome={nomeCliente(primeiro.cliente_id)} /> : <ConviteVazio />}
        {veFinanceiro ? <Livro /> : null}
      </div>

      {depois.length ? (
        <section className="cartao" aria-labelledby="t-depois">
          <div className="cartao-h"><h2 id="t-depois">Depois dessa</h2><Link className="btn btn-g btn-sm" to="/agenda"><CalendarDays size={16} aria-hidden="true" />Ver a agenda</Link></div>
          <ol className="fila">
            {depois.slice(0, 4).map((e) => (
              <li key={e.id}>
                <Link to={`/vendas/${e.id}`}>
                  <span className="fila-data"><b>{Number(e.data_evento.slice(8, 10))}</b>{MESES[Number(e.data_evento.slice(5, 7)) - 1].slice(0, 3)}</span>
                  <span className="fila-t">{e.titulo}<small>{nomeCliente(e.cliente_id) ?? e.cidade ?? ''}</small></span>
                  <span className="fila-falta">{faltam(e.data_evento)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {veFinanceiro ? <Contas /> : null}
    </div>
  )
}

/** Coluna de livro-caixa: os quatro números do mês, em linhas, sem caixas iguais. */
function Livro() {
  const f = useFinanceiro()
  const { empresa } = useEmpresa()
  const saldo = useContagem(f.carregando ? 0 : f.saldoHoje)
  const lucro = useContagem(f.carregando ? 0 : f.resumo.lucro)
  if (f.carregando) return <aside className="livro"><Carregando texto="Calculando seus números…" /></aside>
  if (f.erro) return <aside className="livro"><ErroCaixa erro={f.erro} aoTentar={f.recarregar} /></aside>
  const meta = Number(empresa.reserva_meses)
  const classe = f.folego < 1 ? 'ruim' : f.folego < meta ? 'atencao' : 'bom'
  const mesNome = MESES[Number(f.mes.slice(5, 7)) - 1]
  return (
    <aside className="livro" aria-labelledby="t-livro">
      <h2 id="t-livro" className="livro-t">{mesNome.charAt(0).toUpperCase() + mesNome.slice(1)}</h2>
      <dl>
        <div className="livro-l"><dt>Saldo hoje</dt><dd className="num">{formatBRL(saldo)}</dd><span className="livro-s">em {f.saldos.length} {f.saldos.length === 1 ? 'conta' : 'contas'}</span></div>
        <div className="livro-l"><dt>Lucro do mês</dt><dd className="num">{formatBRL(lucro)}</dd><span className="livro-s">{formatBRL0(f.resumo.entradas)} entraram, {formatBRL0(f.resumo.custosVariaveis + f.resumo.custosFixos)} de custos</span></div>
        <div className="livro-l livro-voce"><dt>Sobrou para você</dt><dd className="num">{formatBRL(f.resumo.retiradas)}</dd><span className="livro-s">Ainda dá para retirar até <b>{formatBRL0(f.podeRetirar)}</b> mantendo a reserva.</span></div>
        <div className="livro-l">
          <dt>Fôlego do caixa</dt>
          <dd className="num">{Number.isFinite(f.folego) ? `${formatMeses(f.folego)} meses` : 'Sem custos fixos'}</dd>
          <div className={`medidor ${classe}`} role="img" aria-label={`${formatMeses(Math.min(f.folego, 99))} de ${meta} meses da meta`}><i style={{ width: `${Math.min(100, (f.folego / Math.max(meta, 0.1)) * 100)}%` }} /></div>
          <span className="livro-s">{f.folego >= meta ? `Acima da meta de ${meta} meses` : `Meta: ${meta} meses sem receber`}</span>
        </div>
      </dl>
    </aside>
  )
}

/** A receber e a pagar nos próximos 30 dias. "Recebi" e "Paguei" saem da lista com um sinal de confirmado. */
function Contas() {
  const f = useFinanceiro()
  const { empresaId } = useEmpresa()
  const avisar = useAvisar()
  const marcar = useMarcarPago()
  const eventos = useEventos(empresaId)
  const [saindo, setSaindo] = useState<Set<string>>(new Set())
  if (f.carregando || f.erro) return null
  const titulo = new Map((eventos.data ?? []).map((e) => [e.id, e.titulo]))
  const limite = addDias(f.hoje, 30)
  const previstos = f.lancamentos.filter((l) => !l.data_pagamento && l.data_vencimento <= limite).sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
  const receber = previstos.filter((l) => l.tipo === 'entrada')
  const pagar = previstos.filter((l) => l.tipo === 'saida')
  const confirmar = async (id: string, entrada: boolean) => {
    setSaindo((s) => new Set(s).add(id))
    await new Promise((r) => setTimeout(r, semMovimento() ? 0 : 320))
    try {
      await marcar.mutateAsync({ id, data: hoje() })
      avisar(entrada ? 'Recebimento confirmado' : 'Pagamento confirmado')
    } finally {
      setSaindo((s) => { const n = new Set(s); n.delete(id); return n })
    }
  }
  const botao = (id: string, entrada: boolean) => (
    <button type="button" className="btn btn-s btn-sm" disabled={saindo.has(id)} onClick={() => confirmar(id, entrada)}>
      {saindo.has(id) ? <Check size={16} aria-hidden="true" /> : null}{entrada ? 'Recebi' : 'Paguei'}
    </button>
  )
  return (
    <>
      {f.negativoEm ? (
        <Alerta><b>Sem novos eventos, o caixa fica negativo em {MESES[Number(f.negativoEm.ym.slice(5, 7)) - 1]} de {f.negativoEm.ym.slice(0, 4)}.</b> Isso já conta os custos fixos e uma retirada de {formatBRL0(f.retiradaMinima)} por mês. <Link to="/relatorios?aba=fluxo">Ver o fluxo de caixa</Link></Alerta>
      ) : null}
      {marcar.isError ? <p className="erro-caixa" role="alert">{mensagemErro(marcar.error)}</p> : null}
      <div className="grade2">
        <section className="cartao" aria-labelledby="t-rec">
          <div className="cartao-h"><h2 id="t-rec">A receber</h2><span className="muted">próximos 30 dias</span></div>
          <div className="linhas">
            {receber.length ? receber.map((l) => <div key={l.id} className={saindo.has(l.id) ? 'saindo' : undefined}><LinhaLancamento l={l} categoria={f.nomeCategoria(l.categoria_id)} evento={l.evento_id ? titulo.get(l.evento_id) : undefined} acao={botao(l.id, true)} /></div>)
              : <Vazio titulo="Nada a receber nos próximos 30 dias." texto="Quando fechar um evento, as parcelas aparecem aqui." />}
          </div>
        </section>
        <section className="cartao" aria-labelledby="t-pag">
          <div className="cartao-h"><h2 id="t-pag">A pagar</h2><span className="muted">próximos 30 dias</span></div>
          <div className="linhas">
            {pagar.length ? pagar.map((l) => <div key={l.id} className={saindo.has(l.id) ? 'saindo' : undefined}><LinhaLancamento l={l} categoria={f.nomeCategoria(l.categoria_id)} evento={l.evento_id ? titulo.get(l.evento_id) : undefined} acao={botao(l.id, false)} /></div>)
              : <Vazio titulo="Nenhuma conta a pagar." texto="Custos fixos e compras previstas aparecem aqui." />}
          </div>
        </section>
      </div>
    </>
  )
}
