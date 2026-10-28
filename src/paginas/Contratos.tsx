import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, Download, FileSignature, Plus, Trash2 } from 'lucide-react'
import { useAvisar, useEmpresa } from '../app/contexto'
import { buscarDocumento, useAtualizarContrato, useClientes, useContratos, useEmitirContrato, useEventos } from '../data/consultas'
import type { Contrato, DadosContrato, Evento, Lancamento } from '../data/tipos'
import { Alerta, Campo, Carregando, Confirmar, ErroCaixa, Folha, Vazio } from '../components/ui'
import { baixarContrato } from '../export/acoes'
import { MODELO_CONTRATO } from '../pdf/clausulas'
import { dataBR, formatBRL, hoje } from '../lib/format'
import { mensagemErro, verificar } from '../lib/erros'
import { supabase } from '../lib/supabase'

export default function Contratos() {
  const { empresaId, ehProprietaria } = useEmpresa()
  const contratos = useContratos(empresaId, ehProprietaria)
  const eventos = useEventos(empresaId)
  const [params, setParams] = useSearchParams()
  const [emitindo, setEmitindo] = useState<string | null>(params.get('evento'))
  const [aberto, setAberto] = useState<Contrato | null>(null)

  if (!ehProprietaria) return <Vazio titulo="Só a proprietária acessa os contratos." texto="Eles têm CPF e dados de pagamento das clientes." />
  const titulo = (id: string) => eventos.data?.find((e) => e.id === id)?.titulo ?? '—'
  const fecharEmissao = () => { setEmitindo(null); if (params.get('evento')) setParams({}) }

  return (
    <>
      <div className="cabecalho">
        <div><h1>Contratos</h1><p className="muted">Gere o contrato de cada evento com os dados já preenchidos, no modelo da Aline.</p></div>
        <button type="button" className="btn btn-p" onClick={() => setEmitindo('')}><Plus size={20} aria-hidden="true" />Novo contrato</button>
      </div>
      <section className="cartao">
        {contratos.isPending ? <Carregando /> : contratos.isError ? <ErroCaixa erro={contratos.error} aoTentar={() => contratos.refetch()} /> : (
          <div className="linhas">
            {(contratos.data ?? []).length ? contratos.data!.map((c) => (
              <button key={c.id} type="button" className="linha" onClick={() => setAberto(c)}>
                <span className="bolinha saida" aria-hidden="true"><FileSignature size={18} /></span>
                <span className="cresce">
                  <span className="t">{c.numero} V.{c.versao} · {c.dados.cliente.nome}</span>
                  <span className="s">{titulo(c.evento_id)} · emitido em {dataBR(c.emitido_em.slice(0, 10))}</span>
                </span>
                {c.cancelado_em ? <span className="pill ruim">Cancelado</span> : c.assinado_em ? <span className="pill bom">Assinado</span> : <span className="pill atencao">Aguardando assinatura</span>}
              </button>
            )) : <Vazio titulo="Nenhum contrato emitido ainda." texto="Toque em “Novo contrato” ou abra um evento e toque em “Contrato”." />}
          </div>
        )}
      </section>
      {emitindo !== null ? <EmitirFolha eventoInicial={emitindo} aoFechar={fecharEmissao} /> : null}
      {aberto ? <ContratoFolha contrato={aberto} aoFechar={() => setAberto(null)} /> : null}
    </>
  )
}

