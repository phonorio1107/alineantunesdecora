import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, PackageCheck, Plus, Search, Trash2 } from 'lucide-react'
import { useAvisar, useEmpresa } from '../app/contexto'
import { useAtualizarEvento, useEstoque, useEventos, useExcluirItem, useItens, useItensDasVendas, useSalvarItem } from '../data/consultas'
import { valorEmReais } from '../data/esquemas'
import type { Evento, ItemVenda, Peca } from '../data/tipos'
import { reservadasNoDia, totalItens } from '../lib/calculos'
import { dataBR, formatBRL } from '../lib/format'
import { formatarValorDigitado } from '../lib/mascaras'
import { mensagemErro } from '../lib/erros'
import { Alerta, Campo, Carregando, Confirmar, ErroCaixa, Folha, Vazio } from './ui'

const reais = (v: string) => {
  const r = valorEmReais.safeParse(v)
  return r.success ? r.data : NaN
}
const paraCampo = (v: number) => (v ? formatarValorDigitado(v.toFixed(2).replace('.', ',')) : '')

// ---------------------------------------------------------------------------
// Peças e serviços da venda
// ---------------------------------------------------------------------------
export function ItensVenda({ evento: ev }: { evento: Evento }) {
  const { empresaId } = useEmpresa()
  const itens = useItens(ev.id)
  const estoque = useEstoque(empresaId)
  const [aberto, setAberto] = useState<{ item?: ItemVenda; tipo: 'peca' | 'servico' } | null>(null)
  const lista = itens.data ?? []
  const pecaDe = (id: string | null) => (id ? estoque.data?.find((p) => p.id === id) : undefined)
  const total = totalItens(lista)
  const fechada = ev.status === 'confirmado' || ev.status === 'realizado'

  const grupo = (tipo: 'peca' | 'servico') => {
    const doTipo = lista.filter((i) => i.tipo === tipo)
    return (
      <div className="grupo-itens">
        <div className="grupo-h">
          <h3>{tipo === 'peca' ? 'Peças' : 'Serviços'}</h3>
          <span className="muted num">{formatBRL(totalItens(doTipo))}</span>
        </div>
        {doTipo.length ? (
          <div className="linhas">
            {doTipo.map((i) => {
              const p = pecaDe(i.peca_id)
              const outroNome = p && p.nome.trim().toLowerCase() !== i.descricao.trim().toLowerCase()
              return (
                <button key={i.id} type="button" className="linha" onClick={() => setAberto({ item: i, tipo })}>
                  {p ? <span className="codigo" title="Código no estoque">{p.codigo}</span> : null}
                  <span className="cresce">
                    <span className="t">{i.quantidade > 1 ? `${i.quantidade}× ` : ''}{i.descricao}</span>
                    {tipo === 'peca' ? (
                      <span className="s">
                        {p ? `${outroNome ? `No estoque: ${p.nome} · ` : ''}${p.tipo === 'consumo' ? 'Consumo' : 'Acervo'}` : 'Fora do estoque'}
                        {i.perdidas ? ` · ${i.perdidas} não voltou` : ''}
                      </span>
                    ) : null}
                  </span>
                  <span className="v">{Number(i.valor_unitario) ? formatBRL(i.quantidade * Number(i.valor_unitario)) : <span className="muted" style={{ fontWeight: 400 }}>incluso</span>}</span>
                </button>
              )
            })}
          </div>
        ) : <p className="muted" style={{ fontSize: 14 }}>{tipo === 'peca' ? 'Nenhuma peça ainda.' : 'Nenhum serviço ainda.'}</p>}
        <button type="button" className="btn btn-g btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setAberto({ tipo })}>
          <Plus size={18} aria-hidden="true" />{tipo === 'peca' ? 'Adicionar peça' : 'Adicionar serviço'}
        </button>
      </div>
    )
  }

  return (
    <section className="cartao" aria-labelledby="t-itens">
      <div className="cartao-h">
        <h2 id="t-itens">Peças e serviços</h2>
        {lista.length ? <span className="num" style={{ fontWeight: 600 }}>Total {formatBRL(total)}</span> : null}
      </div>
      {itens.isPending ? <Carregando /> : itens.isError ? <ErroCaixa erro={itens.error} aoTentar={() => itens.refetch()} /> : (
        <>
          <div className="itens-colunas">{grupo('peca')}{grupo('servico')}</div>
          <p className="muted" style={{ fontSize: 14 }}>
            {fechada
              ? 'Material de consumo já saiu do estoque. Peças de acervo voltam depois do evento: confira na devolução.'
              : 'Enquanto for orçamento, nada sai do estoque. O nome de cada item é o que aparece no contrato.'}
          </p>
          {fechada && lista.length && total > 0 && Math.abs(total - Number(ev.valor_fechado)) > 0.009 ? (
            <Alerta>Os itens somam <b className="num">{formatBRL(total)}</b> e o valor fechado é <b className="num">{formatBRL(Number(ev.valor_fechado))}</b>. O contrato usa os itens; confira antes de gerar.</Alerta>
          ) : null}
        </>
      )}
      {aberto ? <ItemFolha evento={ev} item={aberto.item} tipo={aberto.tipo} ordem={lista.length} aoFechar={() => setAberto(null)} /> : null}
    </section>
  )
}

