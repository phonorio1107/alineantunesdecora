import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Check, Lock, Receipt } from 'lucide-react'
import { useAvisar, useEmpresa, useFolhas } from '../app/contexto'
import {
  buscarDocumento, useAtualizarLancamento, useCategorias, useClientes, useContas, useCriarCliente, useCriarEvento, useCriarLancamento,
  useEventos, useExcluirLancamento, useFechamentos, useMarcarPago,
} from '../data/consultas'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Lancamento } from '../data/tipos'
import {
  esquemaCliente, esquemaEvento, esquemaLancamento, type ClienteValido, type EventoValido, type LancamentoValido, type NovoCliente, type NovoEvento, type NovoLancamento,
} from '../data/esquemas'
import { baixarRecibo } from '../export/acoes'
import { parcelasSugeridas } from '../lib/calculos'
import { mensagemErro, verificar } from '../lib/erros'
import { addDias, dataBR, diaMes, formatBRL, hoje, mesDe, nomeMes } from '../lib/format'
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
    defaultValues: { tipo: tipoInicial, valor: '', categoria_id: '', conta_id: '', evento_id: eventoId ?? null, data: hoje(), pago: true, descricao: '' },
  })
  const tipo = watch('tipo')
  const data = watch('data')
  useEffect(() => {
    if (contas.data?.[0] && !watch('conta_id')) setValue('conta_id', contas.data[0].id)
  }, [contas.data, setValue, watch])
  const cats = (categorias.data ?? []).filter((c) => c.tipo === tipo)
  const enviar = handleSubmit(async (v) => {
    await criar.mutateAsync(v)
    avisar(v.tipo === 'entrada' ? 'Entrada salva' : 'Saída salva')
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
        <Campo id="l-valor" rotulo="Valor" erro={errors.valor?.message}>
          <input id="l-valor" className="dinheiro" inputMode="decimal" placeholder="R$ 0,00" autoComplete="off" autoFocus aria-invalid={!!errors.valor} {...register('valor')} />
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
        <label className="chave">
          <span>{tipo === 'entrada' ? 'Já recebi' : 'Já paguei'}</span>
          <input type="checkbox" {...register('pago')} />
        </label>
        {contas.data && contas.data.length === 0 ? <p className="erro-caixa">Cadastre uma conta em Configurações antes de lançar.</p> : null}
        {fechado ? <p className="erro-caixa">{nomeMes(mesDe(data))} está fechado. Reabra o mês em Relatórios ou escolha outra data.</p> : null}
        {criar.isError ? <p className="erro-caixa" role="alert">{mensagemErro(criar.error)}</p> : null}
        <div className="acoes">
          <button type="button" className="btn btn-s" onClick={aoFechar}>Cancelar</button>
          <button type="submit" className="btn btn-p" disabled={criar.isPending || !!fechado}>
            <Check size={18} aria-hidden="true" />
            {criar.isPending ? 'Salvando…' : 'Salvar lançamento'}
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
  const atualizar = useAtualizarLancamento()
  const mesFechado = useMesFechado()
  const [confirmando, setConfirmando] = useState(false)
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
  const erro = marcar.error ?? excluir.error ?? atualizar.error

  const salvarEdicao = async () => {
    const v = Number(valor.replace(/\./g, '').replace(',', '.'))
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
        {l.recorrencia_id ? <div className="l"><span className="muted">Origem</span><span>Custo fixo mensal</span></div> : null}
      </div>
      {erro ? <p className="erro-caixa" role="alert">{mensagemErro(erro)}</p> : null}
      {travado ? (
        <p className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Lock size={16} aria-hidden="true" /> {nomeMes(mesDe(l.data_pagamento ?? l.data_vencimento))} está fechado. Para alterar, reabra o mês em Relatórios.</p>
      ) : editando ? (
        <div className="duas">
          <Campo id="e-valor" rotulo="Valor"><input id="e-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></Campo>
          <Campo id="e-venc" rotulo="Vencimento"><input id="e-venc" type="date" value={venc} onChange={(e) => setVenc(e.target.value)} /></Campo>
          <div className="acoes" style={{ gridColumn: '1 / -1' }}>
            <button type="button" className="btn btn-s" onClick={() => setEditando(false)}>Cancelar</button>
            <button type="button" className="btn btn-p" onClick={salvarEdicao} disabled={atualizar.isPending}>Salvar alteração</button>
          </div>
        </div>
      ) : confirmando ? (
        <Confirmar titulo="Excluir este lançamento?" texto={`${formatBRL(Number(l.valor))} · ${cat?.nome ?? ''}. Ele sai dos relatórios e do saldo.`} rotulo="Excluir lançamento"
          ocupado={excluir.isPending} aoCancelar={() => setConfirmando(false)}
          aoConfirmar={async () => { await excluir.mutateAsync(l.id); avisar('Lançamento excluído'); aoFechar() }} />
      ) : (
        <div className="acoes">
          <button type="button" className="btn btn-g" onClick={() => setConfirmando(true)}>Excluir</button>
          <button type="button" className="btn btn-s" onClick={() => { setValor(String(l.valor).replace('.', ',')); setVenc(l.data_vencimento); setEditando(true) }}>Editar</button>
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
// Novo evento (entrada de 30% e saldo 5 dias antes, editáveis)
// ---------------------------------------------------------------------------
const FONTES = [['decoracao', 'Decoração'], ['assessoria', 'Assessoria'], ['workshop', 'Workshop']] as const
const TIPOS = [['infantil', 'Festa infantil'], ['casamento', 'Casamento'], ['quinze_anos', '15 anos'], ['cha', 'Chá'], ['batizado', 'Batizado'], ['corporativo', 'Corporativo'], ['outro', 'Outro']] as const

function NovoEventoFolha({ aoFechar }: { aoFechar: () => void }) {
  const { empresaId, empresa } = useEmpresa()
  const avisar = useAvisar()
  const navegar = useNavigate()
  const { abrir } = useFolhas()
  const clientes = useClientes(empresaId)
  const contas = useContas(empresaId)
  const criar = useCriarEvento(empresaId)
  const [logistica, setLogistica] = useState(false)
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<NovoEvento, unknown, EventoValido>({
    resolver: zodResolver(esquemaEvento),
    defaultValues: {
      titulo: '', tipo: 'infantil', fonte: 'decoracao', cliente_id: null, data_evento: '', cidade: '', valor_fechado: '',
      entrada_percentual: Number(empresa.entrada_percentual), data_entrada: hoje(), conta_id: '', vagas: null, valor_inscricao: null,
    },
  })
  useEffect(() => {
    if (contas.data?.[0]) setValue('conta_id', contas.data[0].id)
  }, [contas.data, setValue])
  const fonte = watch('fonte')
  const ws = fonte === 'workshop'
  const valor = Number(String(watch('valor_fechado') ?? '').replace(/\./g, '').replace(',', '.')) || 0
  const pct = Number(watch('entrada_percentual')) || 0
  const dataEv = watch('data_evento')
  const prev = useMemo(() => parcelasSugeridas(valor, pct), [valor, pct])

  const enviar = handleSubmit(async (v) => {
    const payload = ws ? { ...v, tipo: 'workshop' as const, cliente_id: null, valor_fechado: 0 } : { ...v, vagas: null, valor_inscricao: null }
    const id = await criar.mutateAsync(payload)
    avisar('Evento salvo')
    aoFechar()
    navegar(`/eventos/${id}`)
  })

  return (
    <Folha titulo="Novo evento" aoFechar={aoFechar}>
      <form onSubmit={enviar} noValidate style={{ display: 'contents' }}>
        <Campo id="n-tit" rotulo="Nome do evento" erro={errors.titulo?.message}>
          <input id="n-tit" placeholder="Ex.: Aniversário de 5 anos · Laura" maxLength={120} autoFocus aria-invalid={!!errors.titulo} {...register('titulo')} />
        </Campo>
        <Controller control={control} name="fonte" render={({ field }) => (
          <div className="campo">
            <span className="rotulo" id="n-fonte">Área</span>
            <div className="chips" role="group" aria-labelledby="n-fonte">
              {FONTES.map(([k, t]) => <button key={k} type="button" className="chip" aria-pressed={field.value === k} onClick={() => field.onChange(k)}>{t}</button>)}
            </div>
          </div>
        )} />
        {!ws ? (
          <>
            <div className="duas">
              <Campo id="n-cli" rotulo="Cliente" erro={errors.cliente_id?.message}>
                <select id="n-cli" aria-invalid={!!errors.cliente_id} {...register('cliente_id', { setValueAs: (v) => v || null })}>
                  <option value="">Escolha a cliente</option>
                  {(clientes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Campo>
              <Campo id="n-tipo" rotulo="Tipo de festa">
                <select id="n-tipo" {...register('tipo')}>{TIPOS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>
              </Campo>
            </div>
            <button type="button" className="btn btn-g btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => abrir({ tipo: 'novo-cliente' })}>Cadastrar nova cliente</button>
          </>
        ) : null}
        <div className="duas">
          <Campo id="n-data" rotulo="Data do evento" erro={errors.data_evento?.message}>
            <input id="n-data" type="date" aria-invalid={!!errors.data_evento} {...register('data_evento')} />
          </Campo>
          <Campo id="n-cidade" rotulo="Cidade">
            <input id="n-cidade" placeholder="Ex.: Jundiaí" maxLength={80} {...register('cidade')} />
          </Campo>
        </div>
        {ws ? (
          <div className="duas">
            <Campo id="n-vagas" rotulo="Vagas"><input id="n-vagas" type="number" min={1} {...register('vagas', { setValueAs: (v) => (v ? Number(v) : null) })} /></Campo>
            <Campo id="n-insc" rotulo="Valor da inscrição" erro={errors.valor_inscricao?.message}>
              <input id="n-insc" inputMode="decimal" placeholder="R$ 0,00" {...register('valor_inscricao', { setValueAs: (v) => v || null })} />
            </Campo>
          </div>
        ) : (
          <>
            <Campo id="n-valor" rotulo="Valor fechado" erro={errors.valor_fechado?.message}>
              <input id="n-valor" inputMode="decimal" placeholder="R$ 0,00" aria-invalid={!!errors.valor_fechado} {...register('valor_fechado')} />
            </Campo>
            <div className="duas">
              <Campo id="n-pct" rotulo="Entrada (%)"><input id="n-pct" type="number" min={0} max={100} {...register('entrada_percentual', { valueAsNumber: true })} /></Campo>
              <Campo id="n-dent" rotulo="Data da entrada"><input id="n-dent" type="date" {...register('data_entrada')} /></Campo>
            </div>
            <Campo id="n-conta" rotulo="Conta que recebe">
              <select id="n-conta" {...register('conta_id')}>{(contas.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
            </Campo>
            <div className="previa" aria-live="polite">
              <b>Parcelas previstas</b>
              <span className="num">Entrada {formatBRL(prev.entrada)} em {diaMes(watch('data_entrada') || hoje())}</span>
              <span className="num">Saldo {formatBRL(prev.saldo)} até {dataEv ? diaMes(addDias(dataEv, -Number(empresa.dias_saldo_antes_evento))) : '—'} ({empresa.dias_saldo_antes_evento} dias antes)</span>
              <span className="muted">Depois de salvar, dá para mudar valores e datas e dividir em mais parcelas.</span>
            </div>
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
              <Campo id="n-end" rotulo="Endereço do local"><input id="n-end" maxLength={200} {...register('local_endereco')} /></Campo>
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
          <button type="submit" className="btn btn-p" disabled={criar.isPending}><Check size={18} aria-hidden="true" />{criar.isPending ? 'Salvando…' : 'Salvar evento'}</button>
        </div>
      </form>
    </Folha>
  )
}

// ---------------------------------------------------------------------------
// Nova cliente (CPF/CNPJ só para a proprietária, que é quem pode gravá-lo)
// ---------------------------------------------------------------------------
function NovoClienteFolha({ aoFechar }: { aoFechar: () => void }) {
  const { empresaId, ehProprietaria } = useEmpresa()
  const avisar = useAvisar()
  const criar = useCriarCliente(empresaId)
  const { register, handleSubmit, formState: { errors } } = useForm<NovoCliente, unknown, ClienteValido>({
    resolver: zodResolver(esquemaCliente),
    defaultValues: { nome: '', telefone: '', email: '', endereco: '', cidade: '', origem: 'instagram', cpf_cnpj: '' },
  })
  const enviar = handleSubmit(async (v) => {
    await criar.mutateAsync(ehProprietaria ? v : { ...v, cpf_cnpj: null })
    avisar('Cliente salva')
    aoFechar()
  })
  return (
    <Folha titulo="Nova cliente" aoFechar={aoFechar}>
      <form onSubmit={enviar} noValidate style={{ display: 'contents' }}>
        <Campo id="c-nome" rotulo="Nome completo" erro={errors.nome?.message}>
          <input id="c-nome" autoComplete="off" autoFocus maxLength={120} aria-invalid={!!errors.nome} {...register('nome')} />
        </Campo>
        <div className="duas">
          <Campo id="c-tel" rotulo="Telefone" erro={errors.telefone?.message}>
            <input id="c-tel" inputMode="tel" placeholder="(11) 99999-9999" aria-invalid={!!errors.telefone} {...register('telefone')} />
          </Campo>
          <Campo id="c-email" rotulo="E-mail" erro={errors.email?.message}>
            <input id="c-email" type="email" inputMode="email" aria-invalid={!!errors.email} {...register('email')} />
          </Campo>
        </div>
        <Campo id="c-end" rotulo="Endereço"><input id="c-end" maxLength={200} {...register('endereco')} /></Campo>
        <div className="duas">
          <Campo id="c-cid" rotulo="Cidade"><input id="c-cid" maxLength={80} {...register('cidade')} /></Campo>
          <Campo id="c-orig" rotulo="Como chegou">
            <select id="c-orig" {...register('origem')}>
              <option value="instagram">Instagram</option><option value="indicacao">Indicação</option><option value="whatsapp">WhatsApp</option>
              <option value="site">Site</option><option value="outra">Outra</option>
            </select>
          </Campo>
        </div>
        {ehProprietaria ? (
          <Campo id="c-doc" rotulo="CPF ou CNPJ" erro={errors.cpf_cnpj?.message} dica="Só se for preciso para contrato ou nota fiscal.">
            <input id="c-doc" inputMode="numeric" aria-invalid={!!errors.cpf_cnpj} {...register('cpf_cnpj')} />
          </Campo>
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
