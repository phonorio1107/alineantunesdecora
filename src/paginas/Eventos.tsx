import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, FileSignature, Handshake, Plus, Receipt } from 'lucide-react'
import { useAvisar, useEmpresa, useFolhas } from '../app/contexto'
import {
  buscarDocumento, useAtualizarEvento, useCategorias, useClientes, useContas, useCriarInscricao, useEventos, useFecharOrcamento, useInscricoes,
  useItens, useMarcarPago, usePagarInscricao, useResultadosEventos,
} from '../data/consultas'
import type { Areas, Evento, FonteReceita, Lancamento, ResultadoEvento, StatusEvento } from '../data/tipos'
import { esquemaInscricao, valorEmReais } from '../data/esquemas'
import { LinhaLancamento, Situacao } from '../components/LinhaLancamento'
import { Campo, Carregando, Confirmar, ErroCaixa, Exportar, Folha, Vazio } from '../components/ui'
import { Conferencia, ItensVenda } from '../components/ItensVenda'
import { baixarPdfEvento, baixarRecibo } from '../export/acoes'
import { areasDe, areasSomam, lucroEvento, parcelasSugeridas, totalItens } from '../lib/calculos'
import { addDias, dataBR, formatBRL, formatBRL0, formatPct, formatTelefone, hoje, MESES } from '../lib/format'
import { mensagemErro, verificar } from '../lib/erros'
import { capitalizarNome, formatarValorDigitado, mascaraTelefone } from '../lib/mascaras'
import { EmitirFolha } from './Contratos'
import { supabase } from '../lib/supabase'
import { useQuery } from '@tanstack/react-query'

export const FONTE_NOME = { decoracao: 'Decoração', assessoria: 'Assessoria', workshop: 'Workshop' } as const
const STATUS_NOME: Record<StatusEvento, string> = { orcamento: 'Orçamento', confirmado: 'Confirmado', realizado: 'Realizado', cancelado: 'Cancelado' }

export type Aba = 'orcamentos' | 'contratos' | 'eventos'
/** Em que etapa a venda está: orçamento, contrato (fechada, festa por vir) ou evento (festa passou ou cancelada). */
export const etapaDe = (e: Pick<Evento, 'status' | 'data_evento'>): Aba =>
  e.status === 'orcamento' ? 'orcamentos' : e.status === 'confirmado' && e.data_evento >= hoje() ? 'contratos' : 'eventos'
const naoFechou = (e: Evento) => e.status === 'cancelado' && !e.fechado_em

