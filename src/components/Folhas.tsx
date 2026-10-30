import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Check, Lock, Receipt } from 'lucide-react'
import { useAvisar, useEmpresa, useFolhas } from '../app/contexto'
import {
  buscarDocumento, useAtualizarLancamento, useCategorias, useClientes, useContas, useCriarCliente, useCriarEvento, useCriarLancamento,
  useDesativarRecorrencia, useEventos, useExcluirLancamento, useExcluirParcelas, useFechamentos, useMarcarPago,
} from '../data/consultas'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Lancamento } from '../data/tipos'
import {
  esquemaCliente, esquemaEvento, esquemaLancamento, valorEmReais, type ClienteValido, type EventoValido, type LancamentoValido, type NovoCliente, type NovoEvento, type NovoLancamento,
} from '../data/esquemas'
import { baixarRecibo } from '../export/acoes'
import { dividirEmParcelas, parcelasSugeridas } from '../lib/calculos'
import { comMascara, comNome, comValor, formatarValorDigitado, mascaraCEP, mascaraDoc, mascaraTelefone } from '../lib/mascaras'
import { mensagemErro, verificar } from '../lib/erros'
import { addDias, dataBR, diaMes, formatBRL, hoje, mesDe, nomeMes, somarMeses } from '../lib/format'
import { Campo, Confirmar, Folha } from './ui'

export default function Folhas() {
  const { folha, fechar } = useFolhas()
  if (!folha) return null
  if (folha.tipo === 'lancar') return <LancarFolha tipoInicial={folha.lancamentoTipo} eventoId={folha.eventoId} aoFechar={fechar} />
  if (folha.tipo === 'lancamento') return <LancamentoFolha id={folha.id} aoFechar={fechar} />
  if (folha.tipo === 'novo-evento') return <NovoEventoFolha aoFechar={fechar} />
  return <NovoClienteFolha aoFechar={fechar} />
}

const useMesFechado = () => {
  const { empresaId, veFinanceiro } = useEmpresa()
  const f = useFechamentos(empresaId)
  return (data: string) => veFinanceiro && (f.data ?? []).some((x) => x.mes_referencia.slice(0, 7) === mesDe(data))
}

