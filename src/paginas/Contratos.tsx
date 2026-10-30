import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, Download, FileSignature, Trash2 } from 'lucide-react'
import { useAvisar, useEmpresa } from '../app/contexto'
import { buscarDadosFiscais, useAtualizarContrato, useClientes, useContratos, useEmitirContrato, useEstoque, useEventos, useItens } from '../data/consultas'
import type { Contrato, DadosContrato, Evento, Lancamento } from '../data/tipos'
import { Alerta, Campo, Carregando, Confirmar, ErroCaixa, Folha, Vazio } from '../components/ui'
import { baixarContrato } from '../export/acoes'
import { MODELO_CONTRATO } from '../pdf/clausulas'
import { dataBR, formatBRL, hoje } from '../lib/format'
import { areasDe } from '../lib/calculos'
import { mensagemErro, verificar } from '../lib/erros'
import { supabase } from '../lib/supabase'

/** Contratos emitidos (aba Contratos de Vendas). Só a proprietária: têm CPF e dados de pagamento. */
export function ListaContratos() {
  const { empresaId, ehProprietaria } = useEmpresa()
  const contratos = useContratos(empresaId, ehProprietaria)
  const eventos = useEventos(empresaId)
  const [aberto, setAberto] = useState<Contrato | null>(null)
  const titulo = (id: string) => eventos.data?.find((e) => e.id === id)?.titulo ?? '—'
  return (
    <>
      <section className="cartao" aria-labelledby="t-contratos">
        <div className="cartao-h"><h2 id="t-contratos">Contratos emitidos</h2></div>
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
            )) : <Vazio titulo="Nenhum contrato emitido ainda." texto="Feche um orçamento e toque em “Gerar contrato”." />}
          </div>
        )}
      </section>
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

const SERVICO_DA_AREA = { decoracao: 'Projeto de decoração', assessoria: 'Assessoria de evento', workshop: 'Workshop' } as const