function ContratoFolha({ contrato: c, aoFechar }: { contrato: Contrato; aoFechar: () => void }) {
  const avisar = useAvisar()
  const atualizar = useAtualizarContrato()
  const [cancelando, setCancelando] = useState(false)
  const [baixando, setBaixando] = useState(false)
  return (
    <Folha titulo={`Contrato ${c.numero} V.${c.versao}`} aoFechar={aoFechar}>
      <div className="dre">
        <div className="l"><span className="muted">Cliente</span><span>{c.dados.cliente.nome}</span></div>
        <div className="l"><span className="muted">Evento</span><span>{c.dados.evento.titulo} · {dataBR(c.dados.evento.data_evento)}</span></div>
        <div className="l"><span className="muted">Valor total</span><b className="num">{formatBRL(c.dados.totais.total)}</b></div>
        <div className="l"><span className="muted">Emitido em</span><span>{dataBR(c.emitido_em.slice(0, 10))}</span></div>
        <div className="l"><span className="muted">Situação</span><span>{c.cancelado_em ? 'Cancelado' : c.assinado_em ? `Assinado em ${dataBR(c.assinado_em)}` : 'Aguardando assinatura'}</span></div>
      </div>
      {atualizar.isError ? <p className="erro-caixa" role="alert">{mensagemErro(atualizar.error)}</p> : null}
      {cancelando ? (
        <Confirmar titulo="Cancelar este contrato?" texto="Ele continua guardado no histórico, marcado como cancelado." rotulo="Cancelar contrato" ocupado={atualizar.isPending}
          aoCancelar={() => setCancelando(false)} aoConfirmar={async () => { await atualizar.mutateAsync({ id: c.id, cancelado_em: new Date().toISOString() }); avisar('Contrato cancelado'); aoFechar() }} />
      ) : (
        <div className="acoes">
          {!c.cancelado_em ? <button type="button" className="btn btn-g" onClick={() => setCancelando(true)}><Trash2 size={18} aria-hidden="true" />Cancelar</button> : null}
          {!c.assinado_em && !c.cancelado_em ? (
            <button type="button" className="btn btn-s" disabled={atualizar.isPending} onClick={async () => { await atualizar.mutateAsync({ id: c.id, assinado_em: hoje() }); avisar('Contrato marcado como assinado'); aoFechar() }}>
              <Check size={18} aria-hidden="true" />Marcar como assinado
            </button>
          ) : null}
          <button type="button" className="btn btn-p" disabled={baixando} onClick={async () => { setBaixando(true); try { await baixarContrato(c) } finally { setBaixando(false) } }}>
            <Download size={18} aria-hidden="true" />{baixando ? 'Gerando…' : 'Baixar PDF'}
          </button>
        </div>
      )}
    </Folha>
  )
}

interface Item { codigo: string; descricao: string; quantidade: string; valor: string }
const numero = (v: string) => Number(v.replace(/\./g, '').replace(',', '.')) || 0

