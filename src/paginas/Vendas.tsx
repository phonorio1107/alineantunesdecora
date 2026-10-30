import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, FilePen, FileSignature, PartyPopper, Plus } from 'lucide-react'
import { useEmpresa, useFolhas } from '../app/contexto'
import { useClientes, useContratos, useEventos, useResultadosEventos } from '../data/consultas'
import type { Evento } from '../data/tipos'
import { Carregando, ErroCaixa, Exportar, Vazio } from '../components/ui'
import { abaEventos, baixarCSV, baixarExcel } from '../export/acoes'
import { areasDe } from '../lib/calculos'
import { addDias, dataBR, formatBRL0, hoje } from '../lib/format'
import { CartaoEvento, FONTE_NOME, type Aba } from './Eventos'
import { EmitirFolha, ListaContratos } from './Contratos'

const ABAS: [Aba, string, typeof FilePen][] = [['orcamentos', 'Orçamentos', FilePen], ['contratos', 'Contratos', FileSignature], ['eventos', 'Eventos', PartyPopper]]

export default function Vendas() {
  const { empresaId, empresa, veFinanceiro, ehProprietaria } = useEmpresa()
  const { abrir } = useFolhas()
  const [params, setParams] = useSearchParams()
  const aba = (ABAS.some(([k]) => k === params.get('aba')) ? params.get('aba') : 'orcamentos') as Aba
  const eventos = useEventos(empresaId)
  const resultados = useResultadosEventos(empresaId)
  const todos = eventos.data ?? []
  const contagem = {
    orcamentos: todos.filter((e) => e.status === 'orcamento').length,
    contratos: todos.filter((e) => e.status === 'confirmado' && e.data_evento >= hoje()).length,
    eventos: 0,
  }
  const planilha = () => abaEventos(resultados.data ?? [])
  return (
    <>
      <div className="cabecalho">
        <div><h1>Vendas</h1><p className="muted">Do orçamento ao contrato e ao evento, tudo no mesmo lugar.</p></div>
        <div className="acoes">
          {veFinanceiro ? (
            <Exportar opcoes={[
              { rotulo: 'Lucro por evento (Excel)', formato: 'xlsx', gerar: () => baixarExcel([planilha()], empresa, 'lucro-por-evento') },
              { rotulo: 'Lucro por evento (CSV)', formato: 'csv', gerar: async () => baixarCSV(planilha(), 'lucro-por-evento') },
            ]} />
          ) : null}
          <button type="button" className="btn btn-p" onClick={() => abrir({ tipo: 'novo-evento' })}><Plus size={20} aria-hidden="true" />Novo orçamento</button>
        </div>
      </div>
      <nav className="etapas" aria-label="Etapas da venda">
        {ABAS.map(([k, t, Icone], i) => (
          <button key={k} type="button" className="etapa" aria-current={aba === k ? 'page' : undefined} onClick={() => setParams({ aba: k }, { replace: true })}>
            <span className="etapa-n" aria-hidden="true"><Icone size={18} /></span>
            <span className="etapa-t">{t}{contagem[k] ? <span className="etapa-c">{contagem[k]}</span> : null}</span>
            {i < ABAS.length - 1 ? <ChevronRight className="etapa-seta" size={18} aria-hidden="true" /> : null}
          </button>
        ))}
      </nav>
      {eventos.isPending ? <Carregando /> : eventos.isError ? <ErroCaixa erro={eventos.error} aoTentar={() => eventos.refetch()} /> : (
        <div key={aba} className="troca-aba">
          {aba === 'orcamentos' ? <Orcamentos eventos={todos} /> : aba === 'contratos' ? <Contratos eventos={todos} proprietaria={ehProprietaria} /> : <Eventos eventos={todos} />}
        </div>
      )}
    </>
  )
}

