import { Rect, Svg, Line as SvgLine, Text, View } from '@react-pdf/renderer'
import type { DadosContrato, Empresa, Evento, Lancamento } from '../data/tipos'
import type { MesFluxo, ResumoMes } from '../lib/calculos'
import { reaisPorExtenso } from '../lib/extenso'
import { dataBR, formatBRL, formatDoc, formatMeses, formatPct, formatTelefone, mesCurto, nomeMes } from '../lib/format'
import { Cabecalho, Campo, Documento, Kpi, Secao, Tabela, TextoRico, Titulo, cor, s } from './base'
import { TITULO_CONTRATO, clausulas } from './clausulas'

// Horários sempre no fuso de Brasília, seja qual for o fuso do aparelho que gera o PDF.
const FUSO = 'America/Sao_Paulo'
const agora = () => new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: FUSO })
const dataHora = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  const sem = d.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: FUSO })
  return `${d.toLocaleDateString('pt-BR', { timeZone: FUSO })} (${sem}) às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO })}`
}
const Quadrado = ({ c }: { c: string }) => <View style={{ width: 7, height: 7, backgroundColor: c, borderRadius: 1.5 }} />
const FONTE = { decoracao: 'Decoração', assessoria: 'Assessoria', workshop: 'Workshop' } as const

// ---------------------------------------------------------------------------
// Contrato
// ---------------------------------------------------------------------------
type ItemContrato = DadosContrato['itens'][number]
const totalDe = (itens: ItemContrato[]) => itens.reduce((t, i) => t + i.quantidade * i.valor_unitario, 0)

function TabelaItens({ itens, total }: { itens: ItemContrato[]; total: (string | null)[] }) {
  return (
    <Tabela
      colunas={[{ titulo: 'Item', largura: '52%' }, { titulo: 'Qtd', largura: '10%', num: true }, { titulo: 'Preço unit.', largura: '19%', num: true }, { titulo: 'Total', largura: '19%', num: true }]}
      linhas={itens.map((i) => [
        <View key="d" style={{ paddingVertical: 5, paddingHorizontal: 6 }}>
          {i.codigo ? <Text style={{ fontSize: 6.8, color: cor.cinza }}>{i.codigo}</Text> : null}
          <Text style={{ fontSize: 8.4 }}>{i.descricao}</Text>
        </View>,
        String(i.quantidade),
        i.valor_unitario ? formatBRL(i.valor_unitario) : 'Incluso',
        i.valor_unitario ? formatBRL(i.quantidade * i.valor_unitario) : 'Incluso',
      ])}
      total={total}
    />
  )
}