export function CartaoEvento({ evento: e, resultado }: { evento: Evento; resultado?: ResultadoEvento }) {
  const { empresaId, veFinanceiro } = useEmpresa()
  const clientes = useClientes(empresaId)
  const cliente = clientes.data?.find((c) => c.id === e.cliente_id)
  const l = resultado ? lucroEvento(resultado) : null
  const recebido = Number(resultado?.recebido ?? 0)
  const pct = l && l.receita ? Math.min(100, (recebido / l.receita) * 100) : 0
  return (
    <Link className="evento" to={`/vendas/${e.id}`}>
      <span className="data-bloco"><b>{e.data_evento.slice(8, 10)}</b><span>{MESES[Number(e.data_evento.slice(5, 7)) - 1].slice(0, 3)}</span></span>
      <span className="cresce">
        <span className="t">{e.titulo}</span>
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {areasDe(e).map((a) => <span key={a} className="pill marca">{FONTE_NOME[a]}</span>)}
          {e.status !== 'confirmado' ? <span className={`pill ${e.status === 'cancelado' ? 'ruim' : e.status === 'orcamento' ? 'atencao' : 'bom'}`}>{naoFechou(e) ? 'Não fechou' : STATUS_NOME[e.status]}</span> : null}
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

/** As três etapas da venda, com a atual marcada. */
function Etapas({ evento: e }: { evento: Evento }) {
  const atual = etapaDe(e)
  const ordem: Aba[] = ['orcamentos', 'contratos', 'eventos']
  const i = e.status === 'realizado' ? 3 : ordem.indexOf(atual)
  const nomes = ['Orçamento', 'Contrato', 'Evento']
  if (e.status === 'cancelado') return null
  return (
    <ol className="passos" aria-label="Etapa da venda">
      {nomes.map((n, k) => (
        <li key={n} className={k < i ? 'feito' : k === i ? 'agora' : ''} aria-current={k === i ? 'step' : undefined}>
          <span className="passo-bola" aria-hidden="true">{k < i ? <Check size={14} /> : k + 1}</span>{n}
        </li>
      ))}
    </ol>
  )
}

// ---------------------------------------------------------------------------
// Detalhe do evento
// ---------------------------------------------------------------------------
export function EventoDetalhe() {
  const { id = '' } = useParams()
  const { empresaId, empresa, veFinanceiro, ehProprietaria } = useEmpresa()
  const { abrir } = useFolhas()
  const avisar = useAvisar()
  const eventos = useEventos(empresaId)
  const clientes = useClientes(empresaId)
  const resultados = useResultadosEventos(empresaId)
  const categorias = useCategorias(empresaId)
  const atualizar = useAtualizarEvento()
  const marcar = useMarcarPago()
  const [gerando, setGerando] = useState<string | null>(null)
  const [fechando, setFechando] = useState(false)
  const [emitindo, setEmitindo] = useState(false)
  const [desistindo, setDesistindo] = useState(false)
  // Lançamentos do evento: busca direta (o evento pode estar fora do período carregado no painel).
  const lancs = useQuery({
    queryKey: ['lancamentos', empresaId, 'evento', id],
    enabled: veFinanceiro && !!id,
    queryFn: async () => (verificar('lançamentos do evento', await supabase.from('lancamentos').select('*').eq('evento_id', id).is('excluido_em', null).order('data_vencimento')) ?? []) as Lancamento[],
  })
  const ev = eventos.data?.find((e) => e.id === id)
  if (eventos.isPending) return <Carregando />
  if (eventos.isError) return <ErroCaixa erro={eventos.error} aoTentar={() => eventos.refetch()} />
  if (!ev) return <Vazio titulo="Venda não encontrada."><Link className="btn btn-s" to="/vendas">Voltar para vendas</Link></Vazio>

  const cliente = clientes.data?.find((c) => c.id === ev.cliente_id)
  const res = resultados.data?.find((r) => r.evento_id === ev.id)
  const l = res ? lucroEvento(res) : { receita: Number(ev.valor_fechado), custos: 0, lucro: Number(ev.valor_fechado), margem: 1 }
  const nomeCat = (cid: string) => categorias.data?.find((c) => c.id === cid)?.nome ?? '—'
  const lista = lancs.data ?? []
  const parcelas = lista.filter((x) => x.tipo === 'entrada')
  const custos = lista.filter((x) => x.tipo === 'saida')
  const ws = ev.fonte === 'workshop'
  const orc = ev.status === 'orcamento'
  const aba = etapaDe(ev)

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
      <Link className="voltar" to={`/vendas?aba=${aba}`}><ArrowLeft size={18} aria-hidden="true" />{aba === 'orcamentos' ? 'Orçamentos' : aba === 'contratos' ? 'Contratos' : 'Eventos'}</Link>
      <Etapas evento={ev} />
      <div className="cabecalho">
        <div>
          <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {areasDe(ev).map((a) => <span key={a} className="pill marca">{FONTE_NOME[a]}{(ev.areas && Object.keys(ev.areas).length > 1 && Number(ev.areas[a])) ? ` · ${formatBRL0(Number(ev.areas[a]))}` : ''}</span>)}
            <span className={`pill ${ev.status === 'realizado' ? 'bom' : ev.status === 'cancelado' ? 'ruim' : orc ? 'atencao' : 'neutro'}`}>{naoFechou(ev) ? 'Não fechou' : STATUS_NOME[ev.status]}</span>
          </span>
          <h1>{ev.titulo}</h1>
          <p className="muted">{dataBR(ev.data_evento)}{cliente ? ` · ${cliente.nome}${cliente.telefone ? ` · ${formatTelefone(cliente.telefone)}` : ''}` : ''}{ev.cidade ? ` · ${ev.cidade}` : ''}</p>
        </div>
        <div className="acoes">
          {orc ? (
            <>
              <button type="button" className="btn btn-g" onClick={() => setDesistindo(true)}>Não fechou</button>
              <button type="button" className="btn btn-p" onClick={() => setFechando(true)}><Handshake size={20} aria-hidden="true" />Fechar venda</button>
            </>
          ) : (
            <>
              {veFinanceiro ? (
                <Exportar rotulo="Resumo" opcoes={[{ rotulo: 'Resumo do evento (PDF)', formato: 'pdf', gerar: async () => {
                  const insc = ws ? (await supabase.from('inscricoes_workshop').select('*').eq('evento_id', ev.id).is('excluido_em', null)).data ?? [] : undefined
                  await baixarPdfEvento({ empresa, evento: ev, clienteNome: cliente?.nome ?? null, lancamentos: lista, nomeCategoria: nomeCat, resultado: res, inscricoes: insc })
                } }]} />
              ) : null}
              {ehProprietaria && !ws && ev.status !== 'cancelado' ? (
                <button type="button" className="btn btn-s" onClick={() => setEmitindo(true)}><FileSignature size={18} aria-hidden="true" />Gerar contrato</button>
              ) : null}
              {veFinanceiro ? <button type="button" className="btn btn-p" onClick={() => abrir({ tipo: 'lancar', lancamentoTipo: 'saida', eventoId: ev.id })}><Plus size={20} aria-hidden="true" />Lançar custo</button> : null}
            </>
          )}
        </div>
      </div>
      {desistindo ? (
        <Confirmar titulo="Este orçamento não fechou?" texto="Ele sai da lista de orçamentos e fica guardado como “Não fechou”. Nada é apagado." rotulo="Marcar que não fechou" perigo={false} ocupado={atualizar.isPending}
          aoCancelar={() => setDesistindo(false)} aoConfirmar={async () => { await atualizar.mutateAsync({ id: ev.id, status: 'cancelado' }); setDesistindo(false); avisar('Orçamento marcado como não fechado') }} />
      ) : null}

      {orc ? <Rascunho evento={ev} /> : null}

      {veFinanceiro && !orc ? (
        <section className="kv" aria-label="Números do evento">
          <div className="numero"><span className="rot">{ws ? 'Inscrições' : 'Valor fechado'}</span><span className="val">{formatBRL(l.receita)}</span></div>
          <div className="numero"><span className="rot">Recebido</span><span className="val">{formatBRL(Number(res?.recebido ?? 0))}</span><span className="sub">{Number(res?.a_receber ?? 0) ? `${formatBRL0(Number(res?.a_receber))} a receber` : 'Nada pendente'}</span></div>
          <div className="numero"><span className="rot">Custos</span><span className="val">{formatBRL(l.custos)}</span><span className="sub">{custos.length} lançamentos</span></div>
          <div className="numero destaque"><span className="rot">Lucro</span><span className="val">{formatBRL(l.lucro)}</span><span className="sub">margem de {formatPct(l.margem)}</span></div>
        </section>
      ) : null}

      {!orc && !naoFechou(ev) ? (
        <div className="cartao">
          <div className="cartao-h">
            <h2>Situação</h2>
            <div className="chips" role="group" aria-label="Situação do evento">
              {(['confirmado', 'realizado', 'cancelado'] as const).map((st) => (
                <button key={st} type="button" className="chip" aria-pressed={ev.status === st} disabled={atualizar.isPending}
                  onClick={async () => { await atualizar.mutateAsync({ id: ev.id, status: st }); avisar(`Evento marcado como ${STATUS_NOME[st].toLowerCase()}`) }}>{STATUS_NOME[st]}</button>
              ))}
            </div>
          </div>
          {atualizar.isError ? <p className="erro-caixa" role="alert">{mensagemErro(atualizar.error)}</p> : null}
        </div>
      ) : null}

      {ws ? <Inscritas evento={ev} /> : <ItensVenda evento={ev} />}

      {veFinanceiro && !ws && !orc ? (
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
            )) : <Vazio titulo="Nenhuma parcela." texto="Adicione as parcelas combinadas com o cliente. Toque numa parcela para mudar valor ou data." />}
          </div>
        </section>
      ) : null}

      {veFinanceiro && !orc ? (
        <section className="cartao" aria-labelledby="t-custos">
          <div className="cartao-h"><h2 id="t-custos">Custos do evento</h2><button type="button" className="btn btn-g btn-sm" onClick={() => abrir({ tipo: 'lancar', lancamentoTipo: 'saida', eventoId: ev.id })}><Plus size={18} aria-hidden="true" />Lançar custo</button></div>
          <div className="linhas">
            {custos.length ? custos.map((c) => <LinhaLancamento key={c.id} l={c} categoria={nomeCat(c.categoria_id)} acao={<Situacao l={c} />} />)
              : <Vazio titulo="Nenhum custo lançado." texto="Lance flores, balões, freelancers e deslocamento para ver o lucro real." />}
          </div>
        </section>
      ) : null}

      {!ws ? <Conferencia evento={ev} /> : null}
      <Logistica evento={ev} />
      {fechando ? <FecharFolha evento={ev} aoFechar={() => setFechando(false)} /> : null}
      {emitindo ? <EmitirFolha eventoInicial={ev.id} aoFechar={() => setEmitindo(false)} /> : null}
    </>
  )
}