function Orcamentos({ eventos }: { eventos: Evento[] }) {
  const { empresaId } = useEmpresa()
  const clientes = useClientes(empresaId)
  const [verTodos, setVerTodos] = useState(false)
  const abertos = eventos.filter((e) => e.status === 'orcamento').sort((a, b) => a.data_evento.localeCompare(b.data_evento))
  const naoFecharam = eventos.filter((e) => e.status === 'cancelado' && !e.fechado_em && e.data_evento >= addDias(hoje(), -180))
  const nome = (id: string | null) => clientes.data?.find((c) => c.id === id)?.nome
  return (
    <>
      <p className="muted">Evento ainda não fechado. Monte a lista de peças e serviços, anote o rascunho e toque em “Fechar venda” quando o cliente confirmar.</p>
      {abertos.length ? (
        <section className="cartao">
          <div className="linhas">
            {abertos.map((e) => {
              const passou = e.data_evento < hoje()
              return (
                <Link key={e.id} className="linha" to={`/vendas/${e.id}`}>
                  <span className="data-bloco pequeno"><b>{e.data_evento.slice(8, 10)}</b><span>{dataBR(e.data_evento).slice(3, 5)}</span></span>
                  <span className="cresce">
                    <span className="t">{e.titulo}</span>
                    <span className="s">{[nome(e.cliente_id), areasDe(e).map((a) => FONTE_NOME[a]).join(' + '), e.criado_em ? `feito em ${dataBR(e.criado_em.slice(0, 10))}` : null].filter(Boolean).join(' · ')}</span>
                  </span>
                  {passou ? <span className="pill ruim">Data passou</span> : Number(e.valor_fechado) ? <span className="v">{formatBRL0(Number(e.valor_fechado))}</span> : <span className="pill neutro">Rascunho</span>}
                </Link>
              )
            })}
          </div>
        </section>
      ) : <Vazio titulo="Nenhum orçamento em aberto." texto="Toque em “Novo orçamento” quando alguém pedir preço." />}
      {naoFecharam.length ? (
        <>
          <button type="button" className="btn btn-g btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setVerTodos(!verTodos)}>{verTodos ? 'Esconder' : 'Ver'} os que não fecharam ({naoFecharam.length})</button>
          {verTodos ? <div className="grade-eventos">{naoFecharam.map((e) => <CartaoEvento key={e.id} evento={e} />)}</div> : null}
        </>
      ) : null}
    </>
  )
}

function Contratos({ eventos, proprietaria }: { eventos: Evento[]; proprietaria: boolean }) {
  const contratos = useContratos(useEmpresa().empresaId, proprietaria)
  const [emitindo, setEmitindo] = useState<string | null>(null)
  const resultados = useResultadosEventos(useEmpresa().empresaId)
  const fechadas = eventos.filter((e) => e.status === 'confirmado' && e.data_evento >= hoje()).sort((a, b) => a.data_evento.localeCompare(b.data_evento))
  const comContrato = new Set((contratos.data ?? []).filter((c) => !c.cancelado_em).map((c) => c.evento_id))
  const semContrato = proprietaria ? fechadas.filter((e) => e.cliente_id && !comContrato.has(e.id)) : []
  return (
    <>
      <p className="muted">Venda fechada vira contrato (a ordem de serviço do evento). Daqui sai o PDF para o cliente assinar.</p>
      {semContrato.length ? (
        <section className="cartao" aria-labelledby="t-sem">
          <div className="cartao-h"><h2 id="t-sem">Fechadas, sem contrato ainda</h2></div>
          <div className="linhas">
            {semContrato.map((e) => (
              <div key={e.id} className="linha">
                <Link className="cresce" to={`/vendas/${e.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  <span className="t">{e.titulo}</span>
                  <span className="s">{dataBR(e.data_evento)}</span>
                </Link>
                <button type="button" className="btn btn-s btn-sm" onClick={() => setEmitindo(e.id)}><FileSignature size={16} aria-hidden="true" />Gerar contrato</button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {proprietaria ? <ListaContratos /> : (
        fechadas.length
          ? <div className="grade-eventos">{fechadas.map((e) => <CartaoEvento key={e.id} evento={e} resultado={resultados.data?.find((r) => r.evento_id === e.id)} />)}</div>
          : <Vazio titulo="Nenhuma venda fechada por vir." />
      )}
      {emitindo ? <EmitirFolha eventoInicial={emitindo} aoFechar={() => setEmitindo(null)} /> : null}
    </>
  )
}

function Eventos({ eventos }: { eventos: Evento[] }) {
  const { empresaId } = useEmpresa()
  const resultados = useResultadosEventos(empresaId)
  const [quais, setQuais] = useState<'proximos' | 'realizados'>('proximos')
  const vendidos = eventos.filter((e) => e.status !== 'orcamento' && !(e.status === 'cancelado' && !e.fechado_em))
  const lista = vendidos
    .filter((e) => (quais === 'proximos' ? e.data_evento >= hoje() : e.data_evento < hoje()))
    .sort((a, b) => (quais === 'proximos' ? a.data_evento.localeCompare(b.data_evento) : b.data_evento.localeCompare(a.data_evento)))
  return (
    <>
      <div className="abas" role="tablist">
        <button role="tab" type="button" aria-selected={quais === 'proximos'} onClick={() => setQuais('proximos')}>Próximos</button>
        <button role="tab" type="button" aria-selected={quais === 'realizados'} onClick={() => setQuais('realizados')}>Realizados</button>
      </div>
      {lista.length
        ? <div className="grade-eventos">{lista.map((e) => <CartaoEvento key={e.id} evento={e} resultado={resultados.data?.find((r) => r.evento_id === e.id)} />)}</div>
        : <Vazio titulo={quais === 'proximos' ? 'Nenhum evento marcado.' : 'Nenhum evento realizado ainda.'} texto="Entrada, saída, logística e custos de cada evento ficam aqui." />}
    </>
  )
}