export function ContratoPdf({ numero, versao, dados }: { numero: string; versao: number; dados: DadosContrato }) {
  const e = dados.empresa
  const conta = [e.banco_nome, e.banco_agencia && `Ag. ${e.banco_agencia}`, e.banco_conta && `Conta ${e.banco_conta}`].filter(Boolean).join(' · ')
  const paragrafos = clausulas({
    bancoNome: e.banco_nome ?? '—',
    favorecido: e.banco_favorecido ?? '—',
    agencia: e.banco_agencia ?? '—',
    conta: e.banco_conta ?? '—',
    pix: e.pix_chave ?? '—',
    diasSaldo: dados.dias_saldo,
    cidadeForo: e.cidade_foro ?? '—',
  })
  const cidade = (e.cidade_foro ?? '').split('/')[0] || 'Louveira'
  // Contratos a partir de 01/11/2026 separam peças e serviços; os antigos saem numa tabela só.
  const pecas = dados.itens.filter((i) => i.tipo === 'peca')
  const servicos = dados.itens.filter((i) => i.tipo !== 'peca')
  const separar = pecas.length > 0
  return (
    <Documento titulo={`Contrato ${numero} · ${dados.cliente.nome}`} rodape={`${e.nome ?? 'Aline Antunes Decora'} · Contrato ${numero} V.${versao}`}>
      <Cabecalho empresa={e} tipo="Contrato" numero={`${numero}  V.${versao}`} data={`Emitido em ${dataBR(dados.data_pedido)}`} />
      <Titulo eyebrow="Contrato" titulo={TITULO_CONTRATO} />

      <Secao titulo="Informações gerais">
        <View style={s.grade}>
          <Campo rotulo="Cliente (contratante)" valor={dados.cliente.nome} />
          <Campo rotulo="Data do pedido" valor={dataBR(dados.data_pedido)} largura="25%" />
          <Campo rotulo="Atendente" valor={dados.atendente} largura="25%" />
          <Campo rotulo={dados.cliente.inscricao_estadual ? 'CNPJ · Inscrição estadual' : 'CPF/CNPJ'} valor={[formatDoc(dados.cliente.cpf_cnpj), dados.cliente.inscricao_estadual].filter(Boolean).join(' · IE ')} />
          <Campo rotulo="Telefone" valor={formatTelefone(dados.cliente.telefone)} />
          <Campo rotulo="Endereço" valor={[dados.cliente.endereco, dados.cliente.cidade].filter(Boolean).join(', ')} largura="100%" />
          <Campo rotulo="Objetivo" valor={dados.evento.titulo} />
          <Campo rotulo="Data do evento" valor={dataBR(dados.evento.data_evento)} />
        </View>
      </Secao>

      <Secao titulo="Informações de logística">
        <View style={s.grade}>
          <Campo rotulo="Local" valor={dados.evento.local_nome} />
          <Campo rotulo="Endereço da entrega" valor={dados.evento.local_endereco} />
          <Campo rotulo="Entrega" valor={dataHora(dados.evento.entrega_em)} />
          <Campo rotulo="Devolução" valor={dataHora(dados.evento.devolucao_em)} />
        </View>
      </Secao>

      {separar ? (
        <>
          <Secao titulo="Peças">
            <TabelaItens itens={pecas} total={['Total das peças', null, null, totalDe(pecas) ? formatBRL(totalDe(pecas)) : 'Incluso']} />
          </Secao>
          <Secao titulo="Serviços">
            {servicos.length ? <TabelaItens itens={servicos} total={['Total dos serviços', null, null, formatBRL(totalDe(servicos))]} /> : <Text style={{ fontSize: 8.4, color: cor.cinza }}>Nenhum serviço à parte.</Text>}
            <View style={[s.totalLinha, { marginTop: 8 }]} wrap={false}>
              <Text style={[s.td, s.b, { width: '81%' }]}>Total geral</Text>
              <Text style={[s.td, s.b, s.num, { width: '19%' }]}>{formatBRL(dados.totais.total)}</Text>
            </View>
          </Secao>
        </>
      ) : (
        <Secao titulo="Itens contratados">
          <TabelaItens itens={dados.itens} total={['Total geral', null, null, formatBRL(dados.totais.total)]} />
        </Secao>
      )}

      <Secao titulo="Parcelas de pagamento">
        <Tabela
          colunas={[
            { titulo: 'Vencimento', largura: '14%' },
            { titulo: 'Descrição', largura: '28%' },
            { titulo: 'Valor', largura: '15%', num: true },
            { titulo: 'Situação', largura: '11%' },
            { titulo: 'Forma', largura: '12%' },
            { titulo: 'Conta bancária', largura: '20%' },
          ]}
          linhas={dados.parcelas.map((p) => [dataBR(p.vencimento), p.descricao, formatBRL(p.valor), p.situacao, p.forma, conta || '—'])}
        />
        <View style={[s.kpis, { marginTop: 10 }]} wrap={false}>
          {separar ? <Kpi rotulo="Peças" valor={totalDe(pecas) ? formatBRL(totalDe(pecas)) : "Incluso"} /> : null}
          <Kpi rotulo="Serviços" valor={formatBRL(dados.totais.valor_servicos)} />
          {!separar ? <Kpi rotulo="Extras" valor={formatBRL(dados.totais.extras)} /> : null}
          <Kpi rotulo="Valor total" valor={formatBRL(dados.totais.total)} destaque />
          <Kpi rotulo="Valor pago" valor={formatBRL(dados.totais.pago)} corValor={cor.verde} />
          <Kpi rotulo="Valor pendente" valor={formatBRL(dados.totais.pendente)} />
        </View>
      </Secao>

      <Secao titulo="Cláusulas do contrato">
        <View style={{ gap: 6 }}>
          {paragrafos.map((p, i) => (
            <View key={i} style={{ paddingLeft: p.recuo ? 12 : 0 }} wrap={!p.destaque}>
              {p.titulo || p.texto ? (
                <TextoRico style={{ fontSize: 8.4, textAlign: 'justify' }} texto={`${p.titulo ? `**${p.titulo}** ` : ''}${p.texto ?? ''}`} />
              ) : null}
              {p.destaque ? (
                <View style={{ backgroundColor: cor.creme, borderRadius: 5, padding: 8, marginTop: 5, gap: 1 }}>
                  {p.destaque.map((l) => <TextoRico key={l} texto={l} style={{ fontSize: 8.4 }} />)}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </Secao>

      <View wrap={false} style={{ marginTop: 22 }}>
        <Text style={{ fontSize: 8.8 }}>Concordamos com as condições acima mencionadas.</Text>
        <Text style={{ fontSize: 8.8 }}>{cidade}, {dataBR(dados.data_pedido)}.</Text>
        <View style={{ flexDirection: 'row', gap: 40, marginTop: 44 }}>
          <View style={{ flex: 1, borderTopWidth: 0.8, borderTopColor: cor.tinta, paddingTop: 5 }}>
            <Text style={[s.rotulo]}>Contratante</Text>
            <Text style={{ fontSize: 8.8, fontWeight: 700 }}>{dados.cliente.nome}</Text>
            {dados.cliente.cpf_cnpj ? <Text style={{ fontSize: 8 }}>CPF/CNPJ: {formatDoc(dados.cliente.cpf_cnpj)}</Text> : null}
          </View>
          <View style={{ flex: 1, borderTopWidth: 0.8, borderTopColor: cor.tinta, paddingTop: 5 }}>
            <Text style={[s.rotulo]}>Contratada</Text>
            <Text style={{ fontSize: 8.8, fontWeight: 700 }}>{e.nome ?? 'Aline Antunes Decora'}</Text>
            {e.cnpj ? <Text style={{ fontSize: 8 }}>CNPJ: {formatDoc(e.cnpj)}</Text> : null}
          </View>
        </View>
      </View>
    </Documento>
  )
}

// ---------------------------------------------------------------------------
// Recibo
// ---------------------------------------------------------------------------
export interface DadosRecibo {
  numero: string
  valor: number
  data: string
  clienteNome: string
  clienteDoc: string | null
  referente: string
  forma: string
}

export function ReciboPdf({ empresa, r }: { empresa: Partial<Empresa>; r: DadosRecibo }) {
  const cidade = (empresa.cidade_foro ?? '').split('/')[0] || 'Louveira'
  return (
    <Documento titulo={`Recibo ${r.numero}`} rodape={`${empresa.nome ?? 'Aline Antunes Decora'} · Recibo ${r.numero}`}>
      <Cabecalho empresa={empresa} tipo="Recibo" numero={r.numero} data={dataBR(r.data)} />
      <View style={{ marginTop: 26, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Text style={s.eyebrow}>Recibo de pagamento</Text>
          <Text style={[s.h1, { fontSize: 24 }]}>Recebemos com carinho</Text>
        </View>
        <View style={{ backgroundColor: cor.rosaClaro, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 0.8, borderColor: cor.rosaSuave }}>
          <Text style={s.kpiRot}>Valor</Text>
          <Text style={{ fontSize: 20, fontWeight: 700, color: cor.rosa }}>{formatBRL(r.valor)}</Text>
        </View>
      </View>
      <View style={{ marginTop: 22, padding: 16, borderWidth: 0.8, borderColor: cor.borda, borderRadius: 8 }}>
        <Text style={{ fontSize: 10.5, lineHeight: 1.7, textAlign: 'justify' }}>
          Recebemos de <Text style={s.b}>{r.clienteNome}</Text>
          {r.clienteDoc ? <Text>, CPF/CNPJ {formatDoc(r.clienteDoc)}</Text> : null}, a quantia de{' '}
          <Text style={s.b}>{formatBRL(r.valor)}</Text> ({reaisPorExtenso(r.valor)}), referente a {r.referente}, paga via {r.forma} em {dataBR(r.data)}.
        </Text>
        <Text style={{ fontSize: 10.5, marginTop: 10 }}>Para clareza, firmamos o presente recibo.</Text>
      </View>
      <View style={{ marginTop: 40, alignItems: 'center' }} wrap={false}>
        <Text style={{ fontSize: 9 }}>{cidade}, {dataBR(r.data)}.</Text>
        <View style={{ width: 240, borderTopWidth: 0.8, borderTopColor: cor.tinta, marginTop: 46, paddingTop: 5, alignItems: 'center' }}>
          <Text style={{ fontSize: 9, fontWeight: 700 }}>{empresa.responsavel_nome || empresa.nome || 'Aline Antunes Decora'}</Text>
          <Text style={{ fontSize: 8, color: cor.cinza }}>{empresa.nome ?? 'Aline Antunes Decora'}{empresa.cnpj ? ` · CNPJ ${formatDoc(empresa.cnpj)}` : ''}</Text>
        </View>
      </View>
      <Text style={{ marginTop: 34, textAlign: 'center', fontFamily: 'Playfair Display', fontStyle: 'italic', fontWeight: 500, color: cor.deco, fontSize: 11 }}>
        Obrigada por fazer parte da nossa história.
      </Text>
    </Documento>
  )
}

// ---------------------------------------------------------------------------
// Fechamento do mês
// ---------------------------------------------------------------------------
export function FechamentoPdf(p: {
  empresa: Partial<Empresa>
  ym: string
  resumo: ResumoMes
  nomeCategoria: (id: string) => string
  saldoHoje: number
  folegoMeses: number
  aReceber: number
  fechadoEm: string | null
}) {
  const { resumo: r } = p
  const linhas = (lista: [string, number][], negativo = false) => lista.map(([c, v]) => [p.nomeCategoria(c), `${negativo ? '− ' : ''}${formatBRL(v)}`])
  return (
    <Documento titulo={`Fechamento de ${nomeMes(p.ym)}`} rodape={`${p.empresa.nome ?? 'Aline Antunes Decora'} · Fechamento de ${nomeMes(p.ym)} · gerado em ${agora()}`}>
      <Cabecalho empresa={p.empresa} tipo="Fechamento" numero={mesCurto(p.ym).toUpperCase() + '/' + p.ym.slice(2, 4)} data={p.fechadoEm ? `Fechado em ${dataBR(p.fechadoEm)}` : 'Mês aberto'} />
      <Titulo eyebrow="Relatório mensal" titulo={`Fechamento de ${nomeMes(p.ym)}`} sub="Regime de caixa: conta o que foi efetivamente recebido e pago dentro do mês." />
      <View style={s.kpis}>
        <Kpi rotulo="Entradas" valor={formatBRL(r.entradas)} />
        <Kpi rotulo="Custos" valor={formatBRL(r.custosVariaveis + r.custosFixos)} />
        <Kpi rotulo="Lucro do mês" valor={formatBRL(r.lucro)} destaque corValor={r.lucro < 0 ? cor.vermelho : cor.tinta} />
        <Kpi rotulo="Retiradas" valor={formatBRL(r.retiradas)} />
      </View>
      <Secao titulo="Demonstrativo">
        <Tabela colunas={[{ titulo: 'Entradas', largura: '70%' }, { titulo: 'Valor', largura: '30%', num: true }]} linhas={linhas(r.entradasPorCategoria)} total={['Total de entradas', formatBRL(r.entradas)]} />
        <View style={{ height: 8 }} />
        <Tabela colunas={[{ titulo: 'Custos dos eventos', largura: '70%' }, { titulo: 'Valor', largura: '30%', num: true }]} linhas={linhas(r.variaveisPorCategoria, true)} total={['Total de custos variáveis', `− ${formatBRL(r.custosVariaveis)}`]} />
        <View style={{ height: 8 }} />
        <Tabela colunas={[{ titulo: 'Custos fixos', largura: '70%' }, { titulo: 'Valor', largura: '30%', num: true }]} linhas={linhas(r.fixosPorCategoria, true)} total={['Total de custos fixos', `− ${formatBRL(r.custosFixos)}`]} />
        <View style={{ marginTop: 10, borderWidth: 0.8, borderColor: cor.borda, borderRadius: 5 }} wrap={false}>
          {[
            ['Lucro do mês', formatBRL(r.lucro), true],
            ['Retiradas da proprietária', `− ${formatBRL(r.retiradas)}`, false],
            ['Ficou na empresa', formatBRL(r.ficouNaEmpresa), true],
          ].map(([a, b, forte], i) => (
            <View key={String(a)} style={[{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 8 }, i ? { borderTopWidth: 0.6, borderTopColor: cor.borda } : {}]}>
              <Text style={forte ? s.b : {}}>{a}</Text>
              <Text style={forte ? s.b : {}}>{b}</Text>
            </View>
          ))}
        </View>
      </Secao>
      <Secao titulo="Saúde do caixa">
        <View style={s.kpis}>
          <Kpi rotulo="Saldo hoje" valor={formatBRL(p.saldoHoje)} />
          <Kpi rotulo="Fôlego" valor={`${Number.isFinite(p.folegoMeses) ? formatMeses(p.folegoMeses) : '—'} meses`} sub="sem nenhuma receita nova" />
          <Kpi rotulo="A receber de eventos" valor={formatBRL(p.aReceber)} />
        </View>
      </Secao>
    </Documento>
  )
}

// ---------------------------------------------------------------------------
// Fluxo de caixa
// ---------------------------------------------------------------------------
export function FluxoPdf({ empresa, fluxo, retiradaMinima }: { empresa: Partial<Empresa>; fluxo: MesFluxo[]; retiradaMinima: number }) {
  const neg = fluxo.find((m) => m.previsto && m.saldoFinal < 0)
  const W = 515, H = 170, L = 44, B = 18, T = 8
  const max = Math.max(1, ...fluxo.map((m) => Math.max(m.entradas, m.saidas, m.saldoFinal)))
  const min = Math.min(0, ...fluxo.map((m) => m.saldoFinal))
  const y = (v: number) => T + (H - T - B) * (1 - (v - min) / (max - min))
  const gw = (W - L) / fluxo.length
  const bw = Math.min(12, gw * 0.28)
  return (
    <Documento titulo="Fluxo de caixa" rodape={`${empresa.nome ?? 'Aline Antunes Decora'} · Fluxo de caixa · gerado em ${agora()}`}>
      <Cabecalho empresa={empresa} tipo="Fluxo de caixa" data={`Gerado em ${dataBR(new Date().toISOString().slice(0, 10))}`} />
      <Titulo eyebrow="Previsão" titulo="Fluxo de caixa" sub={`Realizado e previsto. A previsão soma as parcelas a receber, os custos fixos e uma retirada de ${formatBRL(retiradaMinima)} por mês.`} />
      {neg ? (
        <View style={s.aviso}>
          <Text style={{ color: cor.vermelho, fontWeight: 700 }}>!</Text>
          <Text><Text style={s.b}>Sem novos eventos, o caixa fica negativo em {nomeMes(neg.ym)}.</Text> Cada evento novo empurra essa data para frente.</Text>
        </View>
      ) : null}
      <Secao titulo="Entradas, saídas e saldo">
        <Svg width={W} height={H}>
          <SvgLine x1={L} x2={W} y1={y(0)} y2={y(0)} strokeWidth={0.8} stroke={cor.cinza} />
          {fluxo.map((m, i) => {
            const cx = L + gw * i + gw / 2
            const op = m.previsto ? 0.45 : 1
            return (
              <View key={m.ym}>
                <Rect x={cx - bw - 1} y={y(m.entradas)} width={bw} height={Math.max(0, y(0) - y(m.entradas))} fill={cor.deco} opacity={op} />
                <Rect x={cx + 1} y={y(m.saidas)} width={bw} height={Math.max(0, y(0) - y(m.saidas))} fill="#CDBCC3" opacity={op} />
                <Rect x={cx - 2.5} y={y(m.saldoFinal) - 2.5} width={5} height={5} fill={m.saldoFinal < 0 ? cor.vermelho : cor.tinta} />
              </View>
            )
          })}
        </Svg>
        <View style={{ flexDirection: 'row', marginLeft: L }}>
          {fluxo.map((m) => (
            <Text key={m.ym} style={{ width: gw, textAlign: 'center', fontSize: 6.8, color: cor.cinza }}>{mesCurto(m.ym)}</Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 6, fontSize: 7.2, color: cor.cinza, alignItems: 'center' }}>
          {([[cor.deco, 'Entradas'], ['#CDBCC3', 'Saídas'], [cor.tinta, 'Saldo no fim do mês']] as const).map(([c, t]) => (
            <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Quadrado c={c} /><Text>{t}</Text></View>
          ))}
          <Text>Barras claras = previsto</Text>
        </View>
      </Secao>
      <Secao titulo="Mês a mês">
        <Tabela
          colunas={[{ titulo: 'Mês', largura: '28%' }, { titulo: 'Entradas', largura: '24%', num: true }, { titulo: 'Saídas', largura: '24%', num: true }, { titulo: 'Saldo final', largura: '24%', num: true }]}
          linhas={fluxo.map((m) => [
            `${nomeMes(m.ym)}${m.previsto ? ' (previsto)' : ''}`,
            formatBRL(m.entradas),
            formatBRL(m.saidas),
            <Text key="s" style={[s.td, s.num, m.saldoFinal < 0 ? { color: cor.vermelho, fontWeight: 700 } : {}]}>{formatBRL(m.saldoFinal)}</Text>,
          ])}
        />
      </Secao>
    </Documento>
  )
}

// ---------------------------------------------------------------------------
// Resumo do evento
// ---------------------------------------------------------------------------
export function ResumoEventoPdf(p: {
  empresa: Partial<Empresa>
  evento: Evento
  clienteNome: string | null
  parcelas: Lancamento[]
  custos: Lancamento[]
  nomeCategoria: (id: string) => string
  receita: number
  inscritas?: { nome: string; status: string }[]
}) {
  const ev = p.evento
  const recebido = p.parcelas.filter((l) => l.data_pagamento).reduce((t, l) => t + Number(l.valor), 0)
  const custos = p.custos.reduce((t, l) => t + Number(l.valor), 0)
  const lucro = p.receita - custos
  return (
    <Documento titulo={`Resumo · ${ev.titulo}`} rodape={`${p.empresa.nome ?? 'Aline Antunes Decora'} · Resumo do evento · gerado em ${agora()}`}>
      <Cabecalho empresa={p.empresa} tipo="Resumo do evento" data={dataBR(ev.data_evento)} />
      <Titulo eyebrow={FONTE[ev.fonte]} titulo={ev.titulo} sub={[dataBR(ev.data_evento), p.clienteNome, ev.cidade].filter(Boolean).join(' · ')} />
      <View style={s.kpis}>
        <Kpi rotulo={ev.fonte === 'workshop' ? 'Inscrições' : 'Valor fechado'} valor={formatBRL(p.receita)} />
        <Kpi rotulo="Recebido" valor={formatBRL(recebido)} sub={`${formatBRL(p.receita - recebido)} a receber`} />
        <Kpi rotulo="Custos" valor={formatBRL(custos)} />
        <Kpi rotulo="Lucro" valor={formatBRL(lucro)} sub={`margem de ${formatPct(p.receita ? lucro / p.receita : 0)}`} destaque corValor={lucro < 0 ? cor.vermelho : cor.tinta} />
      </View>
      {ev.local_nome || ev.entrega_em ? (
        <Secao titulo="Logística">
          <View style={s.grade}>
            <Campo rotulo="Local" valor={ev.local_nome} />
            <Campo rotulo="Endereço" valor={ev.local_endereco} />
            <Campo rotulo="Entrega" valor={dataHora(ev.entrega_em)} />
            <Campo rotulo="Devolução" valor={dataHora(ev.devolucao_em)} />
          </View>
        </Secao>
      ) : null}
      <Secao titulo="Recebimentos">
        <Tabela
          colunas={[{ titulo: 'Vencimento', largura: '18%' }, { titulo: 'Descrição', largura: '40%' }, { titulo: 'Situação', largura: '20%' }, { titulo: 'Valor', largura: '22%', num: true }]}
          linhas={p.parcelas.map((l) => [dataBR(l.data_vencimento), l.descricao ?? '—', l.data_pagamento ? `Recebido ${dataBR(l.data_pagamento)}` : 'A receber', formatBRL(Number(l.valor))])}
          total={['Total', null, null, formatBRL(p.parcelas.reduce((t, l) => t + Number(l.valor), 0))]}
        />
      </Secao>
      <Secao titulo="Custos">
        {p.custos.length ? (
          <Tabela
            colunas={[{ titulo: 'Data', largura: '18%' }, { titulo: 'Descrição', largura: '40%' }, { titulo: 'Categoria', largura: '20%' }, { titulo: 'Valor', largura: '22%', num: true }]}
            linhas={p.custos.map((l) => [dataBR(l.data_pagamento ?? l.data_vencimento), l.descricao ?? '—', p.nomeCategoria(l.categoria_id), formatBRL(Number(l.valor))])}
            total={['Total', null, null, formatBRL(custos)]}
          />
        ) : (
          <Text style={{ color: cor.cinza }}>Nenhum custo lançado neste evento.</Text>
        )}
      </Secao>
      {p.inscritas?.length ? (
        <Secao titulo="Inscritas">
          <Tabela colunas={[{ titulo: 'Nome', largura: '70%' }, { titulo: 'Situação', largura: '30%' }]} linhas={p.inscritas.map((i) => [i.nome, i.status])} />
        </Secao>
      ) : null}
    </Documento>
  )
}