// ---------------------------------------------------------------------------
// Lançar entrada ou saída (feita para o celular: menos de 1 minuto)
// ---------------------------------------------------------------------------
function LancarFolha({ tipoInicial = 'saida', eventoId, aoFechar }: { tipoInicial?: 'entrada' | 'saida'; eventoId?: string; aoFechar: () => void }) {
  const { empresaId } = useEmpresa()
  const avisar = useAvisar()
  const categorias = useCategorias(empresaId)
  const contas = useContas(empresaId)
  const eventos = useEventos(empresaId)
  const criar = useCriarLancamento(empresaId)
  const mesFechado = useMesFechado()
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<NovoLancamento, unknown, LancamentoValido>({
    resolver: zodResolver(esquemaLancamento),
    defaultValues: { tipo: tipoInicial, valor: '', categoria_id: '', conta_id: '', evento_id: eventoId ?? null, data: hoje(), pago: true, descricao: '', repetir: 'nao' },
  })
  const tipo = watch('tipo')
  const data = watch('data')
  const repetir = watch('repetir')
  const nParcelas = Number(watch('parcelas')) || 0
  const totalDigitado = valorEmReais.safeParse(watch('valor') ?? '')
  useEffect(() => {
    if (contas.data?.[0] && !watch('conta_id')) setValue('conta_id', contas.data[0].id)
  }, [contas.data, setValue, watch])
  const cats = (categorias.data ?? []).filter((c) => c.tipo === tipo)
  const enviar = handleSubmit(async (v) => {
    await criar.mutateAsync({ l: v, nomeCategoria: cats.find((c) => c.id === v.categoria_id)?.nome ?? 'Lançamento' })
    avisar(v.repetir === 'parcelado' ? `${v.parcelas} parcelas salvas` : v.repetir === 'mensal' ? 'Salvo; repete todo mês' : v.tipo === 'entrada' ? 'Entrada salva' : 'Saída salva')
    aoFechar()
  })
  const fechado = data && mesFechado(data)

  return (
    <Folha titulo="Lançar" aoFechar={aoFechar}>
      <form onSubmit={enviar} noValidate style={{ display: 'contents' }}>
        <Controller control={control} name="tipo" render={({ field }) => (
          <div className="seg" role="group" aria-label="Tipo">
            {(['entrada', 'saida'] as const).map((t) => (
              <button key={t} type="button" className={t} aria-pressed={field.value === t} onClick={() => { field.onChange(t); setValue('categoria_id', '') }}>
                {t === 'entrada' ? 'Entrada' : 'Saída'}
              </button>
            ))}
          </div>
        )} />
        <Campo id="l-valor" rotulo={repetir === 'parcelado' ? 'Valor total' : 'Valor'} erro={errors.valor?.message}>
          <input id="l-valor" className="dinheiro" inputMode="decimal" placeholder="R$ 0,00" autoComplete="off" autoFocus aria-invalid={!!errors.valor} {...comValor(register('valor'))} />
        </Campo>
        <Controller control={control} name="categoria_id" render={({ field }) => (
          <div className="campo">
            <span className="rotulo" id="l-cat">Categoria</span>
            <div className="chips" role="group" aria-labelledby="l-cat">
              {cats.map((c) => (
                <button key={c.id} type="button" className="chip" aria-pressed={field.value === c.id} onClick={() => field.onChange(c.id)}>{c.nome}</button>
              ))}
            </div>
            {errors.categoria_id ? <span className="erro" role="alert">{errors.categoria_id.message}</span> : null}
          </div>
        )} />
        <Campo id="l-ev" rotulo="Evento (opcional)">
          <select id="l-ev" {...register('evento_id', { setValueAs: (v) => v || null })}>
            <option value="">Sem evento</option>
            {(eventos.data ?? []).map((e) => <option key={e.id} value={e.id}>{e.titulo} · {diaMes(e.data_evento)}</option>)}
          </select>
        </Campo>
        <div className="duas">
          <Campo id="l-data" rotulo="Data" erro={errors.data?.message}>
            <input id="l-data" type="date" {...register('data')} />
          </Campo>
          <Campo id="l-conta" rotulo="Conta" erro={errors.conta_id?.message}>
            <select id="l-conta" {...register('conta_id')}>
              {(contas.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
        </div>
        <Campo id="l-desc" rotulo="Descrição (opcional)" erro={errors.descricao?.message}>
          <input id="l-desc" placeholder="Ex.: flores do painel" maxLength={120} {...register('descricao')} />
        </Campo>
        <Controller control={control} name="repetir" render={({ field }) => (
          <div className="campo">
            <span className="rotulo" id="l-rep">Repetir</span>
            <div className="seg tres" role="group" aria-labelledby="l-rep">
              {([['nao', 'Uma vez'], ['parcelado', 'Parcelado'], ['mensal', 'Todo mês']] as const).map(([k, t]) => (
                <button key={k} type="button" aria-pressed={field.value === k} onClick={() => { field.onChange(k); if (k === 'parcelado' && !nParcelas) setValue('parcelas', 2) }}>{t}</button>
              ))}
            </div>
          </div>
        )} />
        {repetir === 'parcelado' ? (
          <>
            <Campo id="l-parc" rotulo="Em quantas vezes?" erro={errors.parcelas?.message}>
              <input id="l-parc" type="number" inputMode="numeric" min={2} max={60} aria-invalid={!!errors.parcelas} {...register('parcelas')} />
            </Campo>
            {totalDigitado.success && totalDigitado.data > 0 && nParcelas >= 2 && nParcelas <= 60 ? (
              <div className="previa" aria-live="polite">
                <b>{(() => {
                  const ps = dividirEmParcelas(totalDigitado.data, nParcelas)
                  return ps[0] === ps[nParcelas - 1] ? `${nParcelas}× de ${formatBRL(ps[0])}` : `1ª de ${formatBRL(ps[0])} e ${nParcelas - 1}× de ${formatBRL(ps[nParcelas - 1])}`
                })()}</b>
                <span>Uma por mês, de {dataBR(data || hoje())} a {dataBR(somarMeses(data || hoje(), nParcelas - 1))}.</span>
              </div>
            ) : null}
          </>
        ) : repetir === 'mensal' ? (
          <div className="previa" aria-live="polite">
            <b>Todo dia {Number((data || hoje()).slice(8, 10))}</b>
            <span>Os próximos 6 meses já aparecem previstos no caixa. Para parar, abra o lançamento ou vá em Configurações.</span>
          </div>
        ) : null}
        <label className="chave">
          <span>{repetir === 'parcelado' ? (tipo === 'entrada' ? 'Já recebi a 1ª parcela' : 'Já paguei a 1ª parcela') : repetir === 'mensal' ? (tipo === 'entrada' ? 'Já recebi este mês' : 'Já paguei este mês') : tipo === 'entrada' ? 'Já recebi' : 'Já paguei'}</span>
          <input type="checkbox" {...register('pago')} />
        </label>
        {contas.data && contas.data.length === 0 ? <p className="erro-caixa">Cadastre uma conta em Configurações antes de lançar.</p> : null}
        {fechado ? <p className="erro-caixa">{nomeMes(mesDe(data))} está fechado. Reabra o mês em Relatórios ou escolha outra data.</p> : null}
        {criar.isError ? <p className="erro-caixa" role="alert">{mensagemErro(criar.error)}</p> : null}
        <div className="acoes">
          <button type="button" className="btn btn-s" onClick={aoFechar}>Cancelar</button>
          <button type="submit" className="btn btn-p" disabled={criar.isPending || !!fechado}>
            <Check size={18} aria-hidden="true" />
            {criar.isPending ? 'Salvando…' : repetir === 'parcelado' && nParcelas >= 2 ? `Salvar ${nParcelas} parcelas` : 'Salvar lançamento'}
          </button>
        </div>
      </form>
    </Folha>
  )
}

// ---------------------------------------------------------------------------
// Detalhe de um lançamento
// ---------------------------------------------------------------------------
function LancamentoFolha({ id, aoFechar }: { id: string; aoFechar: () => void }) {
  const { empresaId, empresa, ehProprietaria } = useEmpresa()
  const avisar = useAvisar()
  const lanc = useQuery({
    queryKey: ['lancamentos', empresaId, 'um', id],
    queryFn: async () => verificar('lançamento', await supabase.from('lancamentos').select('*').eq('id', id).maybeSingle()) as Lancamento | null,
  })
  const categorias = useCategorias(empresaId)
  const contas = useContas(empresaId)
  const eventos = useEventos(empresaId)
  const clientes = useClientes(empresaId)
  const marcar = useMarcarPago()
  const excluir = useExcluirLancamento()
  const excluirParcelas = useExcluirParcelas()
  const pararRepeticao = useDesativarRecorrencia()
  const atualizar = useAtualizarLancamento()
  const mesFechado = useMesFechado()
  const [confirmando, setConfirmando] = useState<false | 'um' | 'seguintes' | 'parar'>(false)
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState('')
  const [venc, setVenc] = useState('')
  const [gerando, setGerando] = useState(false)
  const l = lanc.data
  if (lanc.isPending) return <Folha titulo="Lançamento" aoFechar={aoFechar}><p className="muted">Carregando…</p></Folha>
  if (!l || l.excluido_em) return <Folha titulo="Lançamento" aoFechar={aoFechar}><p className="muted">Lançamento não encontrado.</p></Folha>

  const cat = categorias.data?.find((c) => c.id === l.categoria_id)
  const ev = eventos.data?.find((e) => e.id === l.evento_id) ?? null
  const cli = ev?.cliente_id ? clientes.data?.find((c) => c.id === ev.cliente_id) : null
  const travado = mesFechado(l.data_pagamento ?? l.data_vencimento)
  const erro = marcar.error ?? excluir.error ?? atualizar.error ?? excluirParcelas.error ?? pararRepeticao.error
  const temSeguintes = !!l.parcela_grupo && (l.parcela_num ?? 0) < (l.parcela_total ?? 0)

  const salvarEdicao = async () => {
    const r = valorEmReais.safeParse(valor)
    const v = r.success ? r.data : 0
    if (!(v > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(venc)) return
    await atualizar.mutateAsync({ id: l.id, valor: v, data_vencimento: venc })
    setEditando(false)
    avisar('Lançamento atualizado')
  }
  const recibo = async () => {
    setGerando(true)
    try {
      const doc = cli && ehProprietaria ? await buscarDocumento(cli.id) : null
      await baixarRecibo({ empresa, lancamento: l, evento: ev, clienteNome: cli?.nome ?? 'Cliente', clienteDoc: doc })
    } finally {
      setGerando(false)
    }
  }

  return (
    <Folha titulo={l.descricao || cat?.nome || 'Lançamento'} aoFechar={aoFechar}>
      <div className="dre">
        <div className="l"><span className="muted">Valor</span><b className="num">{l.tipo === 'entrada' ? '+' : '−'} {formatBRL(Number(l.valor))}</b></div>
        <div className="l"><span className="muted">Categoria</span><span>{cat?.nome ?? '—'}</span></div>
        {ev ? <div className="l"><span className="muted">Evento</span><span>{ev.titulo}</span></div> : null}
        <div className="l"><span className="muted">Conta</span><span>{contas.data?.find((c) => c.id === l.conta_id)?.nome ?? '—'}</span></div>
        <div className="l"><span className="muted">Vencimento</span><span>{dataBR(l.data_vencimento)}</span></div>
        <div className="l"><span className="muted">Situação</span><span>{l.data_pagamento ? `${l.tipo === 'entrada' ? 'Recebido' : 'Pago'} em ${dataBR(l.data_pagamento)}` : 'Previsto'}</span></div>
        {l.recorrencia_id ? <div className="l"><span className="muted">Repetição</span><span>Todo mês</span></div> : null}
        {l.parcela_grupo ? <div className="l"><span className="muted">Parcela</span><span>{l.parcela_num} de {l.parcela_total}</span></div> : null}
      </div>
      {erro ? <p className="erro-caixa" role="alert">{mensagemErro(erro)}</p> : null}
      {travado ? (
        <p className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Lock size={16} aria-hidden="true" /> {nomeMes(mesDe(l.data_pagamento ?? l.data_vencimento))} está fechado. Para alterar, reabra o mês em Relatórios.</p>
      ) : editando ? (
        <div className="duas">
          <Campo id="e-valor" rotulo="Valor"><input id="e-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} onBlur={(e) => setValor(formatarValorDigitado(e.target.value))} /></Campo>
          <Campo id="e-venc" rotulo="Vencimento"><input id="e-venc" type="date" value={venc} onChange={(e) => setVenc(e.target.value)} /></Campo>
          <div className="acoes" style={{ gridColumn: '1 / -1' }}>
            <button type="button" className="btn btn-s" onClick={() => setEditando(false)}>Cancelar</button>
            <button type="button" className="btn btn-p" onClick={salvarEdicao} disabled={atualizar.isPending}>Salvar alteração</button>
          </div>
        </div>
      ) : confirmando === 'um' ? (
        <Confirmar titulo={l.parcela_grupo ? 'Excluir só esta parcela?' : 'Excluir este lançamento?'} texto={`${formatBRL(Number(l.valor))} · ${cat?.nome ?? ''}. Ele sai dos relatórios e do saldo.`} rotulo="Excluir"
          ocupado={excluir.isPending} aoCancelar={() => setConfirmando(false)}
          aoConfirmar={async () => { await excluir.mutateAsync(l.id); avisar('Lançamento excluído'); aoFechar() }} />
      ) : confirmando === 'seguintes' ? (
        <Confirmar titulo={`Excluir a parcela ${l.parcela_num} e as seguintes?`} texto="Saem as que ainda não foram pagas, desta até a última. As já pagas continuam." rotulo="Excluir parcelas"
          ocupado={excluirParcelas.isPending} aoCancelar={() => setConfirmando(false)}
          aoConfirmar={async () => { await excluirParcelas.mutateAsync({ grupo: l.parcela_grupo!, aPartirDe: l.parcela_num! }); avisar('Parcelas excluídas'); aoFechar() }} />
      ) : confirmando === 'parar' ? (
        <Confirmar titulo="Parar de repetir?" texto={`Os meses previstos depois de ${dataBR(l.data_vencimento)} saem do caixa. Este e os já pagos continuam.`} rotulo="Parar de repetir"
          ocupado={pararRepeticao.isPending} aoCancelar={() => setConfirmando(false)}
          aoConfirmar={async () => { await pararRepeticao.mutateAsync({ id: l.recorrencia_id!, depoisDe: l.data_vencimento }); avisar('Não repete mais'); aoFechar() }} />
      ) : (
        <div className="acoes">
          <button type="button" className="btn btn-g" onClick={() => setConfirmando('um')}>{l.parcela_grupo ? 'Excluir parcela' : 'Excluir'}</button>
          {temSeguintes ? <button type="button" className="btn btn-g" onClick={() => setConfirmando('seguintes')}>Excluir esta e as seguintes</button> : null}
          {l.recorrencia_id ? <button type="button" className="btn btn-g" onClick={() => setConfirmando('parar')}>Parar de repetir</button> : null}
          <button type="button" className="btn btn-s" onClick={() => { setValor(formatarValorDigitado(String(l.valor).replace('.', ','))); setVenc(l.data_vencimento); setEditando(true) }}>Editar</button>
          {l.tipo === 'entrada' && l.data_pagamento ? (
            <button type="button" className="btn btn-s" onClick={recibo} disabled={gerando}><Receipt size={18} aria-hidden="true" />{gerando ? 'Gerando…' : 'Recibo em PDF'}</button>
          ) : null}
          {!l.data_pagamento ? (
            <button type="button" className="btn btn-p" disabled={marcar.isPending}
              onClick={async () => { await marcar.mutateAsync({ id: l.id, data: hoje() }); avisar(l.tipo === 'entrada' ? 'Recebimento confirmado' : 'Pagamento confirmado'); aoFechar() }}>
              <Check size={18} aria-hidden="true" />{l.tipo === 'entrada' ? 'Marcar como recebido' : 'Marcar como pago'}
            </button>
          ) : null}
        </div>
      )}
    </Folha>
  )
}

// ---------------------------------------------------------------------------
// Novo orçamento (ou venda já fechada, ou turma de workshop)
// ---------------------------------------------------------------------------
export const FONTES = [['decoracao', 'Decoração'], ['assessoria', 'Assessoria'], ['workshop', 'Workshop']] as const
const TIPOS = [['infantil', 'Festa infantil'], ['casamento', 'Casamento'], ['quinze_anos', '15 anos'], ['cha', 'Chá'], ['batizado', 'Batizado'], ['corporativo', 'Corporativo'], ['outro', 'Outro']] as const

function NovoEventoFolha({ aoFechar }: { aoFechar: () => void }) {
  const { empresaId, empresa, veFinanceiro } = useEmpresa()
  const avisar = useAvisar()
  const navegar = useNavigate()
  const { abrir } = useFolhas()
  const clientes = useClientes(empresaId)
  const contas = useContas(empresaId)
  const criar = useCriarEvento(empresaId)
  const [logistica, setLogistica] = useState(false)
  const [erroConta, setErroConta] = useState(false)
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<NovoEvento, unknown, EventoValido>({
    resolver: zodResolver(esquemaEvento),
    defaultValues: {
      titulo: '', tipo: 'infantil', areas: ['decoracao'], fechado: false, cliente_id: null, data_evento: '', cidade: '', valor_fechado: '',
      valores: { decoracao: '', assessoria: '', workshop: '' }, entrada_percentual: Number(empresa.entrada_percentual), data_entrada: hoje(),
      conta_id: '', vagas: null, valor_inscricao: null, observacoes: '',
    },
  })
  useEffect(() => {
    if (contas.data?.[0]) setValue('conta_id', contas.data[0].id)
  }, [contas.data, setValue])
  const areas = watch('areas')
  const ws = areas.length === 1 && areas[0] === 'workshop'
  const fechado = watch('fechado')
  const reais = (v: unknown) => {
    const r = valorEmReais.safeParse(v ?? '')
    return r.success ? r.data : 0
  }
  const valor = reais(watch('valor_fechado'))
  const valores = watch('valores')
  const somaAreas = areas.reduce((t, a) => t + reais(valores?.[a]), 0)
  const pct = Number(watch('entrada_percentual')) || 0
  const dataEv = watch('data_evento')
  const prev = useMemo(() => parcelasSugeridas(valor, pct), [valor, pct])

  const enviar = handleSubmit(async (v) => {
    if (v.fechado && !v.turma && veFinanceiro && !v.conta_id) return setErroConta(true)
    const id = await criar.mutateAsync(v)
    avisar(v.turma ? 'Workshop salvo' : v.fechado ? 'Venda fechada: já está em Contratos' : 'Orçamento salvo')
    aoFechar()
    navegar(`/vendas/${id}`)
  })

  return (
    <Folha titulo={ws ? 'Novo workshop' : 'Novo orçamento'} aoFechar={aoFechar}>
      <form onSubmit={enviar} noValidate style={{ display: 'contents' }}>
        <Campo id="n-tit" rotulo="Nome do evento" erro={errors.titulo?.message}>
          <input id="n-tit" placeholder="Ex.: Aniversário de 5 anos · Laura" maxLength={120} autoFocus aria-invalid={!!errors.titulo} {...register('titulo')} />
        </Campo>
        <Controller control={control} name="areas" render={({ field }) => (
          <div className="campo">
            <span className="rotulo" id="n-areas">Áreas <span className="muted" style={{ fontWeight: 400 }}>(marque quantas quiser)</span></span>
            <div className="chips" role="group" aria-labelledby="n-areas">
              {FONTES.map(([k, t]) => {
                const marcada = field.value.includes(k)
                return (
                  <button key={k} type="button" className="chip" aria-pressed={marcada}
                    onClick={() => field.onChange(marcada ? field.value.filter((x) => x !== k) : FONTES.map(([f]) => f).filter((f) => f === k || field.value.includes(f)))}>
                    {marcada ? <Check size={16} aria-hidden="true" /> : null}{t}
                  </button>
                )
              })}
            </div>
            {errors.areas ? <span className="erro" role="alert">{errors.areas.message}</span> : null}
            {ws ? <span className="dica">Só workshop: é uma turma aberta, com inscrições. Vai direto para Eventos.</span> : null}
          </div>
        )} />
        {!ws ? (
          <>
            <div className="duas">
              <Campo id="n-cli" rotulo="Cliente" erro={errors.cliente_id?.message}>
                <select id="n-cli" aria-invalid={!!errors.cliente_id} {...register('cliente_id', { setValueAs: (v) => v || null })}>
                  <option value="">Escolha o cliente</option>
                  {(clientes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Campo>
              <Campo id="n-tipo" rotulo="Tipo de festa">
                <select id="n-tipo" {...register('tipo')}>{TIPOS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>
              </Campo>
            </div>
            <button type="button" className="btn btn-g btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => abrir({ tipo: 'novo-cliente' })}>Cadastrar novo cliente</button>
          </>
        ) : null}
        <div className="duas">
          <Campo id="n-data" rotulo="Data do evento" erro={errors.data_evento?.message}>
            <input id="n-data" type="date" aria-invalid={!!errors.data_evento} {...register('data_evento')} />
          </Campo>
          <Campo id="n-cidade" rotulo="Cidade">
            <input id="n-cidade" placeholder="Ex.: Jundiaí" maxLength={80} autoCapitalize="words" {...comNome(register('cidade'))} />
          </Campo>
        </div>
        {ws ? (
          <div className="duas">
            <Campo id="n-vagas" rotulo="Vagas"><input id="n-vagas" type="number" min={1} {...register('vagas', { setValueAs: (v) => (v ? Number(v) : null) })} /></Campo>
            <Campo id="n-insc" rotulo="Valor da inscrição" erro={errors.valor_inscricao?.message}>
              <input id="n-insc" inputMode="decimal" placeholder="R$ 0,00" {...comValor(register('valor_inscricao', { setValueAs: (v) => v || null }))} />
            </Campo>
          </div>
        ) : (
          <>
            <Controller control={control} name="fechado" render={({ field }) => (
              <div className="campo">
                <span className="rotulo" id="n-etapa">Em que pé está?</span>
                <div className="seg" role="group" aria-labelledby="n-etapa">
                  <button type="button" aria-pressed={!field.value} onClick={() => field.onChange(false)}>Orçamento</button>
                  <button type="button" aria-pressed={field.value} onClick={() => field.onChange(true)}>Já fechou</button>
                </div>
                <span className="dica">{field.value ? 'Vira contrato agora, com a entrada e o saldo previstos.' : 'Ainda não fechou: fica em Orçamentos, sem parcelas e sem tirar nada do estoque.'}</span>
              </div>
            )} />
            <Campo id="n-valor" rotulo={fechado ? 'Valor fechado' : 'Valor estimado (opcional)'} erro={errors.valor_fechado?.message}
              dica={!fechado ? 'Se montar a lista de peças e serviços, o total sai dela.' : undefined}>
              <input id="n-valor" inputMode="decimal" placeholder="R$ 0,00" aria-invalid={!!errors.valor_fechado} {...comValor(register('valor_fechado'))} />
            </Campo>
            {fechado && areas.length > 1 ? (
              <div className="campo">
                <span className="rotulo" id="n-va">Quanto é de cada área?</span>
                <div className="duas" role="group" aria-labelledby="n-va">
                  {FONTES.filter(([k]) => areas.includes(k)).map(([k, t]) => (
                    <Campo key={k} id={`n-va-${k}`} rotulo={t}>
                      <input id={`n-va-${k}`} inputMode="decimal" placeholder="R$ 0,00" {...comValor(register(`valores.${k}`))} />
                    </Campo>
                  ))}
                </div>
                <span className={errors.valores ? 'erro' : 'dica'} role={errors.valores ? 'alert' : undefined}>
                  {errors.valores?.message ?? `Somando ${formatBRL(somaAreas)} de ${formatBRL(valor)}.`} Serve para o relatório de lucro por área.
                </span>
              </div>
            ) : null}
            {fechado && veFinanceiro ? (
              <>
                <div className="duas">
                  <Campo id="n-pct" rotulo="Entrada (%)"><input id="n-pct" type="number" min={0} max={100} {...register('entrada_percentual', { valueAsNumber: true })} /></Campo>
                  <Campo id="n-dent" rotulo="Data da entrada"><input id="n-dent" type="date" {...register('data_entrada')} /></Campo>
                </div>
                <Campo id="n-conta" rotulo="Conta que recebe" erro={erroConta ? 'Cadastre uma conta em Configurações.' : undefined}>
                  <select id="n-conta" {...register('conta_id')}>{(contas.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
                </Campo>
                <div className="previa" aria-live="polite">
                  <b>Parcelas previstas</b>
                  <span className="num">Entrada {formatBRL(prev.entrada)} em {diaMes(watch('data_entrada') || hoje())}</span>
                  <span className="num">Saldo {formatBRL(prev.saldo)} até {dataEv ? diaMes(addDias(dataEv, -Number(empresa.dias_saldo_antes_evento))) : '—'} ({empresa.dias_saldo_antes_evento} dias antes)</span>
                  <span className="muted">Depois de salvar, dá para mudar valores e datas e dividir em mais parcelas.</span>
                </div>
              </>
            ) : null}
            {!fechado ? (
              <Campo id="n-obs" rotulo="Rascunho (opcional)" dica="Ideias, tema, cores, combinados com o cliente. Só a equipe vê.">
                <textarea id="n-obs" rows={3} maxLength={2000} placeholder="Ex.: tema jardim encantado, tons de rosa e verde, mesa para 40 convidados" {...register('observacoes')} />
              </Campo>
            ) : null}
          </>
        )}
        <label className="chave">
          <span>Preencher logística (local, entrega e devolução)</span>
          <input type="checkbox" checked={logistica} onChange={(e) => setLogistica(e.target.checked)} />
        </label>
        {logistica ? (
          <>
            <div className="duas">
              <Campo id="n-local" rotulo="Local"><input id="n-local" maxLength={120} {...register('local_nome')} /></Campo>
              <Campo id="n-end" rotulo="Endereço do local"><input id="n-end" maxLength={200} placeholder="Rua, número – bairro" autoCapitalize="words" {...register('local_endereco')} /></Campo>
            </div>
            <div className="duas">
              <Campo id="n-ent" rotulo="Entrega"><input id="n-ent" type="datetime-local" {...register('entrega_em')} /></Campo>
              <Campo id="n-dev" rotulo="Devolução"><input id="n-dev" type="datetime-local" {...register('devolucao_em')} /></Campo>
            </div>
          </>
        ) : null}
        {criar.isError ? <p className="erro-caixa" role="alert">{mensagemErro(criar.error)}</p> : null}
        <div className="acoes">
          <button type="button" className="btn btn-s" onClick={aoFechar}>Cancelar</button>
          <button type="submit" className="btn btn-p" disabled={criar.isPending}>
            <Check size={18} aria-hidden="true" />{criar.isPending ? 'Salvando…' : ws ? 'Salvar workshop' : fechado ? 'Fechar venda' : 'Salvar orçamento'}
          </button>
        </div>
      </form>
    </Folha>
  )
}

// ---------------------------------------------------------------------------
// Novo cliente (CPF/CNPJ e IE só para a proprietária, que é quem pode gravá-los)
// ---------------------------------------------------------------------------
function NovoClienteFolha({ aoFechar }: { aoFechar: () => void }) {
  const { empresaId, ehProprietaria } = useEmpresa()
  const avisar = useAvisar()
  const criar = useCriarCliente(empresaId)
  const { register, handleSubmit, watch, formState: { errors } } = useForm<NovoCliente, unknown, ClienteValido>({
    resolver: zodResolver(esquemaCliente),
    defaultValues: { nome: '', telefone: '', email: '', cep: '', endereco: '', cidade: '', origem: 'instagram', cpf_cnpj: '', inscricao_estadual: '' },
  })
  const ehCnpj = (watch('cpf_cnpj') ?? '').replace(/\D/g, '').length === 14
  const enviar = handleSubmit(async (v) => {
    await criar.mutateAsync(ehProprietaria ? v : { ...v, cpf_cnpj: null, inscricao_estadual: null })
    avisar('Cliente salvo')
    aoFechar()
  })
  return (
    <Folha titulo="Novo cliente" aoFechar={aoFechar}>
      <form onSubmit={enviar} noValidate style={{ display: 'contents' }}>
        <Campo id="c-nome" rotulo="Nome completo" erro={errors.nome?.message}>
          <input id="c-nome" autoComplete="off" autoCapitalize="words" autoFocus maxLength={120} aria-invalid={!!errors.nome} {...comNome(register('nome'))} />
        </Campo>
        <div className="duas">
          <Campo id="c-tel" rotulo="Telefone" erro={errors.telefone?.message}>
            <input id="c-tel" type="tel" inputMode="tel" autoComplete="off" placeholder="(11) 99999-9999" maxLength={15} aria-invalid={!!errors.telefone} {...comMascara(register('telefone'), mascaraTelefone)} />
          </Campo>
          <Campo id="c-email" rotulo="E-mail" erro={errors.email?.message}>
            <input id="c-email" type="email" inputMode="email" autoCapitalize="off" autoComplete="off" placeholder="nome@exemplo.com" aria-invalid={!!errors.email} {...comMascara(register('email'), (v) => v.toLowerCase().trim())} />
          </Campo>
        </div>
        <div className="duas cep">
          <Campo id="c-cep" rotulo="CEP" erro={errors.cep?.message}><input id="c-cep" inputMode="numeric" autoComplete="off" placeholder="00000-000" maxLength={9} aria-invalid={!!errors.cep} {...comMascara(register('cep'), mascaraCEP)} /></Campo>
          <Campo id="c-end" rotulo="Endereço"><input id="c-end" maxLength={200} placeholder="Rua, número, complemento – bairro" autoCapitalize="words" {...register('endereco')} /></Campo>
        </div>
        <div className="duas">
          <Campo id="c-cid" rotulo="Cidade"><input id="c-cid" maxLength={80} autoCapitalize="words" placeholder="Ex.: Louveira" {...comNome(register('cidade'))} /></Campo>
          <Campo id="c-orig" rotulo="Como chegou">
            <select id="c-orig" {...register('origem')}>
              <option value="instagram">Instagram</option><option value="indicacao">Indicação</option><option value="whatsapp">WhatsApp</option>
              <option value="site">Site</option><option value="outra">Outra</option>
            </select>
          </Campo>
        </div>
        {ehProprietaria ? (
          <div className="duas">
            <Campo id="c-doc" rotulo="CPF ou CNPJ" erro={errors.cpf_cnpj?.message} dica="Só se for preciso para contrato ou nota fiscal.">
              <input id="c-doc" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" maxLength={18} aria-invalid={!!errors.cpf_cnpj} {...comMascara(register('cpf_cnpj'), mascaraDoc)} />
            </Campo>
            {ehCnpj ? (
              <Campo id="c-ie" rotulo="Inscrição estadual" erro={errors.inscricao_estadual?.message} dica="Só números. Se a empresa não tem, escreva ISENTO.">
                <input id="c-ie" autoComplete="off" autoCapitalize="characters" placeholder="000.000.000.000" maxLength={20} aria-invalid={!!errors.inscricao_estadual} {...register('inscricao_estadual')} />
              </Campo>
            ) : null}
          </div>
        ) : null}
        {criar.isError ? <p className="erro-caixa" role="alert">{mensagemErro(criar.error)}</p> : null}
        <div className="acoes">
          <button type="button" className="btn btn-s" onClick={aoFechar}>Cancelar</button>
          <button type="submit" className="btn btn-p" disabled={criar.isPending}><Check size={18} aria-hidden="true" />{criar.isPending ? 'Salvando…' : 'Salvar cliente'}</button>
        </div>
      </form>
    </Folha>
  )
}