function ItemFolha({ evento: ev, item, tipo, ordem, aoFechar }: { evento: Evento; item?: ItemVenda; tipo: 'peca' | 'servico'; ordem: number; aoFechar: () => void }) {
  const { empresaId } = useEmpresa()
  const avisar = useAvisar()
  const estoque = useEstoque(empresaId)
  const eventos = useEventos(empresaId)
  const salvar = useSalvarItem(empresaId, ev.id)
  const excluir = useExcluirItem()
  const [pecaId, setPecaId] = useState<string | null>(item?.peca_id ?? null)
  const [avulsa, setAvulsa] = useState(tipo === 'peca' && !!item && !item.peca_id)
  const [busca, setBusca] = useState('')
  const [descricao, setDescricao] = useState(item?.descricao ?? '')
  const [qtd, setQtd] = useState(String(item?.quantidade ?? 1))
  const [valor, setValor] = useState(paraCampo(Number(item?.valor_unitario ?? 0)))
  const [erro, setErro] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const peca = estoque.data?.find((p) => p.id === pecaId)

  // Outras vendas fechadas no mesmo dia: o que elas já levam do acervo.
  const mesmoDia = useMemo(() => (eventos.data ?? []).filter((e) => e.id !== ev.id && e.data_evento === ev.data_evento && (e.status === 'confirmado' || e.status === 'realizado')), [eventos.data, ev])
  const itensDoDia = useItensDasVendas(mesmoDia.map((e) => e.id))
  const n = Number(qtd) || 0
  const reservadas = peca && peca.tipo === 'acervo' ? reservadasNoDia({ pecaId: peca.id, dia: ev.data_evento, eventoAtual: ev.id, eventos: mesmoDia, itens: itensDoDia.data ?? [] }) : 0
  // Consumo de venda já fechada já saiu do estoque: o que está aqui volta antes de comparar.
  const jaBaixado = peca?.tipo === 'consumo' && item && (ev.status === 'confirmado' || ev.status === 'realizado') ? item.quantidade : 0
  const livres = peca ? Number(peca.quantidade) - reservadas + jaBaixado : 0

  const q = busca.trim().toLowerCase()
  const achadas = (estoque.data ?? []).filter((p) => !q || `${p.codigo} ${p.nome} ${p.categoria ?? ''}`.toLowerCase().includes(q)).slice(0, 8)
  const escolher = (p: Peca) => {
    setPecaId(p.id)
    if (!descricao.trim() || descricao === peca?.nome) setDescricao(p.nome)
    setBusca('')
  }

  const gravar = async () => {
    setErro(null)
    if (tipo === 'peca' && !pecaId && !avulsa) return setErro('Escolha a peça no estoque ou marque como peça fora do estoque.')
    if (descricao.trim().length < 1) return setErro(tipo === 'peca' ? 'Informe o nome que vai no contrato.' : 'Descreva o serviço.')
    if (!Number.isInteger(n) || n < 1) return setErro('A quantidade é um número inteiro, a partir de 1.')
    const v = valor.trim() ? reais(valor) : 0
    if (!Number.isFinite(v) || v < 0) return setErro('Confira o valor.')
    await salvar.mutateAsync({ id: item?.id, tipo, peca_id: tipo === 'peca' && !avulsa ? pecaId : null, descricao: descricao.trim(), quantidade: n, valor_unitario: v, ...(item ? {} : { ordem }) })
    avisar(item ? 'Item atualizado' : tipo === 'peca' ? 'Peça adicionada' : 'Serviço adicionado')
    aoFechar()
  }

  return (
    <Folha titulo={item ? (tipo === 'peca' ? 'Peça da venda' : 'Serviço da venda') : tipo === 'peca' ? 'Adicionar peça' : 'Adicionar serviço'} aoFechar={aoFechar}>
      {tipo === 'peca' && !avulsa ? (
        peca ? (
          <div className="peca-escolhida">
            <span className="codigo">{peca.codigo}</span>
            <span className="cresce">
              <b>{peca.nome}</b>
              <span className="muted">{peca.tipo === 'consumo' ? 'Consumo' : 'Acervo'} · {peca.quantidade} no estoque{reservadas ? ` · ${reservadas} em outro evento em ${dataBR(ev.data_evento)}` : ''}</span>
            </span>
            <button type="button" className="btn btn-g btn-sm" onClick={() => setPecaId(null)}>Trocar</button>
          </div>
        ) : (
          <div className="campo">
            <label className="busca" style={{ flex: 'none' }}>
              <Search size={18} aria-hidden="true" />
              <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar no estoque por código ou nome" aria-label="Buscar peça no estoque" autoFocus />
            </label>
            {estoque.isPending ? <Carregando /> : achadas.length ? (
              <div className="linhas">
                {achadas.map((p) => (
                  <button key={p.id} type="button" className="linha" onClick={() => escolher(p)}>
                    <span className="codigo">{p.codigo}</span>
                    <span className="cresce"><span className="t">{p.nome}</span><span className="s">{p.tipo === 'consumo' ? 'Consumo' : 'Acervo'}{p.categoria ? ` · ${p.categoria}` : ''}</span></span>
                    <span className="v">{p.quantidade}</span>
                  </button>
                ))}
              </div>
            ) : <Vazio titulo={q ? 'Nada no estoque com essa busca.' : 'O estoque está vazio.'}><Link className="btn btn-s btn-sm" to="/estoque">Cadastrar peças</Link></Vazio>}
            <button type="button" className="btn btn-g btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => { setAvulsa(true); setPecaId(null) }}>Peça fora do estoque</button>
          </div>
        )
      ) : null}
      {tipo === 'peca' && avulsa ? (
        <p className="muted">Peça fora do estoque (alugada, comprada para este evento…). Não dá baixa em nada.{' '}
          <button type="button" className="btn btn-g btn-sm" style={{ padding: 0, minHeight: 0 }} onClick={() => setAvulsa(false)}>Escolher do estoque</button>
        </p>
      ) : null}
      {tipo === 'servico' || avulsa || peca ? (
        <>
          <Campo id="it-desc" rotulo={tipo === 'peca' ? 'Nome no contrato' : 'Serviço'}
            dica={peca ? `Mude à vontade: o nome vale só para este contrato. No estoque continua “${peca.nome}” (código ${peca.codigo}).` : undefined}>
            <input id="it-desc" maxLength={160} value={descricao} onChange={(e) => setDescricao(e.target.value)}
              placeholder={tipo === 'peca' ? 'Ex.: Mesa de apoio' : 'Ex.: Montagem e desmontagem'} autoFocus={tipo === 'servico' || !!peca} />
          </Campo>
          <div className="duas">
            <Campo id="it-qtd" rotulo="Quantidade"><input id="it-qtd" type="number" inputMode="numeric" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} /></Campo>
            <Campo id="it-valor" rotulo="Valor de cada" dica={tipo === 'peca' ? 'Deixe vazio se a peça já está no preço do pacote.' : undefined}>
              <input id="it-valor" inputMode="decimal" placeholder="R$ 0,00" value={valor} onChange={(e) => setValor(e.target.value)} onBlur={(e) => setValor(formatarValorDigitado(e.target.value))} />
            </Campo>
          </div>
          {peca && n > livres ? (
            <Alerta>
              {peca.tipo === 'acervo'
                ? <>Só <b>{Math.max(0, livres)}</b> livre{livres === 1 ? '' : 's'} em {dataBR(ev.data_evento)}{reservadas ? ` (${reservadas} já vão para outro evento no mesmo dia)` : ''}. Dá para salvar assim mesmo.</>
                : <>Só há <b>{Math.max(0, livres)}</b> no estoque. Ao fechar a venda o estoque fica negativo: lembre de repor.</>}
            </Alerta>
          ) : null}
        </>
      ) : null}
      {erro || salvar.isError || excluir.isError ? <p className="erro-caixa" role="alert">{erro ?? mensagemErro(salvar.error ?? excluir.error)}</p> : null}
      {excluindo && item ? (
        <Confirmar titulo="Tirar este item da venda?" texto={item.peca_id ? 'Se já tinha saído do estoque, volta.' : 'Ele sai da lista e do contrato.'} rotulo="Tirar item" ocupado={excluir.isPending}
          aoCancelar={() => setExcluindo(false)} aoConfirmar={async () => { await excluir.mutateAsync(item.id); avisar('Item tirado'); aoFechar() }} />
      ) : (
        <div className="acoes">
          {item ? <button type="button" className="btn btn-g" onClick={() => setExcluindo(true)}><Trash2 size={18} aria-hidden="true" />Tirar</button> : null}
          <button type="button" className="btn btn-s" onClick={aoFechar}>Cancelar</button>
          <button type="button" className="btn btn-p" onClick={gravar} disabled={salvar.isPending}><Check size={18} aria-hidden="true" />{salvar.isPending ? 'Salvando…' : 'Salvar'}</button>
        </div>
      )}
    </Folha>
  )
}

