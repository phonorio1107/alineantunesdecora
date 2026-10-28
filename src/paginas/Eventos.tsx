import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, FileSignature, Plus, Receipt } from 'lucide-react'
import { useAvisar, useEmpresa, useFolhas } from '../app/contexto'
import {
  buscarDocumento, useAtualizarEvento, useCategorias, useClientes, useContas, useCriarInscricao, useEventos, useInscricoes,
  useMarcarPago, usePagarInscricao, useResultadosEventos,
} from '../data/consultas'
import type { Evento, Lancamento, ResultadoEvento, StatusEvento } from '../data/tipos'
import { esquemaInscricao } from '../data/esquemas'
import { LinhaLancamento, Situacao } from '../components/LinhaLancamento'
import { Campo, Carregando, ErroCaixa, Exportar, Vazio } from '../components/ui'
import { abaEventos, baixarCSV, baixarExcel, baixarPdfEvento, baixarRecibo } from '../export/acoes'
import { lucroEvento } from '../lib/calculos'
import { dataBR, formatBRL, formatBRL0, formatPct, formatTelefone, hoje, MESES } from '../lib/format'
import { mensagemErro, verificar } from '../lib/erros'
import { supabase } from '../lib/supabase'
import { useQuery } from '@tanstack/react-query'

export const FONTE_NOME = { decoracao: 'Decoração', assessoria: 'Assessoria', workshop: 'Workshop' } as const
const STATUS_NOME: Record<StatusEvento, string> = { confirmado: 'Confirmado', realizado: 'Realizado', cancelado: 'Cancelado' }