/** Rascunho do orçamento: anotações livres (tema, cores, ideias, combinados). */
function Rascunho({ evento: ev }: { evento: Evento }) {
  const atualizar = useAtualizarEvento()
  const avisar = useAvisar()
  const [texto, setTexto] = useState(ev.observacoes ?? '')
  const mudou = texto.trim() !== (ev.observacoes ?? '').trim()
  return (
    <section className="cartao" aria-labelledby="t-rasc">
      <div className="cartao-h">
        <h2 id="t-rasc">Rascunho</h2>
        {Number(ev.valor_fechado) ? <span className="muted num">Valor estimado {formatBRL(Number(ev.valor_fechado))}</span> : null}
      </div>
      <textarea aria-labelledby="t-rasc" rows={4} maxLength={2000} value={texto} onChange={(e) => setTexto(e.target.value)}
        placeholder="Tema, cores, número de convidados, ideias, o que o cliente pediu…" />
      {atualizar.isError ? <p className="erro-caixa" role="alert">{mensagemErro(atualizar.error)}</p> : null}
      {mudou ? (
        <div className="acoes" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-s btn-sm" onClick={() => setTexto(ev.observacoes ?? '')}>Desfazer</button>
          <button type="button" className="btn btn-p btn-sm" disabled={atualizar.isPending} onClick={async () => { await atualizar.mutateAsync({ id: ev.id, observacoes: texto.trim() || null }); avisar('Rascunho salvo') }}><Check size={16} aria-hidden="true" />Salvar rascunho</button>
        </div>
      ) : null}
    </section>
  )
}

