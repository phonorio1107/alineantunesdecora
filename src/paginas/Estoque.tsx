import { useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Plus, Search, Trash2 } from 'lucide-react'
import { useAvisar, useEmpresa } from '../app/contexto'
import { useArquivarPeca, useEstoque, useEventos, useMovimentos, useSalvarPeca } from '../data/consultas'
import { esquemaPeca, type NovaPeca, type PecaValida } from '../data/esquemas'
import type { Peca } from '../data/tipos'
import { Campo, Carregando, Confirmar, ErroCaixa, Exportar, Folha, Vazio } from '../components/ui'
import { abaEstoque, baixarCSV, baixarExcel } from '../export/acoes'
import { valorEstoque } from '../lib/calculos'
import { dataBR, formatBRL, formatBRL0 } from '../lib/format'
import { comValor, formatarValorDigitado } from '../lib/mascaras'
import { mensagemErro } from '../lib/erros'

type Filtro = 'todas' | 'acervo' | 'consumo'

export default function Estoque() {
  const { empresaId, empresa } = useEmpresa()
  const estoque = useEstoque(empresaId)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [aberta, setAberta] = useState<Peca | 'nova' | null>(null)
  const todas = estoque.data ?? []
  const q = busca.trim().toLowerCase()
  const lista = todas.filter((p) => (filtro === 'todas' || p.tipo === filtro) && (!q || `${p.codigo} ${p.nome} ${p.categoria ?? ''}`.toLowerCase().includes(q)))
  const acervo = todas.filter((p) => p.tipo === 'acervo')
  const consumo = todas.filter((p) => p.tipo === 'consumo')
  const planilha = () => abaEstoque(lista)
  return (
    <>
      <div className="cabecalho">
        <div><h1>Estoque</h1><p className="muted">Quanto você tem em peças, pelo valor que pagou. Cada peça tem um código para achar rápido.</p></div>
        <div className="acoes">
          <Exportar opcoes={[
            { rotulo: 'Planilha Excel', formato: 'xlsx', gerar: () => baixarExcel([planilha()], empresa, 'estoque') },
            { rotulo: 'CSV', formato: 'csv', gerar: async () => baixarCSV(planilha(), 'estoque') },
          ]} />
          <button type="button" className="btn btn-p" onClick={() => setAberta('nova')}><Plus size={20} aria-hidden="true" />Nova peça</button>
        </div>
      </div>
      <section className="kv" aria-label="Resumo do estoque">
        <div className="numero destaque"><span className="rot">Valor em peças</span><span className="val">{formatBRL0(valorEstoque(todas))}</span><span className="sub">{todas.length} itens cadastrados</span></div>
        <div className="numero"><span className="rot">Acervo</span><span className="val">{formatBRL0(valorEstoque(acervo))}</span><span className="sub">{acervo.reduce((t, p) => t + Math.max(0, p.quantidade), 0)} peças que saem e voltam</span></div>
        <div className="numero"><span className="rot">Material de consumo</span><span className="val">{formatBRL0(valorEstoque(consumo))}</span><span className="sub">sai de vez quando a venda fecha</span></div>
      </section>
      <div className="filtros">
        <label className="busca">
          <Search size={18} aria-hidden="true" />
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por código, nome ou categoria" aria-label="Buscar no estoque" />
        </label>
        <div className="chips" role="group" aria-label="Tipo de peça">
          {([['todas', 'Todas'], ['acervo', 'Acervo'], ['consumo', 'Consumo']] as const).map(([k, t]) => (
            <button key={k} type="button" className="chip" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{t}</button>
          ))}
        </div>
      </div>
      <section className="cartao">
        {estoque.isPending ? <Carregando /> : estoque.isError ? <ErroCaixa erro={estoque.error} aoTentar={() => estoque.refetch()} /> : (
          <div className="linhas">
            {lista.length ? lista.map((p) => (
              <button key={p.id} type="button" className="linha" onClick={() => setAberta(p)}>
                <span className="codigo">{p.codigo}</span>
                <span className="cresce">
                  <span className="t">{p.nome}</span>
                  <span className="s">{[p.tipo === 'consumo' ? 'Consumo' : 'Acervo', p.categoria, `${formatBRL(Number(p.custo_unitario))} cada`].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="estoque-qtd">
                  <b className={p.quantidade <= 0 ? 'zerado' : undefined}>{p.quantidade}</b>
                  <span className="muted num">{formatBRL0(Math.max(0, p.quantidade) * Number(p.custo_unitario))}</span>
                </span>
              </button>
            )) : <Vazio titulo={q || filtro !== 'todas' ? 'Nenhuma peça com esse filtro.' : 'Nenhuma peça cadastrada.'} texto="Toque em “Nova peça”. Descreva como ela é (ex.: Mesa azul baixa): no contrato dá para usar outro nome." />}
          </div>
        )}
      </section>
      {aberta ? <PecaFolha peca={aberta === 'nova' ? null : aberta} todas={todas} aoFechar={() => setAberta(null)} /> : null}
    </>
  )
}

/** Próximo código livre: o maior número usado + 1. */
const proximoCodigo = (pecas: Peca[]) => String(pecas.reduce((m, p) => Math.max(m, /^\d+$/.test(p.codigo.trim()) ? Number(p.codigo) : 0), 0) + 1)

function PecaFolha({ peca, todas, aoFechar }: { peca: Peca | null; todas: Peca[]; aoFechar: () => void }) {
  const { empresaId, ehProprietaria } = useEmpresa()
  const avisar = useAvisar()
  const salvar = useSalvarPeca(empresaId)
  const arquivar = useArquivarPeca()
  const movimentos = useMovimentos(peca?.id ?? '')
  const eventos = useEventos(empresaId)
  const [tirando, setTirando] = useState(false)
  const categorias = useMemo(() => [...new Set(todas.map((p) => p.categoria).filter(Boolean))].sort() as string[], [todas])
  const { register, handleSubmit, control, setError, formState: { errors } } = useForm<NovaPeca, unknown, PecaValida>({
    resolver: zodResolver(esquemaPeca),
    defaultValues: peca
      ? { codigo: peca.codigo, nome: peca.nome, categoria: peca.categoria ?? '', tipo: peca.tipo, custo_unitario: Number(peca.custo_unitario) ? formatarValorDigitado(Number(peca.custo_unitario).toFixed(2).replace('.', ',')) : '', quantidade: peca.quantidade, observacoes: peca.observacoes ?? '' }
      : { codigo: proximoCodigo(todas), nome: '', categoria: '', tipo: 'acervo', custo_unitario: '', quantidade: 1, observacoes: '' },
  })
  const enviar = handleSubmit(async (v) => {
    const repetido = todas.find((p) => p.id !== peca?.id && p.codigo.trim().toLowerCase() === v.codigo.toLowerCase())
    if (repetido) return setError('codigo', { message: `Esse código já é de “${repetido.nome}”.` })
    await salvar.mutateAsync({ id: peca?.id, atual: peca?.quantidade ?? 0, p: v })
    avisar(peca ? 'Peça atualizada' : 'Peça cadastrada')
    aoFechar()
  })
  const tituloEvento = (id: string | null) => eventos.data?.find((e) => e.id === id)?.titulo

  return (
    <Folha titulo={peca ? `Peça ${peca.codigo}` : 'Nova peça'} aoFechar={aoFechar}>
      <form onSubmit={enviar} noValidate style={{ display: 'contents' }}>
        <div className="duas cod">
          <Campo id="p-cod" rotulo="Código" erro={errors.codigo?.message}><input id="p-cod" maxLength={20} autoComplete="off" aria-invalid={!!errors.codigo} {...register('codigo')} /></Campo>
          <Campo id="p-nome" rotulo="Como ela é" erro={errors.nome?.message} dica="Descreva do seu jeito. No contrato dá para usar outro nome.">
            <input id="p-nome" maxLength={120} placeholder="Ex.: Mesa azul baixa" autoFocus={!peca} aria-invalid={!!errors.nome} {...register('nome')} />
          </Campo>
        </div>
        <Controller control={control} name="tipo" render={({ field }) => (
          <div className="campo">
            <span className="rotulo" id="p-tipo">Tipo</span>
            <div className="seg" role="group" aria-labelledby="p-tipo">
              <button type="button" aria-pressed={field.value === 'acervo'} onClick={() => field.onChange('acervo')}>Acervo</button>
              <button type="button" aria-pressed={field.value === 'consumo'} onClick={() => field.onChange('consumo')}>Consumo</button>
            </div>
            <span className="dica">{field.value === 'acervo' ? 'Sai para a festa e volta (mesas, painéis, boleiras…). Só sai do estoque se não voltar.' : 'Sai de vez quando a venda fecha (balões, fitas, flores…).'}</span>
          </div>
        )} />
        <div className="duas">
          <Campo id="p-qtd" rotulo={peca ? 'Quantidade no estoque' : 'Quantidade'} erro={errors.quantidade?.message} dica={peca ? 'Mudou na contagem ou comprou mais? Ajuste aqui.' : undefined}>
            <input id="p-qtd" type="number" inputMode="numeric" min={0} aria-invalid={!!errors.quantidade} {...register('quantidade')} />
          </Campo>
          <Campo id="p-custo" rotulo="Quanto custou (cada)" erro={errors.custo_unitario?.message}>
            <input id="p-custo" inputMode="decimal" placeholder="R$ 0,00" aria-invalid={!!errors.custo_unitario} {...comValor(register('custo_unitario'))} />
          </Campo>
        </div>
        <Campo id="p-cat" rotulo="Categoria (opcional)">
          <input id="p-cat" list="p-cats" maxLength={60} placeholder="Ex.: Mesas, Painéis, Balões" {...register('categoria')} />
          <datalist id="p-cats">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
        </Campo>
        <Campo id="p-obs" rotulo="Observações (opcional)">
          <input id="p-obs" maxLength={300} placeholder="Ex.: prateleira 3, precisa pintar" {...register('observacoes')} />
        </Campo>
        {peca && movimentos.data?.length ? (
          <div className="campo">
            <span className="rotulo">Últimas movimentações</span>
            <div className="linhas">
              {movimentos.data.slice(0, 8).map((m) => (
                <div key={m.id} className="linha">
                  <span className="cresce">
                    <span className="t">{m.motivo === 'evento' ? (tituloEvento(m.evento_id) ?? m.observacao ?? 'Venda') : (m.observacao ?? 'Ajuste')}</span>
                    <span className="s">{dataBR(m.criado_em.slice(0, 10))}</span>
                  </span>
                  <span className={`v ${m.quantidade > 0 ? 'entrada' : ''}`}>{m.quantidade > 0 ? '+' : ''}{m.quantidade}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {salvar.isError || arquivar.isError ? <p className="erro-caixa" role="alert">{mensagemErro(salvar.error ?? arquivar.error)}</p> : null}
        {tirando && peca ? (
          <Confirmar titulo={`Tirar “${peca.nome}” do estoque?`} texto="Ela some da lista e do valor em peças. Vendas que já usaram a peça continuam com ela." rotulo="Tirar do estoque" ocupado={arquivar.isPending}
            aoCancelar={() => setTirando(false)} aoConfirmar={async () => { await arquivar.mutateAsync(peca.id); avisar('Peça tirada do estoque'); aoFechar() }} />
        ) : (
          <div className="acoes">
            {peca && ehProprietaria ? <button type="button" className="btn btn-g" onClick={() => setTirando(true)}><Trash2 size={18} aria-hidden="true" />Tirar</button> : null}
            <button type="button" className="btn btn-s" onClick={aoFechar}>Cancelar</button>
            <button type="submit" className="btn btn-p" disabled={salvar.isPending}><Check size={18} aria-hidden="true" />{salvar.isPending ? 'Salvando…' : 'Salvar peça'}</button>
          </div>
        )}
      </form>
    </Folha>
  )
}