export function EmitirFolha({ eventoInicial, aoFechar }: { eventoInicial: string; aoFechar: () => void }) {
  const { empresaId, empresa } = useEmpresa()
  const avisar = useAvisar()
  const eventos = useEventos(empresaId)
  const clientes = useClientes(empresaId)
  const estoque = useEstoque(empresaId)
  const emitir = useEmitirContrato()
  const [eventoId, setEventoId] = useState(eventoInicial)
  const itensVenda = useItens(eventoId)
  const [dataPedido, setDataPedido] = useState(hoje())
  const [atendente, setAtendente] = useState(empresa.responsavel_nome ?? '')
  const [forma, setForma] = useState('Transferência')
  const [erro, setErro] = useState<string | null>(null)
  const elegiveis = (eventos.data ?? []).filter((e) => e.cliente_id && (e.status === 'confirmado' || e.status === 'realizado')).sort((a, b) => a.data_evento.localeCompare(b.data_evento))
  const ev: Evento | undefined = elegiveis.find((e) => e.id === eventoId)
  const cliente = clientes.data?.find((c) => c.id === ev?.cliente_id)
  const doc = useQuery({ queryKey: ['documento', cliente?.id], enabled: !!cliente, queryFn: () => buscarDadosFiscais(cliente!.id) })
  const parcelas = useQuery({
    queryKey: ['lancamentos', empresaId, 'evento', eventoId],
    enabled: !!eventoId,
    queryFn: async () => (verificar('parcelas', await supabase.from('lancamentos').select('*').eq('evento_id', eventoId).eq('tipo', 'entrada').is('excluido_em', null).order('data_vencimento')) ?? []) as Lancamento[],
  })
  // Itens da venda; sem itens, um serviço por área com o valor de cada uma.
  const itens: DadosContrato['itens'] = useMemo(() => {
    if (!ev) return []
    const codigo = (id: string | null) => (id ? estoque.data?.find((p) => p.id === id)?.codigo ?? '' : '')
    if (itensVenda.data?.length) {
      return [...itensVenda.data].sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'peca' ? -1 : 1))
        .map((i) => ({ codigo: codigo(i.peca_id), descricao: i.descricao, quantidade: Number(i.quantidade), valor_unitario: Number(i.valor_unitario), tipo: i.tipo }))
    }
    const comValor = areasDe(ev).filter((a) => Number(ev.areas?.[a] ?? 0) > 0)
    return comValor.length
      ? comValor.map((a) => ({ codigo: '', descricao: SERVICO_DA_AREA[a], quantidade: 1, valor_unitario: Number(ev.areas![a]), tipo: 'servico' as const }))
      : [{ codigo: '', descricao: SERVICO_DA_AREA[ev.fonte], quantidade: 1, valor_unitario: Number(ev.valor_fechado), tipo: 'servico' as const }]
  }, [ev, itensVenda.data, estoque.data])

  const total = useMemo(() => itens.reduce((t, i) => t + i.quantidade * i.valor_unitario, 0), [itens])
  const totalServicos = itens.filter((i) => i.tipo !== 'peca').reduce((t, i) => t + i.quantidade * i.valor_unitario, 0)
  const lista = parcelas.data ?? []
  const pago = lista.filter((l) => l.data_pagamento).reduce((t, l) => t + Number(l.valor), 0)
  const somaParcelas = lista.reduce((t, l) => t + Number(l.valor), 0)
  const faltando = [
    !empresa.cnpj && 'CNPJ da empresa',
    !(empresa.banco_nome && empresa.banco_conta) && 'dados bancários',
    !empresa.pix_chave && 'chave PIX',
    !empresa.cidade_foro && 'cidade do foro',
    cliente && !doc.data && 'CPF/CNPJ do cliente',
    cliente && !cliente.endereco && 'endereço do cliente',
    ev && !ev.local_nome && 'local do evento',
    ev && !ev.entrega_em && 'horário de entrega',
  ].filter(Boolean) as string[]

  const gerar = async () => {
    setErro(null)
    if (!ev || !cliente) return setErro('Escolha a venda.')
    if (!lista.length) return setErro('A venda não tem parcelas. Cadastre as parcelas na venda antes de gerar o contrato.')
    const e = empresa
    const dados: DadosContrato = {
      modelo: MODELO_CONTRATO,
      data_pedido: dataPedido,
      atendente: atendente.trim() || (e.responsavel_nome ?? ''),
      dias_saldo: Number(e.dias_saldo_antes_evento),
      empresa: { nome: e.nome, razao_social: e.razao_social, cnpj: e.cnpj, telefones: e.telefones, email_contato: e.email_contato, endereco: e.endereco, cidade_foro: e.cidade_foro, banco_nome: e.banco_nome, banco_agencia: e.banco_agencia, banco_conta: e.banco_conta, banco_favorecido: e.banco_favorecido, pix_chave: e.pix_chave },
      cliente: { nome: cliente.nome, cpf_cnpj: doc.data?.cpf_cnpj ?? null, inscricao_estadual: doc.data?.inscricao_estadual ?? null, telefone: cliente.telefone, endereco: cliente.endereco, cidade: cliente.cidade },
      evento: { titulo: ev.titulo, data_evento: ev.data_evento, local_nome: ev.local_nome, local_endereco: ev.local_endereco, entrega_em: ev.entrega_em, devolucao_em: ev.devolucao_em },
      itens,
      parcelas: lista.map((l) => ({ vencimento: l.data_vencimento, descricao: l.descricao ?? 'Parcela', valor: Number(l.valor), situacao: l.data_pagamento ? 'Pago' : 'Pendente', forma })),
      totais: { valor_servicos: totalServicos, extras: 0, total, pago, pendente: Math.max(0, total - pago) },
    }
    const c = await emitir.mutateAsync({ evento: ev.id, dados })
    await baixarContrato(c)
    avisar(`Contrato ${c.numero} V.${c.versao} gerado`)
    aoFechar()
  }

  return (
    <Folha titulo="Novo contrato" aoFechar={aoFechar} larga>
      <Campo id="ct-ev" rotulo="Venda">
        <select id="ct-ev" value={eventoId} onChange={(e) => setEventoId(e.target.value)} autoFocus>
          <option value="">Escolha a venda fechada</option>
          {elegiveis.map((e) => <option key={e.id} value={e.id}>{dataBR(e.data_evento)} · {e.titulo}</option>)}
        </select>
      </Campo>
      {ev && cliente ? (
        <>
          <p className="muted">Cliente: <b style={{ color: 'var(--ink)' }}>{cliente.nome}</b> · evento em {dataBR(ev.data_evento)}</p>
          {faltando.length ? (
            <Alerta>
              <b>Faltam dados que aparecem no contrato:</b> {faltando.join(', ')}. Dá para gerar assim mesmo, mas o PDF sai com “—” nesses campos.{' '}
              <Link to="/configuracoes">Dados da empresa</Link> · <Link to={`/vendas/${ev.id}`}>Venda</Link> · <Link to="/clientes">Clientes</Link>
            </Alerta>
          ) : null}
          <div className="duas">
            <Campo id="ct-data" rotulo="Data do pedido"><input id="ct-data" type="date" value={dataPedido} onChange={(e) => setDataPedido(e.target.value)} /></Campo>
            <Campo id="ct-at" rotulo="Atendente"><input id="ct-at" value={atendente} onChange={(e) => setAtendente(e.target.value)} maxLength={120} /></Campo>
          </div>
          <div className="campo">
            <span className="rotulo">Itens do contrato</span>
            {itensVenda.isPending ? <Carregando /> : (
              <div className="itens-resumo">
                {(['peca', 'servico'] as const).map((t) => {
                  const doTipo = itens.filter((i) => (i.tipo ?? 'servico') === t)
                  return doTipo.length ? (
                    <div key={t}>
                      <b>{t === 'peca' ? 'Peças' : 'Serviços'}</b>
                      {doTipo.map((i, k) => (
                        <span key={k} className="num">{i.codigo ? <span className="codigo">{i.codigo}</span> : null}{i.quantidade}× {i.descricao} · {formatBRL(i.quantidade * i.valor_unitario)}</span>
                      ))}
                    </div>
                  ) : null
                })}
              </div>
            )}
            <span className="dica">{itensVenda.data?.length ? 'Para mudar algum item ou o nome dele no contrato, ' : 'Sem lista de peças e serviços: sai um item por área. Para detalhar, '}<Link to={`/vendas/${ev.id}`} onClick={aoFechar}>abra a venda</Link>.</span>
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
            {Math.abs(somaParcelas - total) > 0.009 && lista.length ? <span style={{ color: 'var(--bad)', fontWeight: 600 }}>As parcelas não somam o total dos itens. Ajuste os itens ou as parcelas na venda antes de gerar.</span> : null}
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