export function CartaoEvento({ evento: e, resultado }: { evento: Evento; resultado?: ResultadoEvento }) {
  const { empresaId, veFinanceiro } = useEmpresa()
  const clientes = useClientes(empresaId)
  const cliente = clientes.data?.find((c) => c.id === e.cliente_id)
  const l = resultado ? lucroEvento(resultado) : null
  const recebido = Number(resultado?.recebido ?? 0)
  const pct = l && l.receita ? Math.min(100, (recebido / l.receita) * 100) : 0
  return (
    <Link className="evento" to={`/eventos/${e.id}`}>
      <span className="data-bloco"><b>{e.data_evento.slice(8, 10)}</b><span>{MESES[Number(e.data_evento.slice(5, 7)) - 1].slice(0, 3)}</span></span>
      <span className="cresce">
        <span className="t">{e.titulo}</span>
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="pill marca">{FONTE_NOME[e.fonte]}</span>
          {e.status !== 'confirmado' ? <span className={`pill ${e.status === 'cancelado' ? 'ruim' : 'bom'}`}>{STATUS_NOME[e.status]}</span> : null}
          <span className="muted" style={{ fontSize: 14 }}>{cliente?.nome ?? e.cidade ?? ''}</span>
        </span>
        {veFinanceiro && l ? (
          <span className="muted num" style={{ fontSize: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
            Recebido {formatBRL0(recebido)} de {formatBRL0(l.receita)}
            <span className="medidor"><i style={{ width: `${pct}%` }} /></span>
          </span>
        ) : null}
      </span>
    </Link>
  )
}

export default function Eventos() {
  const { empresaId, empresa, veFinanceiro } = useEmpresa()
  const { abrir } = useFolhas()
  const eventos = useEventos(empresaId)
  const resultados = useResultadosEventos(empresaId)
  const [aba, setAba] = useState<'proximos' | 'realizados'>('proximos')
  const lista = (eventos.data ?? [])
    .filter((e) => (aba === 'proximos' ? e.data_evento >= hoje() : e.data_evento < hoje()))
    .sort((a, b) => (aba === 'proximos' ? a.data_evento.localeCompare(b.data_evento) : b.data_evento.localeCompare(a.data_evento)))
  const planilha = () => abaEventos(resultados.data ?? [])
  return (
    <>
      <div className="cabecalho">
        <div><h1>Eventos</h1><p className="muted">Festas, assessorias e workshops, com o lucro de cada um.</p></div>
        <div className="acoes">
          {veFinanceiro ? (
            <Exportar opcoes={[
              { rotulo: 'Lucro por evento (Excel)', formato: 'xlsx', gerar: () => baixarExcel([planilha()], empresa, 'lucro-por-evento') },
              { rotulo: 'Lucro por evento (CSV)', formato: 'csv', gerar: async () => baixarCSV(planilha(), 'lucro-por-evento') },
            ]} />
          ) : null}
          <button type="button" className="btn btn-p" onClick={() => abrir({ tipo: 'novo-evento' })}><Plus size={20} aria-hidden="true" />Novo evento</button>
        </div>
      </div>
      <div className="abas" role="tablist">
        <button role="tab" type="button" aria-selected={aba === 'proximos'} onClick={() => setAba('proximos')}>Próximos</button>
        <button role="tab" type="button" aria-selected={aba === 'realizados'} onClick={() => setAba('realizados')}>Realizados</button>
      </div>
      {eventos.isPending ? <Carregando /> : eventos.isError ? <ErroCaixa erro={eventos.error} aoTentar={() => eventos.refetch()} /> : lista.length ? (
        <div className="grade-eventos">{lista.map((e) => <CartaoEvento key={e.id} evento={e} resultado={resultados.data?.find((r) => r.evento_id === e.id)} />)}</div>
      ) : <Vazio titulo="Nenhum evento aqui ainda." texto="Toque em “Novo evento” quando fechar uma festa." />}
    </>
  )
}

// ---------------------------------------------------------------------------
// Detalhe do evento
// ---------------------------------------------------------------------------
export function EventoDetalhe() {
  const { id = '' } = useParams()
  const { empresaId, empresa, veFinanceiro, ehProprietaria } = useEmpresa()
  const { abrir } = useFolhas()
  const navegar = useNavigate()
  const avisar = useAvisar()
  const eventos = useEventos(empresaId)
  const clientes = useClientes(empresaId)
  const resultados = useResultadosEventos(empresaId)
  const categorias = useCategorias(empresaId)
  const atualizar = useAtualizarEvento()
  const marcar = useMarcarPago()
  const [gerando, setGerando] = useState<string | null>(null)
  // Lançamentos do evento: busca direta (o evento pode estar fora do período carregado no painel).
  const lancs = useQuery({
    queryKey: ['lancamentos', empresaId, 'evento', id],
    enabled: veFinanceiro && !!id,
    queryFn: async () => (verificar('lançamentos do evento', await supabase.from('lancamentos').select('*').eq('evento_id', id).is('excluido_em', null).order('data_vencimento')) ?? []) as Lancamento[],
  })
  const ev = eventos.data?.find((e) => e.id === id)
  if (eventos.isPending) return <Carregando />
  if (eventos.isError) return <ErroCaixa erro={eventos.error} aoTentar={() => eventos.refetch()} />
  if (!ev) return <Vazio titulo="Evento não encontrado."><Link className="btn btn-s" to="/eventos">Voltar para eventos</Link></Vazio>

  const cliente = clientes.data?.find((c) => c.id === ev.cliente_id)
  const res = resultados.data?.find((r) => r.evento_id === ev.id)
  const l = res ? lucroEvento(res) : { receita: Number(ev.valor_fechado), custos: 0, lucro: Number(ev.valor_fechado), margem: 1 }
  const nomeCat = (cid: string) => categorias.data?.find((c) => c.id === cid)?.nome ?? '—'
  const lista = lancs.data ?? []
  const parcelas = lista.filter((x) => x.tipo === 'entrada')
  const custos = lista.filter((x) => x.tipo === 'saida')
  const ws = ev.fonte === 'workshop'

  const recibo = async (lanc: Lancamento) => {
    setGerando(lanc.id)
    try {
      const doc = cliente && ehProprietaria ? await buscarDocumento(cliente.id) : null
      await baixarRecibo({ empresa, lancamento: lanc, evento: ev, clienteNome: cliente?.nome ?? 'Cliente', clienteDoc: doc })
    } finally {
      setGerando(null)
    }
  }

  return (
    <>
      <Link className="voltar" to="/eventos"><ArrowLeft size={18} aria-hidden="true" />Eventos</Link>
      <div className="cabecalho">
        <div>
          <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="pill marca">{FONTE_NOME[ev.fonte]}</span>
            <span className={`pill ${ev.status === 'realizado' ? 'bom' : ev.status === 'cancelado' ? 'ruim' : 'neutro'}`}>{STATUS_NOME[ev.status]}</span>
          </span>
          <h1>{ev.titulo}</h1>
          <p className="muted">{dataBR(ev.data_evento)}{cliente ? ` · ${cliente.nome}${cliente.telefone ? ` · ${formatTelefone(cliente.telefone)}` : ''}` : ''}{ev.cidade ? ` · ${ev.cidade}` : ''}</p>
        </div>
        <div className="acoes">
          {veFinanceiro ? (
            <Exportar rotulo="Resumo" opcoes={[{ rotulo: 'Resumo do evento (PDF)', formato: 'pdf', gerar: async () => {
              const insc = ws ? (await supabase.from('inscricoes_workshop').select('*').eq('evento_id', ev.id).is('excluido_em', null)).data ?? [] : undefined
              await baixarPdfEvento({ empresa, evento: ev, clienteNome: cliente?.nome ?? null, lancamentos: lista, nomeCategoria: nomeCat, resultado: res, inscricoes: insc })
            } }]} />
          ) : null}
          {ehProprietaria && !ws ? (
            <button type="button" className="btn btn-s" onClick={() => navegar(`/contratos?evento=${ev.id}`)}><FileSignature size={18} aria-hidden="true" />Contrato</button>
          ) : null}
          {veFinanceiro ? <button type="button" className="btn btn-p" onClick={() => abrir({ tipo: 'lancar', lancamentoTipo: 'saida', eventoId: ev.id })}><Plus size={20} aria-hidden="true" />Lançar custo</button> : null}
        </div>
      </div>

      {veFinanceiro ? (
        <section className="kv" aria-label="Números do evento">
          <div className="numero"><span className="rot">{ws ? 'Inscrições' : 'Valor fechado'}</span><span className="val">{formatBRL(l.receita)}</span></div>
          <div className="numero"><span className="rot">Recebido</span><span className="val">{formatBRL(Number(res?.recebido ?? 0))}</span><span className="sub">{Number(res?.a_receber ?? 0) ? `${formatBRL0(Number(res?.a_receber))} a receber` : 'Nada pendente'}</span></div>
          <div className="numero"><span className="rot">Custos</span><span className="val">{formatBRL(l.custos)}</span><span className="sub">{custos.length} lançamentos</span></div>
          <div className="numero destaque"><span className="rot">Lucro</span><span className="val">{formatBRL(l.lucro)}</span><span className="sub">margem de {formatPct(l.margem)}</span></div>
        </section>
      ) : null}

      <div className="cartao">
        <div className="cartao-h">
          <h2>Situação</h2>
          <div className="chips" role="group" aria-label="Situação do evento">
            {(['confirmado', 'realizado', 'cancelado'] as const).map((s) => (
              <button key={s} type="button" className="chip" aria-pressed={ev.status === s} disabled={atualizar.isPending}
                onClick={async () => { await atualizar.mutateAsync({ id: ev.id, status: s }); avisar(`Evento marcado como ${STATUS_NOME[s].toLowerCase()}`) }}>{STATUS_NOME[s]}</button>
            ))}
          </div>
        </div>
        {atualizar.isError ? <p className="erro-caixa" role="alert">{mensagemErro(atualizar.error)}</p> : null}
      </div>

      {ws ? <Inscritas evento={ev} /> : null}

      {veFinanceiro && !ws ? (
        <section className="cartao" aria-labelledby="t-parc">
          <div className="cartao-h">
            <h2 id="t-parc">Parcelas</h2>
            <button type="button" className="btn btn-g btn-sm" onClick={() => abrir({ tipo: 'lancar', lancamentoTipo: 'entrada', eventoId: ev.id })}><Plus size={18} aria-hidden="true" />Adicionar parcela</button>
          </div>
          {marcar.isError ? <p className="erro-caixa" role="alert">{mensagemErro(marcar.error)}</p> : null}
          <div className="linhas">
            {lancs.isPending ? <Carregando /> : parcelas.length ? parcelas.map((p) => (
              <LinhaLancamento key={p.id} l={p} categoria={nomeCat(p.categoria_id)} acao={p.data_pagamento ? (
                <button type="button" className="btn btn-s btn-sm" onClick={() => recibo(p)} disabled={gerando === p.id}><Receipt size={16} aria-hidden="true" />{gerando === p.id ? 'Gerando…' : 'Recibo'}</button>
              ) : (
                <button type="button" className="btn btn-s btn-sm" disabled={marcar.isPending} onClick={async () => { await marcar.mutateAsync({ id: p.id, data: hoje() }); avisar('Parcela recebida') }}>Marcar recebida</button>
              )} />
            )) : <Vazio titulo="Nenhuma parcela." texto="Adicione as parcelas combinadas com a cliente. Toque numa parcela para mudar valor ou data." />}
          </div>
        </section>
      ) : null}

      {veFinanceiro ? (
        <section className="cartao" aria-labelledby="t-custos">
          <div className="cartao-h"><h2 id="t-custos">Custos do evento</h2><button type="button" className="btn btn-g btn-sm" onClick={() => abrir({ tipo: 'lancar', lancamentoTipo: 'saida', eventoId: ev.id })}><Plus size={18} aria-hidden="true" />Lançar custo</button></div>
          <div className="linhas">
            {custos.length ? custos.map((c) => <LinhaLancamento key={c.id} l={c} categoria={nomeCat(c.categoria_id)} acao={<Situacao l={c} />} />)
              : <Vazio titulo="Nenhum custo lançado." texto="Lance flores, balões, freelancers e deslocamento para ver o lucro real." />}
          </div>
        </section>
      ) : null}

      <Logistica evento={ev} />
    </>
  )
}

function Logistica({ evento: ev }: { evento: Evento }) {
  const atualizar = useAtualizarEvento()
  const avisar = useAvisar()
  const [editando, setEditando] = useState(false)
  const local = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')
  const [v, setV] = useState({ local_nome: ev.local_nome ?? '', local_endereco: ev.local_endereco ?? '', entrega: local(ev.entrega_em), devolucao: local(ev.devolucao_em) })
  const quando = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—')
  const salvar = async () => {
    await atualizar.mutateAsync({
      id: ev.id, local_nome: v.local_nome.trim() || null, local_endereco: v.local_endereco.trim() || null,
      entrega_em: v.entrega ? new Date(v.entrega).toISOString() : null, devolucao_em: v.devolucao ? new Date(v.devolucao).toISOString() : null,
    })
    setEditando(false)
    avisar('Logística salva')
  }
  return (
    <section className="cartao" aria-labelledby="t-log">
      <div className="cartao-h"><h2 id="t-log">Logística</h2>{!editando ? <button type="button" className="btn btn-g btn-sm" onClick={() => setEditando(true)}>Editar</button> : null}</div>
      {editando ? (
        <>
          <div className="duas">
            <Campo id="lg-local" rotulo="Local"><input id="lg-local" maxLength={120} value={v.local_nome} onChange={(e) => setV({ ...v, local_nome: e.target.value })} /></Campo>
            <Campo id="lg-end" rotulo="Endereço"><input id="lg-end" maxLength={200} value={v.local_endereco} onChange={(e) => setV({ ...v, local_endereco: e.target.value })} /></Campo>
            <Campo id="lg-ent" rotulo="Entrega"><input id="lg-ent" type="datetime-local" value={v.entrega} onChange={(e) => setV({ ...v, entrega: e.target.value })} /></Campo>
            <Campo id="lg-dev" rotulo="Devolução"><input id="lg-dev" type="datetime-local" value={v.devolucao} onChange={(e) => setV({ ...v, devolucao: e.target.value })} /></Campo>
          </div>
          {atualizar.isError ? <p className="erro-caixa" role="alert">{mensagemErro(atualizar.error)}</p> : null}
          <div className="acoes" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-s" onClick={() => setEditando(false)}>Cancelar</button>
            <button type="button" className="btn btn-p" onClick={salvar} disabled={atualizar.isPending}><Check size={18} aria-hidden="true" />Salvar logística</button>
          </div>
        </>
      ) : (
        <div className="dre">
          <div className="l"><span className="muted">Local</span><span>{ev.local_nome ?? '—'}</span></div>
          <div className="l"><span className="muted">Endereço</span><span>{ev.local_endereco ?? '—'}</span></div>
          <div className="l"><span className="muted">Entrega</span><span>{quando(ev.entrega_em)}</span></div>
          <div className="l"><span className="muted">Devolução</span><span>{quando(ev.devolucao_em)}</span></div>
        </div>
      )}
    </section>
  )
}

function Inscritas({ evento: ev }: { evento: Evento }) {
  const { empresaId, veFinanceiro } = useEmpresa()
  const avisar = useAvisar()
  const inscricoes = useInscricoes(ev.id)
  const contas = useContas(empresaId)
  const criar = useCriarInscricao(empresaId, ev.id, Number(ev.valor_inscricao ?? 0))
  const pagar = usePagarInscricao()
  const [nome, setNome] = useState('')
  const [tel, setTel] = useState('')
  const [erros, setErros] = useState<{ nome?: string; telefone?: string }>({})
  const lista = inscricoes.data ?? []
  const ocupadas = lista.filter((i) => i.status !== 'cancelada').length
  const pagas = lista.filter((i) => i.status === 'paga').length
  const vagas = ev.vagas ?? 0
  const adicionar = async (e: FormEvent) => {
    e.preventDefault()
    const r = esquemaInscricao.safeParse({ nome, telefone: tel })
    if (!r.success) {
      const f = r.error.flatten().fieldErrors
      setErros({ nome: f.nome?.[0], telefone: f.telefone?.[0] })
      return
    }
    setErros({})
    await criar.mutateAsync(r.data)
    setNome('')
    setTel('')
    avisar('Inscrita adicionada')
  }
  return (
    <section className="cartao" aria-labelledby="t-insc">
      <div className="cartao-h"><h2 id="t-insc">Inscritas</h2><span className="muted">{pagas} pagas · {ocupadas - pagas} reservadas · {Math.max(0, vagas - ocupadas)} vagas livres</span></div>
      {pagar.isError ? <p className="erro-caixa" role="alert">{mensagemErro(pagar.error)}</p> : null}
      <div className="linhas">
        {inscricoes.isPending ? <Carregando /> : lista.length ? lista.map((i) => (
          <div key={i.id} className="linha">
            <span className="bolinha saida" aria-hidden="true">{i.nome.charAt(0)}</span>
            <span className="cresce"><span className="t">{i.nome}</span><span className="s">{formatTelefone(i.telefone)}</span></span>
            {i.status === 'paga' ? <span className="pill bom">Paga</span> : i.status === 'cancelada' ? <span className="pill neutro">Cancelada</span> : veFinanceiro && contas.data?.[0] ? (
              <button type="button" className="btn btn-s btn-sm" disabled={pagar.isPending}
                onClick={async () => { await pagar.mutateAsync({ inscricao: i.id, conta: contas.data![0].id }); avisar('Inscrição paga e lançada') }}>Marcar paga</button>
            ) : <span className="pill neutro">Reservada</span>}
          </div>
        )) : <Vazio titulo="Nenhuma inscrita ainda." />}
      </div>
      {ocupadas < vagas || !vagas ? (
        <form className="duas" style={{ alignItems: 'end' }} onSubmit={adicionar} noValidate>
          <Campo id="i-nome" rotulo="Nome da aluna" erro={erros.nome}><input id="i-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="off" aria-invalid={!!erros.nome} /></Campo>
          <Campo id="i-tel" rotulo="Telefone" erro={erros.telefone}><input id="i-tel" inputMode="tel" placeholder="(11) 99999-9999" value={tel} onChange={(e) => setTel(e.target.value)} aria-invalid={!!erros.telefone} /></Campo>
          <button type="submit" className="btn btn-s" style={{ gridColumn: '1 / -1' }} disabled={criar.isPending}><Plus size={18} aria-hidden="true" />Adicionar inscrita</button>
          {criar.isError ? <p className="erro-caixa" style={{ gridColumn: '1 / -1' }} role="alert">{mensagemErro(criar.error)}</p> : null}
        </form>
      ) : <p className="muted">Turma completa.</p>}
    </section>
  )
}
