import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Unlink } from 'lucide-react'
import { useAvisar, useEmpresa } from '../app/contexto'
import { useEventos } from '../data/consultas'
import { useAcaoGoogle, useAgendaGoogle, useCompromissos, useExcluirCompromisso, useSalvarCompromisso, useStatusGoogle } from '../data/agenda'
import type { Compromisso } from '../data/tipos'
import { Campo, Confirmar, ErroCaixa, Folha } from '../components/ui'
import { addDias, addMes, fimMes, hoje, MESES, nomeMes, parseDate } from '../lib/format'
import { mensagemErro } from '../lib/erros'
import { modoDemo } from '../lib/supabase'

type Tipo = 'festa' | 'logistica' | 'compromisso' | 'google'
interface Item {
  chave: string
  tipo: Tipo
  titulo: string
  dia: string // AAAA-MM-DD em São Paulo
  hora: string | null // "14:00" ou null (dia inteiro)
  sub: string | null
  link?: string
  compromisso?: Compromisso
}

const ROTULO: Record<Tipo, string> = { festa: 'Evento', logistica: 'Entrega e devolução', compromisso: 'Compromisso', google: 'Do seu Google' }
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const FUSO = 'America/Sao_Paulo'
const diaSP = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
const horaSP = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

/** Semanas que aparecem na grade do mês (de domingo a sábado). */
function gradeDoMes(ym: string) {
  const primeiro = parseDate(`${ym}-01`)
  const ini = addDias(`${ym}-01`, -primeiro.getDay())
  const ultimo = fimMes(ym)
  const fim = addDias(ultimo, 6 - parseDate(ultimo).getDay())
  const dias: string[] = []
  for (let d = ini; d <= fim; d = addDias(d, 1)) dias.push(d)
  return { dias, ini, fim }
}

