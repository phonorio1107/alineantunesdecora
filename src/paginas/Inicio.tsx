import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAvisar, useEmpresa, useFolhas } from '../app/contexto'
import { useFinanceiro } from '../app/dados'
import { useEventos, useMarcarPago, useResultadosEventos } from '../data/consultas'
import { LinhaLancamento } from '../components/LinhaLancamento'
import { CartaoEvento } from './Eventos'
import { Alerta, Carregando, ErroCaixa, Vazio } from '../components/ui'
import { addDias, dataBR, formatBRL, formatBRL0, formatMeses, hoje, MESES, nomeMes } from '../lib/format'
import { mensagemErro } from '../lib/erros'

export default function Inicio() {
  const { empresaId, veFinanceiro } = useEmpresa()
  const eventos = useEventos(empresaId)
  const resultados = useResultadosEventos(empresaId)
  const proximos = (eventos.data ?? []).filter((e) => e.data_evento >= hoje() && e.status !== 'cancelado').sort((a, b) => a.data_evento.localeCompare(b.data_evento)).slice(0, 4)
  return (
    <>
      {veFinanceiro ? <PainelFinanceiro /> : (
        <div className="cabecalho"><div><span className="eyebrow">{nomeMes(hoje().slice(0, 7))}</span><h1>Olá!</h1></div></div>
      )}
      <section className="cartao" aria-labelledby="t-prox">
        <div className="cartao-h"><h2 id="t-prox">Próximos eventos</h2><Link className="btn btn-g btn-sm" to="/eventos">Ver todos</Link></div>
        {eventos.isPending ? <Carregando /> : eventos.isError ? <ErroCaixa erro={eventos.error} aoTentar={() => eventos.refetch()} /> : proximos.length ? (
          <div className="grade-eventos">{proximos.map((e) => <CartaoEvento key={e.id} evento={e} resultado={resultados.data?.find((r) => r.evento_id === e.id)} />)}</div>
        ) : <Vazio titulo="Nenhum evento marcado." texto="Quando fechar uma festa, ela aparece aqui." />}
      </section>
    </>
  )
}

function PainelFinanceiro() {
  const f = useFinanceiro()
  const { empresa } = useEmpresa()
  const { abrir } = useFolhas()
  const avisar = useAvisar()
  const marcar = useMarcarPago()
  const eventos = useEventos(useEmpresa().empresaId)
  const titulo = new Map((eventos.data ?? []).map((e) => [e.id, e.titulo]))

  if (f.carregando) return <Carregando texto="Calculando seus números…" />
  if (f.erro) return <ErroCaixa erro={f.erro} aoTentar={f.recarregar} />

  const meta = Number(empresa.reserva_meses)
  const classe = f.folego < 1 ? 'ruim' : f.folego < meta ? 'atencao' : 'bom'
  const limite = addDias(f.hoje, 30)
  const previstos = f.lancamentos.filter((l) => !l.data_pagamento && l.data_vencimento <= limite).sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
  const receber = previstos.filter((l) => l.tipo === 'entrada')
  const pagar = previstos.filter((l) => l.tipo === 'saida')
  const botao = (id: string, entrada: boolean) => (
    <button type="button" className="btn btn-s btn-sm" disabled={marcar.isPending}
      onClick={async () => { await marcar.mutateAsync({ id, data: hoje() }); avisar(entrada ? 'Recebimento confirmado' : 'Pagamento confirmado') }}>
      {entrada ? 'Recebi' : 'Paguei'}
    </button>
  )
  const mesNome = MESES[Number(f.mes.slice(5, 7)) - 1]

  return (
    <>
      <div className="cabecalho">
        <div>
          <span className="eyebrow">{nomeMes(f.mes)}</span>
          <h1>Olá, <em>{(empresa.responsavel_nome ?? 'Aline').split(' ')[0]}!</em></h1>
          <p className="muted">Seus números de hoje, {dataBR(f.hoje)}.</p>
        </div>
        <button className="btn btn-p" type="button" onClick={() => abrir({ tipo: 'lancar' })}><Plus size={20} aria-hidden="true" />Lançar entrada ou saída</button>
      </div>
      <section className="numeros" aria-label="Resumo">
        <div className="numero"><span className="rot">Saldo hoje</span><span className="val">{formatBRL(f.saldoHoje)}</span><span className="sub">em {f.saldos.length} {f.saldos.length === 1 ? 'conta' : 'contas'}</span></div>
        <div className="numero"><span className="rot">Lucro de {mesNome}</span><span className="val">{formatBRL(f.resumo.lucro)}</span><span className="sub">{formatBRL0(f.resumo.entradas)} entraram − {formatBRL0(f.resumo.custosVariaveis + f.resumo.custosFixos)} de custos</span></div>
        <div className="numero destaque"><span className="rot">Sobrou para você</span><span className="val">{formatBRL(f.resumo.retiradas)}</span><span className="sub">retirado em {mesNome}. Ainda dá para retirar até <b>{formatBRL0(f.podeRetirar)}</b> mantendo a reserva.</span></div>
        <div className="numero">
          <span className="rot">Fôlego do caixa</span>
          <span className="val">{Number.isFinite(f.folego) ? `${formatMeses(f.folego)} meses` : 'Sem custos fixos'}</span>
          <div className={`medidor ${classe}`} role="img" aria-label={`${formatMeses(Math.min(f.folego, 99))} de ${meta} meses da meta`}><i style={{ width: `${Math.min(100, (f.folego / Math.max(meta, 0.1)) * 100)}%` }} /></div>
          <span className="sub">{f.folego >= meta ? `Acima da meta de ${meta} meses` : `Meta: ${meta} meses sem receber`}</span>
        </div>
      </section>
      {f.negativoEm ? (
        <Alerta><b>Sem novos eventos, o caixa fica negativo em {nomeMes(f.negativoEm.ym)}.</b> Isso já conta os custos fixos e uma retirada de {formatBRL0(f.retiradaMinima)} por mês. <Link to="/relatorios?aba=fluxo">Ver o fluxo de caixa</Link></Alerta>
      ) : null}
      {marcar.isError ? <p className="erro-caixa" role="alert">{mensagemErro(marcar.error)}</p> : null}
      <div className="grade2">
        <section className="cartao" aria-labelledby="t-rec">
          <div className="cartao-h"><h2 id="t-rec">A receber</h2><span className="muted">próximos 30 dias</span></div>
          <div className="linhas">
            {receber.length ? receber.map((l) => <LinhaLancamento key={l.id} l={l} categoria={f.nomeCategoria(l.categoria_id)} evento={l.evento_id ? titulo.get(l.evento_id) : undefined} acao={botao(l.id, true)} />)
              : <Vazio titulo="Nada a receber nos próximos 30 dias." texto="Quando fechar um evento, as parcelas aparecem aqui." />}
          </div>
        </section>
        <section className="cartao" aria-labelledby="t-pag">
          <div className="cartao-h"><h2 id="t-pag">A pagar</h2><span className="muted">próximos 30 dias</span></div>
          <div className="linhas">
            {pagar.length ? pagar.map((l) => <LinhaLancamento key={l.id} l={l} categoria={f.nomeCategoria(l.categoria_id)} evento={l.evento_id ? titulo.get(l.evento_id) : undefined} acao={botao(l.id, false)} />)
              : <Vazio titulo="Nenhuma conta a pagar." texto="Custos fixos e compras previstas aparecem aqui." />}
          </div>
        </section>
      </div>
    </>
  )
}