function EmitirFolha({ eventoInicial, aoFechar }: { eventoInicial: string; aoFechar: () => void }) {
  const { empresaId, empresa } = useEmpresa()
  const avisar = useAvisar()
  const eventos = useEventos(empresaId)
  const clientes = useClientes(empresaId)
  const emitir = useEmitirContrato()
  const [eventoId, setEventoId] = useState(eventoInicial)
  const [itens, setItens] = useState<Item[]>([])
  const [dataPedido, setDataPedido] = useState(hoje())
  const [atendente, setAtendente] = useState(empresa.responsavel_nome ?? '')
  const [forma, setForma] = useState('Transferência')
  const [erro, setErro] = useState<string | null>(null)
  const elegiveis = (eventos.data ?? []).filter((e) => e.fonte !== 'workshop' && e.status !== 'cancelado').sort((a, b) => a.data_evento.localeCompare(b.data_evento))
  const ev: Evento | undefined = elegiveis.find((e) => e.id === eventoId)
  const cliente = clientes.data?.find((c) => c.id === ev?.cliente_id)
  const doc = useQuery({ queryKey: ['documento', cliente?.id], enabled: !!cliente, queryFn: () => buscarDocumento(cliente!.id) })
  const parcelas = useQuery({
    queryKey: ['lancamentos', empresaId, 'evento', eventoId],
    enabled: !!eventoId,
    queryFn: async () => (verificar('parcelas', await supabase.from('lancamentos').select('*').eq('evento_id', eventoId).eq('tipo', 'entrada').is('excluido_em', null).order('data_vencimento')) ?? []) as Lancamento[],
  })
  useEffect(() => {
    if (ev) setItens([{ codigo: '', descricao: ev.fonte === 'assessoria' ? 'Assessoria de evento' : 'Projeto de decoração', quantidade: '1', valor: String(ev.valor_fechado).replace('.', ',') }])
  }, [ev?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const total = useMemo(() => itens.reduce((t, i) => t + numero(i.quantidade) * numero(i.valor), 0), [itens])
  const lista = parcelas.data ?? []
  const pago = lista.filter((l) => l.data_pagamento).reduce((t, l) => t + Number(l.valor), 0)
  const somaParcelas = lista.reduce((t, l) => t + Number(l.valor), 0)
  const faltando = [
    !empresa.cnpj && 'CNPJ da empresa',
    !(empresa.banco_nome && empresa.banco_conta) && 'dados bancários',
    !empresa.pix_chave && 'chave PIX',
    !empresa.cidade_foro && 'cidade do foro',
    cliente && !doc.data && 'CPF/CNPJ da cliente',
    cliente && !cliente.endereco && 'endereço da cliente',
    ev && !ev.local_nome && 'local do evento',
    ev && !ev.entrega_em && 'horário de entrega',
  ].filter(Boolean) as string[]

  const gerar = async () => {
    setErro(null)
    if (!ev || !cliente) return setErro('Escolha o evento.')
    if (!itens.length || itens.some((i) => !i.descricao.trim() || numero(i.quantidade) <= 0)) return setErro('Confira os itens: descrição e quantidade.')
    if (!lista.length) return setErro('O evento não tem parcelas. Cadastre as parcelas no evento antes de gerar o contrato.')
    const e = empresa
    const dados: DadosContrato = {
      modelo: MODELO_CONTRATO,
      data_pedido: dataPedido,
      atendente: atendente.trim() || (e.responsavel_nome ?? ''),
      dias_saldo: Number(e.dias_saldo_antes_evento),
      empresa: { nome: e.nome, razao_social: e.razao_social, cnpj: e.cnpj, telefones: e.telefones, email_contato: e.email_contato, endereco: e.endereco, cidade_foro: e.cidade_foro, banco_nome: e.banco_nome, banco_agencia: e.banco_agencia, banco_conta: e.banco_conta, banco_favorecido: e.banco_favorecido, pix_chave: e.pix_chave },
      cliente: { nome: cliente.nome, cpf_cnpj: doc.data ?? null, telefone: cliente.telefone, endereco: cliente.endereco, cidade: cliente.cidade },
      evento: { titulo: ev.titulo, data_evento: ev.data_evento, local_nome: ev.local_nome, local_endereco: ev.local_endereco, entrega_em: ev.entrega_em, devolucao_em: ev.devolucao_em },
      itens: itens.map((i) => ({ codigo: i.codigo.trim(), descricao: i.descricao.trim(), quantidade: numero(i.quantidade), valor_unitario: numero(i.valor) })),
      parcelas: lista.map((l) => ({ vencimento: l.data_vencimento, descricao: l.descricao ?? 'Parcela', valor: Number(l.valor), situacao: l.data_pagamento ? 'Pago' : 'Pendente', forma })),
      totais: { valor_servicos: total, extras: 0, total, pago, pendente: Math.max(0, total - pago) },
    }
    const c = await emitir.mutateAsync({ evento: ev.id, dados })
    await baixarContrato(c)
    avisar(`Contrato ${c.numero} V.${c.versao} gerado`)
    aoFechar()
  }

  return (
    <Folha titulo="Novo contrato" aoFechar={aoFechar} larga>
      <Campo id="ct-ev" rotulo="Evento">
        <select id="ct-ev" value={eventoId} onChange={(e) => setEventoId(e.target.value)} autoFocus>
          <option value="">Escolha o evento</option>
          {elegiveis.map((e) => <option key={e.id} value={e.id}>{dataBR(e.data_evento)} · {e.titulo}</option>)}
        </select>
      </Campo>
      {ev && cliente ? (
        <>
          <p className="muted">Cliente: <b style={{ color: 'var(--ink)' }}>{cliente.nome}</b> · evento em {dataBR(ev.data_evento)}</p>
          {faltando.length ? (
            <Alerta>
              <b>Faltam dados que aparecem no contrato:</b> {faltando.join(', ')}. Dá para gerar assim mesmo, mas o PDF sai com “—” nesses campos.{' '}
              <Link to="/configuracoes">Dados da empresa</Link> · <Link to={`/eventos/${ev.id}`}>Evento</Link> · <Link to="/clientes">Clientes</Link>
            </Alerta>
          ) : null}
          <div className="duas">
            <Campo id="ct-data" rotulo="Data do pedido"><input id="ct-data" type="date" value={dataPedido} onChange={(e) => setDataPedido(e.target.value)} /></Campo>
            <Campo id="ct-at" rotulo="Atendente"><input id="ct-at" value={atendente} onChange={(e) => setAtendente(e.target.value)} maxLength={120} /></Campo>
          </div>
          <div className="campo">
            <span className="rotulo">Itens contratados</span>
            {itens.map((it, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,0.8fr) minmax(0,3fr) minmax(0,0.8fr) minmax(0,1.4fr) auto', gap: 8, alignItems: 'center' }}>
                <input aria-label={`Código do item ${i + 1}`} placeholder="Código" value={it.codigo} onChange={(e) => setItens(itens.map((x, j) => (j === i ? { ...x, codigo: e.target.value } : x)))} />
                <input aria-label={`Descrição do item ${i + 1}`} placeholder="Descrição" value={it.descricao} onChange={(e) => setItens(itens.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)))} />
                <input aria-label={`Quantidade do item ${i + 1}`} inputMode="numeric" value={it.quantidade} onChange={(e) => setItens(itens.map((x, j) => (j === i ? { ...x, quantidade: e.target.value } : x)))} />
                <input aria-label={`Valor unitário do item ${i + 1}`} inputMode="decimal" value={it.valor} onChange={(e) => setItens(itens.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))} />
                <button type="button" className="icone-btn" aria-label={`Remover item ${i + 1}`} onClick={() => setItens(itens.filter((_, j) => j !== i))} disabled={itens.length === 1}><Trash2 size={18} /></button>
              </div>
            ))}
            <button type="button" className="btn btn-g btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setItens([...itens, { codigo: '', descricao: '', quantidade: '1', valor: '0' }])}><Plus size={16} aria-hidden="true" />Adicionar item</button>
          </div>
          <Campo id="ct-forma" rotulo="Forma de pagamento das parcelas">
            <select id="ct-forma" value={forma} onChange={(e) => setForma(e.target.value)}>
              <option>Transferência</option><option>Pix</option><option>Cartão de crédito</option><option>Dinheiro</option>
            </select>
          </Campo>
          <div className="previa">
            <b>Resumo</b>
            <span className="num">Total dos itens: {formatBRL(total)}</span>
            <span className="num">{lista.length} parcelas somando {formatBRL(somaParcelas)} · já pago {formatBRL(pago)}</span>
            {Math.abs(somaParcelas - total) > 0.009 && lista.length ? <span style={{ color: 'var(--bad)', fontWeight: 600 }}>As parcelas não somam o total dos itens. Ajuste no evento antes de gerar.</span> : null}
          </div>
        </>
      ) : eventoId ? <Carregando /> : null}
      {erro || emitir.isError ? <p className="erro-caixa" role="alert">{erro ?? mensagemErro(emitir.error)}</p> : null}
      <div className="acoes">
        <button type="button" className="btn btn-s" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn btn-p" onClick={gerar} disabled={!ev || emitir.isPending || (lista.length > 0 && Math.abs(somaParcelas - total) > 0.009)}>
          <FileSignature size={18} aria-hidden="true" />{emitir.isPending ? 'Gerando…' : 'Gerar contrato em PDF'}
        </button>
      </div>
    </Folha>
  )
}