/** Fechar o orçamento: vira contrato, com o valor de cada área e as parcelas previstas. */
function FecharFolha({ evento: ev, aoFechar }: { evento: Evento; aoFechar: () => void }) {
  const { empresaId, empresa, veFinanceiro, ehProprietaria } = useEmpresa()
  const avisar = useAvisar()
  const contas = useContas(empresaId)
  const itens = useItens(ev.id)
  const fechar = useFecharOrcamento()
  const doItens = totalItens(itens.data ?? [])
  const inicial = doItens > 0 ? doItens : Number(ev.valor_fechado)
  const paraCampo = (v: number) => (v ? formatarValorDigitado(v.toFixed(2).replace('.', ',')) : '')
  const [areas, setAreas] = useState<FonteReceita[]>(areasDe(ev).filter((a) => a !== 'workshop' || areasDe(ev).length > 1))
  const [valor, setValor] = useState(paraCampo(inicial))
  const [porArea, setPorArea] = useState<Record<string, string>>({})
  const [pct, setPct] = useState(String(empresa.entrada_percentual))
  const [dataEntrada, setDataEntrada] = useState(hoje())
  const [conta, setConta] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [fechou, setFechou] = useState(false)
  const reais = (v: string) => { const r = valorEmReais.safeParse(v || '0'); return r.success ? r.data : NaN }
  const total = reais(valor)
  const somaAreas = areas.reduce((t, a) => t + (reais(porArea[a] ?? '') || 0), 0)
  const contaEscolhida = conta || contas.data?.[0]?.id || null
  const prev = parcelasSugeridas(Number.isFinite(total) ? total : 0, Number(pct) || 0)

  const confirmar = async () => {
    setErro(null)
    if (!areas.length) return setErro('Escolha ao menos uma área.')
    if (!Number.isFinite(total) || total <= 0) return setErro('Informe o valor fechado.')
    const valores: Areas = {}
    for (const a of areas) valores[a] = areas.length === 1 ? total : reais(porArea[a] ?? '') || 0
    if (areas.length > 1 && !areasSomam(valores, total)) return setErro(`A soma das áreas (${formatBRL(somaAreas)}) precisa dar ${formatBRL(total)}.`)
    if (veFinanceiro && !contaEscolhida) return setErro('Cadastre uma conta em Configurações para receber as parcelas.')
    await fechar.mutateAsync({ evento: ev.id, valor: total, areas: valores, entrada_percentual: Number(pct) || 0, data_entrada: dataEntrada, conta: contaEscolhida })
    avisar('Venda fechada! Agora ela é um contrato.')
    if (ehProprietaria) setFechou(true)
    else aoFechar()
  }

  if (fechou) {
    return (
      <Folha titulo="Venda fechada" aoFechar={aoFechar}>
        <p>Pronto: <b>{ev.titulo}</b> agora está em Contratos, com a entrada e o saldo previstos. Quer gerar o contrato em PDF para o cliente assinar?</p>
        <div className="acoes">
          <button type="button" className="btn btn-s" onClick={aoFechar}>Depois</button>
          <Link className="btn btn-p" to={`/vendas?aba=contratos`} onClick={aoFechar}><FileSignature size={18} aria-hidden="true" />Ir para Contratos</Link>
        </div>
      </Folha>
    )
  }

  return (
    <Folha titulo="Fechar venda" aoFechar={aoFechar}>
      <p className="muted">O orçamento vira contrato. {itens.data?.some((i) => i.peca_id) ? 'O material de consumo sai do estoque agora; o acervo fica reservado para o dia.' : ''}</p>
      <div className="campo">
        <span className="rotulo" id="f-areas">Áreas</span>
        <div className="chips" role="group" aria-labelledby="f-areas">
          {(['decoracao', 'assessoria', 'workshop'] as const).map((a) => {
            const marcada = areas.includes(a)
            return <button key={a} type="button" className="chip" aria-pressed={marcada} onClick={() => setAreas(marcada ? areas.filter((x) => x !== a) : (['decoracao', 'assessoria', 'workshop'] as const).filter((x) => x === a || areas.includes(x)))}>{marcada ? <Check size={16} aria-hidden="true" /> : null}{FONTE_NOME[a]}</button>
          })}
        </div>
      </div>
      <Campo id="f-valor" rotulo="Valor fechado" dica={doItens > 0 ? `Os itens somam ${formatBRL(doItens)}.` : undefined}>
        <input id="f-valor" className="dinheiro" inputMode="decimal" placeholder="R$ 0,00" value={valor} onChange={(e) => setValor(e.target.value)} onBlur={(e) => setValor(formatarValorDigitado(e.target.value))} autoFocus />
      </Campo>
      {areas.length > 1 ? (
        <div className="campo">
          <span className="rotulo" id="f-va">Quanto é de cada área?</span>
          <div className="duas" role="group" aria-labelledby="f-va">
            {areas.map((a) => (
              <Campo key={a} id={`f-va-${a}`} rotulo={FONTE_NOME[a]}>
                <input id={`f-va-${a}`} inputMode="decimal" placeholder="R$ 0,00" value={porArea[a] ?? ''} onChange={(e) => setPorArea({ ...porArea, [a]: e.target.value })} onBlur={(e) => setPorArea({ ...porArea, [a]: formatarValorDigitado(e.target.value) })} />
              </Campo>
            ))}
          </div>
          <span className="dica num">Somando {formatBRL(somaAreas)} de {formatBRL(Number.isFinite(total) ? total : 0)}. Serve para o relatório de lucro por área.</span>
        </div>
      ) : null}
      {veFinanceiro ? (
        <>
          <div className="duas">
            <Campo id="f-pct" rotulo="Entrada (%)"><input id="f-pct" type="number" min={0} max={100} value={pct} onChange={(e) => setPct(e.target.value)} /></Campo>
            <Campo id="f-dent" rotulo="Data da entrada"><input id="f-dent" type="date" value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} /></Campo>
          </div>
          <Campo id="f-conta" rotulo="Conta que recebe">
            <select id="f-conta" value={contaEscolhida ?? ''} onChange={(e) => setConta(e.target.value)}>{(contas.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
          </Campo>
          <div className="previa" aria-live="polite">
            <b>Parcelas previstas</b>
            <span className="num">Entrada {formatBRL(prev.entrada)} em {dataBR(dataEntrada || hoje())}</span>
            <span className="num">Saldo {formatBRL(prev.saldo)} até {dataBR(addDias(ev.data_evento, -Number(empresa.dias_saldo_antes_evento)))}</span>
          </div>
        </>
      ) : <p className="muted">As parcelas ficam para quem cuida do financeiro cadastrar.</p>}
      {erro || fechar.isError ? <p className="erro-caixa" role="alert">{erro ?? mensagemErro(fechar.error)}</p> : null}
      <div className="acoes">
        <button type="button" className="btn btn-s" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn btn-p" onClick={confirmar} disabled={fechar.isPending}><Handshake size={18} aria-hidden="true" />{fechar.isPending ? 'Fechando…' : 'Fechar venda'}</button>
      </div>
    </Folha>
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
          <Campo id="i-nome" rotulo="Nome da aluna" erro={erros.nome}><input id="i-nome" value={nome} onChange={(e) => setNome(e.target.value)} onBlur={(e) => setNome(capitalizarNome(e.target.value))} autoCapitalize="words" autoComplete="off" aria-invalid={!!erros.nome} /></Campo>
          <Campo id="i-tel" rotulo="Telefone" erro={erros.telefone}><input id="i-tel" type="tel" inputMode="tel" placeholder="(11) 99999-9999" maxLength={15} value={tel} onChange={(e) => setTel(mascaraTelefone(e.target.value))} aria-invalid={!!erros.telefone} /></Campo>
          <button type="submit" className="btn btn-s" style={{ gridColumn: '1 / -1' }} disabled={criar.isPending}><Plus size={18} aria-hidden="true" />Adicionar inscrita</button>
          {criar.isError ? <p className="erro-caixa" style={{ gridColumn: '1 / -1' }} role="alert">{mensagemErro(criar.error)}</p> : null}
        </form>
      ) : <p className="muted">Turma completa.</p>}
    </section>
  )
}