export default function Agenda() {
  const { empresaId, ehProprietaria } = useEmpresa()
  const avisar = useAvisar()
  const [params, setParams] = useSearchParams()
  const [mes, setMes] = useState(hoje().slice(0, 7))
  const [dia, setDia] = useState(hoje())
  const [folha, setFolha] = useState<{ comp?: Compromisso; dia?: string } | null>(null)
  const { dias, ini, fim } = useMemo(() => gradeDoMes(mes), [mes])

  const eventos = useEventos(empresaId)
  const comps = useCompromissos(empresaId, ini, fim)
  const status = useStatusGoogle(true)
  const ligado = !!status.data?.conectado
  const doGoogle = useAgendaGoogle(ini, fim, ligado && ehProprietaria)

  // Volta do Google depois de autorizar: avisa e limpa o endereço.
  useEffect(() => {
    const g = params.get('google')
    if (!g) return
    avisar(g === 'conectado' ? 'Google Agenda ligado' : g === 'cancelado' ? 'Ligação com o Google cancelada' : params.get('motivo') ?? 'Não foi possível ligar o Google')
    setParams({}, { replace: true })
  }, [params, setParams, avisar])

  const itens = useMemo(() => {
    const out: Item[] = []
    for (const e of eventos.data ?? []) {
      if (e.status === 'cancelado' || e.status === 'orcamento') continue
      if (e.data_evento >= ini && e.data_evento <= fim) out.push({ chave: `f-${e.id}`, tipo: 'festa', titulo: e.titulo, dia: e.data_evento, hora: null, sub: [e.local_nome, e.cidade].filter(Boolean).join(', ') || null, link: `/vendas/${e.id}` })
      if (e.entrega_em) out.push({ chave: `e-${e.id}`, tipo: 'logistica', titulo: `Entrega: ${e.titulo}`, dia: diaSP(e.entrega_em), hora: horaSP(e.entrega_em), sub: e.local_nome, link: `/vendas/${e.id}` })
      if (e.devolucao_em) out.push({ chave: `d-${e.id}`, tipo: 'logistica', titulo: `Devolução: ${e.titulo}`, dia: diaSP(e.devolucao_em), hora: horaSP(e.devolucao_em), sub: e.local_nome, link: `/vendas/${e.id}` })
    }
    for (const c of comps.data ?? []) out.push({ chave: `c-${c.id}`, tipo: 'compromisso', titulo: c.titulo, dia: diaSP(c.inicio), hora: c.dia_inteiro ? null : horaSP(c.inicio), sub: c.local, compromisso: c })
    for (const g of doGoogle.data ?? []) out.push({ chave: `g-${g.id}-${g.inicio}`, tipo: 'google', titulo: g.titulo, dia: g.dia_inteiro ? g.inicio.slice(0, 10) : diaSP(g.inicio), hora: g.dia_inteiro ? null : horaSP(g.inicio), sub: g.local })
    return out.sort((a, b) => a.dia.localeCompare(b.dia) || (a.hora ?? '').localeCompare(b.hora ?? ''))
  }, [eventos.data, comps.data, doGoogle.data, ini, fim])

  const porDia = useMemo(() => {
    const m = new Map<string, Item[]>()
    for (const i of itens) m.set(i.dia, [...(m.get(i.dia) ?? []), i])
    return m
  }, [itens])
  const doDia = porDia.get(dia) ?? []

  const irMes = (n: number) => {
    const novo = addMes(mes, n)
    setMes(novo)
    setDia(novo === hoje().slice(0, 7) ? hoje() : `${novo}-01`)
  }
  const tituloDia = parseDate(dia).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Agenda</h1>
          <p className="muted">Eventos, entregas, devoluções e compromissos{ligado ? ', junto com o seu Google Agenda' : ''}.</p>
        </div>
        <div className="acoes">
          <button type="button" className="btn btn-p" onClick={() => setFolha({ dia })}><Plus size={20} aria-hidden="true" />Novo compromisso</button>
        </div>
      </div>

      <CartaoGoogle />

      <div className="agenda">
        <section className="cartao agenda-mes" aria-label={`Calendário de ${nomeMes(mes)}`}>
          <div className="agenda-topo">
            <h2 className="agenda-titulo">{MESES[Number(mes.slice(5, 7)) - 1]} <span>{mes.slice(0, 4)}</span></h2>
            <div className="acoes">
              {mes !== hoje().slice(0, 7) ? <button type="button" className="btn btn-g btn-sm" onClick={() => { setMes(hoje().slice(0, 7)); setDia(hoje()) }}>Hoje</button> : null}
              <button type="button" className="icone-btn" aria-label="Mês anterior" onClick={() => irMes(-1)}><ChevronLeft size={20} /></button>
              <button type="button" className="icone-btn" aria-label="Próximo mês" onClick={() => irMes(1)}><ChevronRight size={20} /></button>
            </div>
          </div>
          <div className="grade-mes" role="grid" aria-readonly="true">
            <div className="grade-semana" role="row">{SEMANA.map((s) => <span key={s} role="columnheader">{s}</span>)}</div>
            <div className="grade-dias">
              {dias.map((d) => {
                const lista = porDia.get(d) ?? []
                const fora = d.slice(0, 7) !== mes
                const tipos = [...new Set(lista.map((i) => i.tipo))]
                return (
                  <button key={d} type="button" role="gridcell" className={`dia${fora ? ' fora' : ''}${d === hoje() ? ' hoje' : ''}${d === dia ? ' escolhido' : ''}`}
                    aria-pressed={d === dia} aria-label={`${parseDate(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}${lista.length ? `, ${lista.length} ${lista.length === 1 ? 'item' : 'itens'}` : ''}`}
                    onClick={() => setDia(d)}>
                    <span className="dia-n">{Number(d.slice(8, 10))}</span>
                    <span className="dia-itens" aria-hidden="true">
                      {lista.slice(0, 2).map((i) => <span key={i.chave} className={`marca-${i.tipo}`}>{i.titulo}</span>)}
                      {lista.length > 2 ? <span className="mais">+{lista.length - 2}</span> : null}
                    </span>
                    <span className="dia-pontos" aria-hidden="true">{tipos.map((t) => <i key={t} className={`marca-${t}`} />)}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="legenda">
            {(['festa', 'logistica', 'compromisso', ...(ligado && ehProprietaria ? ['google' as const] : [])] as Tipo[]).map((t) => <span key={t}><i className={`marca-${t}`} />{ROTULO[t]}</span>)}
          </div>
        </section>

        <section className="cartao agenda-dia" aria-labelledby="t-dia" aria-live="polite">
          <h2 id="t-dia" className="agenda-dia-t">{tituloDia.charAt(0).toUpperCase() + tituloDia.slice(1)}</h2>
          {eventos.isError ? <ErroCaixa erro={eventos.error} aoTentar={() => eventos.refetch()} /> : null}
          {comps.isError ? <ErroCaixa erro={comps.error} aoTentar={() => comps.refetch()} /> : null}
          {doDia.length ? (
            <ol className="dia-lista">
              {doDia.map((i) => {
                const conteudo = (
                  <>
                    <span className="dia-hora">{i.hora ?? 'Dia todo'}</span>
                    <span className="dia-t">{i.titulo}{i.sub ? <small>{i.sub}</small> : null}<small className={`dia-tipo marca-texto-${i.tipo}`}>{ROTULO[i.tipo]}</small></span>
                  </>
                )
                return (
                  <li key={i.chave} className={`marca-borda-${i.tipo}`}>
                    {i.link ? <Link to={i.link}>{conteudo}</Link>
                      : i.compromisso ? <button type="button" onClick={() => setFolha({ comp: i.compromisso })}>{conteudo}</button>
                      : <div>{conteudo}</div>}
                  </li>
                )
              })}
            </ol>
          ) : (
            <div className="vazio">
              <b>Nada marcado neste dia.</b>
              <button type="button" className="btn btn-s btn-sm" onClick={() => setFolha({ dia })}><Plus size={16} aria-hidden="true" />Marcar um compromisso</button>
            </div>
          )}
          {doGoogle.isError ? <p className="muted" style={{ fontSize: 14 }}>{mensagemErro(doGoogle.error)}</p> : null}
        </section>
      </div>

      {folha ? <CompromissoFolha comp={folha.comp} diaInicial={folha.dia ?? dia} aoFechar={() => setFolha(null)} /> : null}
    </>
  )
}

/** Situação da ligação com o Google. Só a proprietária liga, desliga e vê o e-mail. */
function CartaoGoogle() {
  const { ehProprietaria } = useEmpresa()
  const avisar = useAvisar()
  const status = useStatusGoogle(true)
  const acao = useAcaoGoogle()
  const [desligando, setDesligando] = useState(false)
  const s = status.data
  if (!s || status.isPending) return null
  if (s.indisponivel) return ehProprietaria ? <p className="google-nota">A ligação com o Google Agenda ainda não foi ativada no servidor. A agenda do sistema funciona normalmente.</p> : null
  if (!s.conectado) {
    if (!ehProprietaria) return null
    return (
      <section className="google-cartao" aria-labelledby="t-google">
        <SeloGoogle />
        <div className="google-texto">
          <h2 id="t-google">Ligue o seu Google Agenda</h2>
          <p>Os eventos, entregas e compromissos daqui passam a aparecer numa agenda “Aline Antunes Decora” no seu Google, e os seus compromissos pessoais aparecem aqui. Leva um minuto.</p>
          {acao.isError ? <p className="erro-caixa" role="alert">{mensagemErro(acao.error)}</p> : null}
        </div>
        <button type="button" className="btn btn-p" disabled={acao.isPending} onClick={() => acao.mutate('conectar', { onSuccess: () => { if (modoDemo) avisar('Na prévia, a ligação é simulada') } })}>Ligar o Google Agenda</button>
      </section>
    )
  }
  return (
    <section className="google-cartao ligado" aria-label="Google Agenda">
      <SeloGoogle />
      <div className="google-texto">
        <h2>Google Agenda ligado</h2>
        <p>{ehProprietaria && s.email ? `Conta ${s.email}. ` : ''}O que você marca aqui vai para a agenda “Aline Antunes Decora” no Google.</p>
        {s.erro ? <p className="erro-caixa" role="alert">{s.erro}</p> : null}
        {acao.isError ? <p className="erro-caixa" role="alert">{mensagemErro(acao.error)}</p> : null}
      </div>
      {desligando ? (
        <Confirmar titulo="Desligar o Google Agenda?" texto="O sistema para de mandar novidades e de mostrar a sua agenda pessoal. A agenda “Aline Antunes Decora” continua no seu Google; apague por lá se quiser." rotulo="Desligar"
          ocupado={acao.isPending} aoCancelar={() => setDesligando(false)} aoConfirmar={() => acao.mutate('desconectar', { onSuccess: () => { setDesligando(false); avisar('Google Agenda desligado') } })} />
      ) : (
        <div className="acoes">
          <button type="button" className="btn btn-s btn-sm" disabled={acao.isPending} onClick={() => acao.mutate('sincronizar_tudo', { onSuccess: () => avisar('Agenda enviada para o Google') })}>
            <RefreshCw size={16} aria-hidden="true" className={acao.isPending && acao.variables === 'sincronizar_tudo' ? 'girando-icone' : undefined} />Mandar tudo de novo
          </button>
          {ehProprietaria ? <button type="button" className="btn btn-g btn-sm" onClick={() => setDesligando(true)}><Unlink size={16} aria-hidden="true" />Desligar</button> : null}
        </div>
      )}
    </section>
  )
}

function SeloGoogle() {
  // As quatro cores do Google num anel simples, para reconhecer de relance (sem usar o logotipo).
  return (
    <svg className="selo-google" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="15" fill="none" stroke="#4285F4" strokeWidth="5" strokeDasharray="23.6 70.7" strokeDashoffset="0" />
      <circle cx="20" cy="20" r="15" fill="none" stroke="#EA4335" strokeWidth="5" strokeDasharray="23.6 70.7" strokeDashoffset="-23.6" />
      <circle cx="20" cy="20" r="15" fill="none" stroke="#FBBC05" strokeWidth="5" strokeDasharray="23.6 70.7" strokeDashoffset="-47.1" />
      <circle cx="20" cy="20" r="15" fill="none" stroke="#34A853" strokeWidth="5" strokeDasharray="23.6 70.7" strokeDashoffset="-70.7" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Novo compromisso / editar
// ---------------------------------------------------------------------------
function CompromissoFolha({ comp, diaInicial, aoFechar }: { comp?: Compromisso; diaInicial: string; aoFechar: () => void }) {
  const { empresaId } = useEmpresa()
  const avisar = useAvisar()
  const navegar = useNavigate()
  const eventos = useEventos(empresaId)
  const salvar = useSalvarCompromisso(empresaId)
  const excluir = useExcluirCompromisso()
  const [excluindo, setExcluindo] = useState(false)
  const [v, setV] = useState(() => ({
    titulo: comp?.titulo ?? '',
    data: comp ? diaSP(comp.inicio) : diaInicial,
    diaInteiro: comp?.dia_inteiro ?? false,
    ini: comp && !comp.dia_inteiro ? horaSP(comp.inicio) : '09:00',
    fim: comp && !comp.dia_inteiro ? horaSP(comp.fim) : '10:00',
    local: comp?.local ?? '',
    evento: comp?.evento_id ?? '',
    notas: comp?.notas ?? '',
  }))
  const [erro, setErro] = useState<string | null>(null)
  const proximos = (eventos.data ?? []).filter((e) => e.status !== 'cancelado' && e.status !== 'orcamento' && e.data_evento >= addDias(hoje(), -30)).sort((a, b) => a.data_evento.localeCompare(b.data_evento))

  const enviar = async () => {
    setErro(null)
    if (v.titulo.trim().length < 2) return setErro('Dê um nome ao compromisso.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.data)) return setErro('Escolha a data.')
    if (!v.diaInteiro && v.fim < v.ini) return setErro('O fim precisa ser depois do início.')
    const inicio = v.diaInteiro ? `${v.data}T12:00:00-03:00` : `${v.data}T${v.ini}:00-03:00`
    const fim = v.diaInteiro ? inicio : `${v.data}T${v.fim}:00-03:00`
    await salvar.mutateAsync({ id: comp?.id, titulo: v.titulo.trim(), inicio, fim, dia_inteiro: v.diaInteiro, local: v.local.trim() || null, notas: v.notas.trim() || null, evento_id: v.evento || null })
    avisar(comp ? 'Compromisso atualizado' : 'Compromisso marcado')
    aoFechar()
  }

  return (
    <Folha titulo={comp ? 'Compromisso' : 'Novo compromisso'} aoFechar={aoFechar}>
      <Campo id="cp-t" rotulo="O que é"><input id="cp-t" autoFocus maxLength={120} placeholder="Ex.: Visita ao salão, compra de flores" value={v.titulo} onChange={(e) => setV({ ...v, titulo: e.target.value })} /></Campo>
      <Campo id="cp-d" rotulo="Dia"><input id="cp-d" type="date" value={v.data} onChange={(e) => setV({ ...v, data: e.target.value })} /></Campo>
      <label className="chave"><span>Dia todo</span><input type="checkbox" checked={v.diaInteiro} onChange={(e) => setV({ ...v, diaInteiro: e.target.checked })} /></label>
      {!v.diaInteiro ? (
        <div className="duas horas">
          <Campo id="cp-i" rotulo="Começa"><input id="cp-i" type="time" step={300} value={v.ini} onChange={(e) => setV({ ...v, ini: e.target.value, fim: e.target.value > v.fim ? e.target.value : v.fim })} /></Campo>
          <Campo id="cp-f" rotulo="Termina"><input id="cp-f" type="time" step={300} value={v.fim} onChange={(e) => setV({ ...v, fim: e.target.value })} /></Campo>
        </div>
      ) : null}
      <Campo id="cp-l" rotulo="Onde (opcional)"><input id="cp-l" maxLength={200} placeholder="Ex.: Ateliê, Ceasa Campinas" value={v.local} onChange={(e) => setV({ ...v, local: e.target.value })} /></Campo>
      <Campo id="cp-e" rotulo="Ligado a um evento (opcional)">
        <select id="cp-e" value={v.evento} onChange={(e) => setV({ ...v, evento: e.target.value })}>
          <option value="">Nenhum</option>
          {proximos.map((e) => <option key={e.id} value={e.id}>{e.titulo} ({e.data_evento.slice(8, 10)}/{e.data_evento.slice(5, 7)})</option>)}
        </select>
      </Campo>
      <Campo id="cp-n" rotulo="Anotações (opcional)"><textarea id="cp-n" maxLength={500} value={v.notas} onChange={(e) => setV({ ...v, notas: e.target.value })} /></Campo>
      {erro || salvar.isError || excluir.isError ? <p className="erro-caixa" role="alert">{erro ?? mensagemErro(salvar.error ?? excluir.error)}</p> : null}
      {excluindo && comp ? (
        <Confirmar titulo="Excluir este compromisso?" texto="Ele sai da agenda do sistema e do Google." rotulo="Excluir" ocupado={excluir.isPending}
          aoCancelar={() => setExcluindo(false)} aoConfirmar={async () => { await excluir.mutateAsync(comp.id); avisar('Compromisso excluído'); aoFechar() }} />
      ) : (
        <div className="acoes">
          {comp ? <button type="button" className="btn btn-g" onClick={() => setExcluindo(true)}>Excluir</button> : null}
          {comp?.evento_id ? <button type="button" className="btn btn-g" onClick={() => { aoFechar(); navegar(`/vendas/${comp.evento_id}`) }}>Abrir evento</button> : null}
          <button type="button" className="btn btn-s" onClick={aoFechar}>Cancelar</button>
          <button type="button" className="btn btn-p" onClick={enviar} disabled={salvar.isPending}>{comp ? 'Salvar compromisso' : 'Marcar compromisso'}</button>
        </div>
      )}
    </Folha>
  )
}