// ---------------------------------------------------------------------------
// Conferência da devolução: o que voltou da festa
// ---------------------------------------------------------------------------
export function Conferencia({ evento: ev }: { evento: Evento }) {
  const { empresaId } = useEmpresa()
  const avisar = useAvisar()
  const itens = useItens(ev.id)
  const estoque = useEstoque(empresaId)
  const salvar = useSalvarItem(empresaId, ev.id)
  const atualizar = useAtualizarEvento()
  const [editando, setEditando] = useState(false)
  const [faltas, setFaltas] = useState<Record<string, string>>({})
  const pecaDe = (id: string | null) => (id ? estoque.data?.find((p) => p.id === id) : undefined)
  const acervo = (itens.data ?? []).filter((i) => pecaDe(i.peca_id)?.tipo === 'acervo')
  if (!acervo.length || (ev.status !== 'confirmado' && ev.status !== 'realizado')) return null
  const conferido = !!ev.conferido_em && !editando
  const falta = (i: ItemVenda) => (faltas[i.id] !== undefined ? Math.min(i.quantidade, Math.max(0, Number(faltas[i.id]) || 0)) : i.perdidas)
  const prejuizo = acervo.reduce((t, i) => t + falta(i) * Number(pecaDe(i.peca_id)?.custo_unitario ?? 0), 0)

  const concluir = async () => {
    for (const i of acervo) if (falta(i) !== i.perdidas) await salvar.mutateAsync({ id: i.id, perdidas: falta(i) })
    await atualizar.mutateAsync({ id: ev.id, conferido_em: new Date().toISOString() })
    setEditando(false)
    setFaltas({})
    avisar(prejuizo > 0 ? 'Conferência salva; o que não voltou saiu do estoque' : 'Conferência salva: tudo voltou')
  }

  return (
    <section className="cartao" aria-labelledby="t-conf">
      <div className="cartao-h">
        <h2 id="t-conf">Conferência da devolução</h2>
        {conferido ? <span className="pill bom"><PackageCheck size={16} aria-hidden="true" />Conferido em {dataBR(ev.conferido_em!.slice(0, 10))}</span> : <span className="pill atencao">A conferir</span>}
      </div>
      {!conferido ? <p className="muted">Depois do evento, marque o que não voltou (perdido ou quebrado). Sai do estoque e o prejuízo aparece aqui.</p> : null}
      <div className="linhas">
        {acervo.map((i) => {
          const p = pecaDe(i.peca_id)!
          return (
            <div key={i.id} className="linha">
              <span className="codigo">{p.codigo}</span>
              <span className="cresce"><span className="t">{i.quantidade}× {p.nome}</span>{p.nome !== i.descricao ? <span className="s">No contrato: {i.descricao}</span> : null}</span>
              {conferido ? (
                falta(i) ? <span className="pill ruim">{falta(i)} não voltou</span> : <span className="pill bom">Voltou</span>
              ) : (
                <label className="mini" style={{ width: 120 }}>
                  <span>Não voltaram</span>
                  <input type="number" inputMode="numeric" min={0} max={i.quantidade} value={faltas[i.id] ?? String(i.perdidas)} onChange={(e) => setFaltas({ ...faltas, [i.id]: e.target.value })} />
                </label>
              )}
            </div>
          )
        })}
      </div>
      {prejuizo > 0 ? <p className="num"><b>Prejuízo pelo custo das peças: {formatBRL(prejuizo)}.</b> <span className="muted">Para entrar no lucro do evento, lance em Custos do evento (categoria “Peças perdidas ou quebradas”).</span></p> : null}
      {salvar.isError || atualizar.isError ? <p className="erro-caixa" role="alert">{mensagemErro(salvar.error ?? atualizar.error)}</p> : null}
      <div className="acoes" style={{ justifyContent: 'flex-end' }}>
        {conferido ? <button type="button" className="btn btn-g btn-sm" onClick={() => setEditando(true)}>Corrigir conferência</button> : (
          <button type="button" className="btn btn-s" onClick={concluir} disabled={salvar.isPending || atualizar.isPending}><PackageCheck size={18} aria-hidden="true" />Concluir conferência</button>
        )}
      </div>
    </section>
  )
}
