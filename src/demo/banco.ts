// PRÉVIA: banco de dados simulado, só na memória da aba. Usado apenas no build "demo" (npm run build:demo).
// Imita as respostas do Supabase (REST, funções e login) para testar o sistema sem servidor.
// Também imita as regras principais de acesso: assistente sem financeiro não vê valores; CPF e contratos só a proprietária.
// Ao recarregar a página, tudo volta ao início. Nenhum dado sai do navegador.

type Linha = Record<string, unknown>
const E = 'e0000000-0000-4000-8000-00000000000a'
const PROPRIETARIA = 'a0000000-0000-4000-8000-0000000000a1'
const ASSISTENTE = 'a0000000-0000-4000-8000-0000000000a2'

let seq = 0
const novoId = () => {
  try {
    return crypto.randomUUID()
  } catch {
    seq++
    return `d${String(seq).padStart(7, '0')}-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`
  }
}
const agora = () => new Date().toISOString()
const hojeISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const base = (criadoPor: string | null = PROPRIETARIA): Linha & { id: string } => ({ id: novoId(), empresa_id: E, criado_em: agora(), atualizado_em: agora(), criado_por: criadoPor, excluido_em: null })

// ---------------------------------------------------------------------------
// Dados fictícios iniciais
// ---------------------------------------------------------------------------
const empresa: Linha = {
  id: E, nome: 'Aline Antunes Decora', logo_url: null, cor_destaque: null, reserva_meses: 3, retirada_minima: 2500, entrada_percentual: 30,
  dias_saldo_antes_evento: 5, percentual_lucro_empresa: null, percentual_lucro_proprietaria: null,
  razao_social: 'EMPRESA EXEMPLO MEI', cnpj: '11222333000181', telefones: '(11) 90000-0000', email_contato: 'contato@exemplo.com',
  endereco: 'Rua Exemplo, 100 · Centro · Louveira/SP', cidade_foro: 'Louveira/SP', banco_nome: 'NUBANK', banco_agencia: '0001',
  banco_conta: '1234567-8', banco_favorecido: 'FAVORECIDA EXEMPLO', pix_chave: 'CNPJ 11.222.333/0001-81', responsavel_nome: 'Aline Antunes',
}

function semear() {
  const t: Record<string, Linha[]> = {}
  t.empresas = [empresa]
  t.usuarios_empresas = [
    { ...base(), usuario_id: PROPRIETARIA, papel: 'proprietaria', financeiro_liberado: false },
    { ...base(), usuario_id: ASSISTENTE, papel: 'assistente', financeiro_liberado: false },
  ]
  const cat = (nome: string, tipo: string, natureza: string, fonte: string | null = null) => ({ ...base(), nome, tipo, natureza, fonte, ativa: true })
  t.categorias = [
    cat('Decoração', 'entrada', 'receita', 'decoracao'), cat('Assessoria', 'entrada', 'receita', 'assessoria'), cat('Workshop', 'entrada', 'receita', 'workshop'),
    cat('Outras entradas', 'entrada', 'receita'), cat('Flores', 'saida', 'variavel'), cat('Balões', 'saida', 'variavel'), cat('Material de consumo', 'saida', 'variavel'),
    cat('Deslocamento', 'saida', 'variavel'), cat('Freelancers', 'saida', 'variavel'), cat('Taxas de cartão', 'saida', 'variavel'),
    cat('Peças perdidas ou quebradas', 'saida', 'variavel'), cat('Aluguel', 'saida', 'fixo'), cat('Internet e telefone', 'saida', 'fixo'),
    cat('Impostos (DAS)', 'saida', 'fixo'), cat('Ferramentas e assinaturas', 'saida', 'fixo'), cat('Retirada da proprietária', 'saida', 'retirada'),
  ]
  const C = (nome: string) => t.categorias.find((c) => c.nome === nome)!.id as string
  t.contas = [
    { ...base(), nome: 'Nubank', saldo_inicial: 3400, data_saldo_inicial: '2026-10-01', ativa: true },
    { ...base(), nome: 'Caixa Econômica', saldo_inicial: 1200, data_saldo_inicial: '2026-10-01', ativa: true },
    { ...base(), nome: 'Dinheiro', saldo_inicial: 330, data_saldo_inicial: '2026-10-01', ativa: true },
  ]
  const K = t.contas[0].id as string
  const cli = (nome: string, telefone: string, cidade: string, origem: string) => ({ ...base(), nome, telefone, email: null, endereco: 'Rua das Flores, 45', cidade, origem })
  t.clientes = [
    cli('Camila Ferreira', '11987654321', 'Jundiaí', 'instagram'), cli('Sofia Martins', '11976543210', 'Vinhedo', 'indicacao'),
    cli('Juliana Costa', '11965432109', 'Campinas', 'instagram'), cli('Patrícia Almeida', '11954321098', 'Louveira', 'indicacao'),
    cli('Marcos Ribeiro', '11943210987', 'Valinhos', 'whatsapp'), cli('Renata Oliveira', '19998765432', 'Louveira', 'instagram'),
  ]
  const CL = (i: number) => t.clientes[i].id as string
  t.clientes_documentos = [
    { ...base(), cliente_id: CL(0), cpf_cnpj: '52998224725' }, { ...base(), cliente_id: CL(3), cpf_cnpj: '11144477735' }, { ...base(), cliente_id: CL(4), cpf_cnpj: '11222333000181' },
  ]
  const ev = (titulo: string, ci: number | null, fonte: string, data: string, valor: number, status: string, extra: Linha = {}) => ({
    ...base(), cliente_id: ci === null ? null : CL(ci), titulo, tipo: fonte === 'workshop' ? 'workshop' : 'infantil', fonte, data_evento: data, cidade: 'Jundiaí',
    valor_fechado: valor, vagas: null, valor_inscricao: null, status, local_nome: null, local_endereco: null, entrega_em: null, devolucao_em: null, ...extra,
  })
  t.eventos = [
    ev('Aniversário de 1 ano · Maria Luísa', 0, 'decoracao', '2026-10-04', 3800, 'realizado'),
    ev('Chá revelação · Sofia e Bruno', 1, 'decoracao', '2026-10-12', 2600, 'realizado'),
    ev('Casamento · Juliana e Rafael', 2, 'assessoria', '2026-10-24', 5500, 'realizado'),
    ev('3º Workshop Flores à Mesa', null, 'workshop', '2026-11-08', 0, 'confirmado', { vagas: 12, valor_inscricao: 280, cidade: 'Louveira' }),
    ev('15 anos · Isabela', 3, 'decoracao', '2026-11-21', 6200, 'confirmado', { local_nome: 'Salão Jardim', local_endereco: 'Av. Exemplo, 400 · Jundiaí/SP', entrega_em: '2026-11-21T14:00:00-03:00', devolucao_em: '2026-11-21T23:30:00-03:00' }),
    ev('Bodas de ouro · Helena e Carlos', 4, 'decoracao', '2026-12-06', 4200, 'confirmado'),
    ev('Aniversário de 4 anos · Theo', 5, 'decoracao', '2026-10-31', 3200, 'confirmado'),
  ]
  const EV = (i: number) => t.eventos[i].id as string
  const L = (tipo: string, valor: number, venc: string, pago: string | null, cat: string, evi: number | null, descricao: string) => ({
    ...base(), tipo, valor, data_vencimento: venc, data_pagamento: pago, conta_id: K, categoria_id: C(cat), evento_id: evi === null ? null : EV(evi), recorrencia_id: null, descricao,
  })
  t.lancamentos = [
    L('entrada', 1140, '2026-08-20', '2026-08-20', 'Decoração', 0, 'Entrada (30%)'), L('entrada', 2660, '2026-09-29', '2026-09-29', 'Decoração', 0, 'Saldo'),
    L('saida', 620, '2026-10-02', '2026-10-02', 'Flores', 0, 'Flores do painel'), L('saida', 480, '2026-10-02', '2026-10-02', 'Balões', 0, 'Arco de balões'),
    L('saida', 400, '2026-10-04', '2026-10-04', 'Freelancers', 0, '2 freelancers de montagem'), L('saida', 90, '2026-10-06', '2026-10-06', 'Peças perdidas ou quebradas', 0, 'Bandeja de vidro quebrada'),
    L('entrada', 780, '2026-09-01', '2026-09-01', 'Decoração', 1, 'Entrada (30%)'), L('entrada', 1820, '2026-10-07', '2026-10-07', 'Decoração', 1, 'Saldo'),
    L('saida', 790, '2026-10-10', '2026-10-10', 'Flores', 1, 'Flores e folhagens'), L('saida', 120, '2026-10-12', '2026-10-12', 'Deslocamento', 1, 'Deslocamento Louveira–Vinhedo'),
    L('entrada', 1650, '2026-08-15', '2026-08-15', 'Assessoria', 2, 'Entrada (30%)'), L('entrada', 3850, '2026-10-19', '2026-10-19', 'Assessoria', 2, 'Saldo'),
    L('saida', 600, '2026-10-24', '2026-10-24', 'Freelancers', 2, 'Equipe de coordenação'),
    L('saida', 350, '2026-10-22', '2026-10-22', 'Material de consumo', 3, 'Vasos, espuma e fitas'), L('saida', 900, '2026-11-06', null, 'Flores', 3, 'Flores para 12 alunas'),
    L('entrada', 1860, '2026-10-15', '2026-10-15', 'Decoração', 4, 'Entrada (30%)'), L('entrada', 4340, '2026-11-16', null, 'Decoração', 4, 'Saldo'),
    L('saida', 178, '2026-10-15', '2026-10-15', 'Taxas de cartão', 4, 'Taxa do cartão (entrada em 3x)'),
    L('entrada', 1260, '2026-10-20', '2026-10-20', 'Decoração', 5, 'Entrada (30%)'), L('entrada', 2940, '2026-12-01', null, 'Decoração', 5, 'Saldo'),
    L('entrada', 960, '2026-09-25', '2026-09-25', 'Decoração', 6, 'Entrada (30%)'), L('entrada', 2240, '2026-10-26', '2026-10-26', 'Decoração', 6, 'Saldo'),
    L('saida', 450, '2026-10-27', '2026-10-27', 'Balões', 6, 'Balões e fitas'), L('saida', 400, '2026-10-31', null, 'Freelancers', 6, '2 freelancers de montagem'),
    L('saida', 1500, '2026-10-10', '2026-10-10', 'Retirada da proprietária', null, 'Retirada'), L('saida', 1000, '2026-10-25', '2026-10-25', 'Retirada da proprietária', null, 'Retirada'),
  ]
  t.recorrencias = [
    ['Aluguel do ateliê', 1200, 5, 'Aluguel'], ['Internet e celular', 180, 10, 'Internet e telefone'],
    ['Imposto DAS (MEI)', 76, 20, 'Impostos (DAS)'], ['Canva e aplicativos', 35, 15, 'Ferramentas e assinaturas'],
  ].map(([descricao, valor, dia, c]) => ({ ...base(), descricao, valor, dia_vencimento: dia, categoria_id: C(c as string), conta_id: K, ativa: true }))
  // Custos fixos de outubro já pagos (os meses seguintes o próprio sistema gera ao abrir).
  for (const r of t.recorrencias) {
    const d = `2026-10-${String(r.dia_vencimento).padStart(2, '0')}`
    t.lancamentos.push({ ...base(), tipo: 'saida', valor: r.valor, data_vencimento: d, data_pagamento: d, conta_id: K, categoria_id: r.categoria_id, evento_id: null, recorrencia_id: r.id, descricao: r.descricao })
  }
  t.inscricoes_workshop = ['Ana Paula Rocha', 'Beatriz Lima', 'Carla Souza', 'Daniela Prado', 'Elaine Moraes', 'Fernanda Melo', 'Gabriela Nunes', 'Heloísa Duarte'].map((nome, i) => {
    const insc: Linha = { ...base(), evento_id: EV(3), nome, telefone: `119981233${String(i).padStart(2, '0')}`, valor: 280, status: i < 6 ? 'paga' : 'reservada', lancamento_id: null }
    if (i < 6) {
      const d = `2026-10-${String(5 + i * 3).padStart(2, '0')}`
      const l = { ...base(), tipo: 'entrada', valor: 280, data_vencimento: d, data_pagamento: d, conta_id: K, categoria_id: C('Workshop'), evento_id: EV(3), recorrencia_id: null, descricao: 'Inscrição no workshop' }
      t.lancamentos.push(l)
      insc.lancamento_id = l.id
    }
    return insc
  })
  t.fechamentos_mensais = []
  t.contratos = []
  t.registros_atividades = []
  return t
}

let T = semear()
export const recomecar = () => {
  T = semear()
}

// ---------------------------------------------------------------------------
// Regras de acesso (as mesmas ideias da RLS do banco real, simplificadas)
// ---------------------------------------------------------------------------
let usuario: string | null = null
const vinculo = () => T.usuarios_empresas.find((v) => v.usuario_id === usuario && !v.excluido_em)
const ehProp = () => vinculo()?.papel === 'proprietaria'
const veFin = () => ehProp() || (vinculo()?.papel === 'assistente' && !!vinculo()?.financeiro_liberado)
const FINANCEIRO = new Set(['contas', 'categorias', 'recorrencias', 'lancamentos', 'fechamentos_mensais', 'saldos_contas'])
const SO_PROPRIETARIA = new Set(['clientes_documentos', 'contratos', 'registros_atividades'])
const CADASTROS = new Set(['clientes', 'eventos', 'inscricoes_workshop', 'resultado_eventos'])
function pode(tabela: string, escrita: boolean) {
  if (!vinculo()) return false
  if (tabela === 'usuarios_empresas') return !escrita || ehProp()
  if (tabela === 'empresas') return !escrita || ehProp()
  if (SO_PROPRIETARIA.has(tabela)) return ehProp()
  if (FINANCEIRO.has(tabela)) return veFin()
  if (CADASTROS.has(tabela)) return vinculo()?.papel !== 'freelancer'
  return false
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------
const num = (v: unknown) => Number(v) || 0
function view(nome: string): Linha[] | null {
  if (nome === 'saldos_contas') {
    return T.contas.filter((c) => !c.excluido_em).map((c) => ({
      empresa_id: E, conta_id: c.id, nome: c.nome,
      saldo: num(c.saldo_inicial) + T.lancamentos
        .filter((l) => l.conta_id === c.id && !l.excluido_em && l.data_pagamento && String(l.data_pagamento) >= String(c.data_saldo_inicial))
        .reduce((t, l) => t + (l.tipo === 'entrada' ? num(l.valor) : -num(l.valor)), 0),
    }))
  }
  if (nome === 'resultado_eventos') {
    return T.eventos.filter((e) => !e.excluido_em).map((e) => {
      const ls = veFin() ? T.lancamentos.filter((l) => l.evento_id === e.id && !l.excluido_em) : []
      const soma = (f: (l: Linha) => boolean) => ls.filter(f).reduce((t, l) => t + num(l.valor), 0)
      return {
        empresa_id: E, evento_id: e.id, titulo: e.titulo, fonte: e.fonte, data_evento: e.data_evento, valor_fechado: e.valor_fechado,
        recebido: soma((l) => l.tipo === 'entrada' && !!l.data_pagamento), a_receber: soma((l) => l.tipo === 'entrada' && !l.data_pagamento), custos: soma((l) => l.tipo === 'saida'),
      }
    })
  }
  return null
}

// ---------------------------------------------------------------------------
// Filtros no formato do PostgREST: col=eq.x, is.null, gte, lte, or=(and(...),and(...))
// ---------------------------------------------------------------------------
function condicao(linha: Linha, col: string, op: string, val: string) {
  const v = linha[col]
  if (op === 'eq') return String(v) === val
  if (op === 'neq') return String(v) !== val
  if (op === 'is') return val === 'null' ? v == null : String(v) === val
  if (op === 'gte') return v != null && String(v) >= val
  if (op === 'lte') return v != null && String(v) <= val
  if (op === 'like') return v != null && new RegExp('^' + val.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$').test(String(v))
  return true
}
function dividir(s: string) {
  const out: string[] = []
  let nivel = 0, atual = ''
  for (const ch of s) {
    if (ch === '(') nivel++
    if (ch === ')') nivel--
    if (ch === ',' && nivel === 0) { out.push(atual); atual = '' } else atual += ch
  }
  if (atual) out.push(atual)
  return out
}
function avaliarOu(linha: Linha, expr: string): boolean {
  const termos = dividir(expr.replace(/^\(/, '').replace(/\)$/, ''))
  return termos.some((t) => {
    if (t.startsWith('and(')) return dividir(t.slice(4, -1)).every((c) => { const [col, op, ...r] = c.split('.'); return condicao(linha, col, op, r.join('.')) })
    const [col, op, ...r] = t.split('.')
    return condicao(linha, col, op, r.join('.'))
  })
}
const IGNORAR = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'])
function filtrar(linhas: Linha[], q: URLSearchParams) {
  let r = linhas
  for (const [k, v] of q) {
    if (IGNORAR.has(k)) continue
    if (k === 'or') { r = r.filter((l) => avaliarOu(l, v)); continue }
    const [op, ...resto] = v.split('.')
    r = r.filter((l) => condicao(l, k, op, resto.join('.')))
  }
  return r
}
function ordenar(linhas: Linha[], order: string | null) {
  if (!order) return linhas
  const [col, dir] = order.split(',')[0].split('.')
  const s = dir === 'desc' ? -1 : 1
  return [...linhas].sort((a, b) => (String(a[col] ?? '') < String(b[col] ?? '') ? -s : String(a[col] ?? '') > String(b[col] ?? '') ? s : 0))
}

// ---------------------------------------------------------------------------
// Escritas com as regras de negócio do banco
// ---------------------------------------------------------------------------
class ErroBanco extends Error {
  constructor(public code: string, message: string, public status = 403) { super(message) }
}
const mesFechado = (data: string) => T.fechamentos_mensais.some((f) => !f.excluido_em && String(f.mes_referencia).slice(0, 7) === data.slice(0, 7))
function travar(l: Linha) {
  const d = String(l.data_pagamento ?? l.data_vencimento ?? '')
  if (d && mesFechado(d)) throw new ErroBanco('42501', 'Este mês está fechado. Reabra o mês para lançar nele.')
}
const PADROES: Record<string, Linha> = {
  clientes: { origem: 'outra', email: null, endereco: null, cidade: null, telefone: null },
  eventos: { status: 'confirmado', tipo: 'infantil', fonte: 'decoracao', valor_fechado: 0, vagas: null, valor_inscricao: null, cidade: null, local_nome: null, local_endereco: null, entrega_em: null, devolucao_em: null },
  lancamentos: { data_pagamento: null, evento_id: null, recorrencia_id: null, descricao: null },
  contas: { ativa: true, saldo_inicial: 0 },
  categorias: { ativa: true, fonte: null },
  recorrencias: { ativa: true },
  inscricoes_workshop: { status: 'reservada', lancamento_id: null },
  fechamentos_mensais: { resumo: {} },
}
function inserir(tabela: string, dados: Linha): Linha {
  const linha: Linha = { ...base(usuario ?? PROPRIETARIA), ...PADROES[tabela], ...dados, criado_por: usuario, criado_em: agora(), atualizado_em: agora() }
  if (tabela === 'lancamentos') travar(linha)
  if (tabela === 'clientes_documentos') {
    const atual = T.clientes_documentos.find((d) => d.cliente_id === linha.cliente_id)
    if (atual) { Object.assign(atual, dados, { atualizado_em: agora() }); return atual }
  }
  T[tabela].push(linha)
  return linha
}
function atualizar(tabela: string, linha: Linha, dados: Linha) {
  if (tabela === 'lancamentos') { travar(linha); travar({ ...linha, ...dados }) }
  if ('empresa_id' in dados && dados.empresa_id !== linha.empresa_id) throw new ErroBanco('42501', 'Não é permitido mover um registro para outra empresa.')
  Object.assign(linha, dados, { atualizado_em: agora() })
}

const addDias = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  const x = new Date(y, m - 1, d + n)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

const RPC: Record<string, (p: Linha) => unknown> = {
  criar_evento(p) {
    if (vinculo()?.papel === 'freelancer') throw new ErroBanco('42501', 'Sem permissão.')
    const ev = inserir('eventos', {
      cliente_id: p.p_cliente ?? null, titulo: p.p_titulo, tipo: p.p_tipo, fonte: p.p_fonte, data_evento: p.p_data_evento, cidade: p.p_cidade ?? null,
      valor_fechado: num(p.p_valor_fechado), vagas: p.p_vagas ?? null, valor_inscricao: p.p_valor_inscricao ?? null,
    })
    const valor = num(p.p_valor_fechado)
    if (p.p_fonte !== 'workshop' && valor > 0 && veFin()) {
      const cat = T.categorias.find((c) => c.natureza === 'receita' && c.fonte === p.p_fonte && !c.excluido_em)
      const pct = Math.min(100, Math.max(0, num(p.p_entrada_percentual)))
      const entrada = Math.round(valor * pct) / 100
      const rot = Number.isInteger(pct) ? String(pct) : pct.toFixed(1).replace('.', ',')
      if (entrada > 0) inserir('lancamentos', { tipo: 'entrada', valor: entrada, data_vencimento: p.p_data_entrada, conta_id: p.p_conta, categoria_id: cat?.id, evento_id: ev.id, descricao: `Entrada (${rot}%)` })
      if (valor - entrada > 0) inserir('lancamentos', { tipo: 'entrada', valor: Math.round((valor - entrada) * 100) / 100, data_vencimento: addDias(String(p.p_data_evento), -num(empresa.dias_saldo_antes_evento)), conta_id: p.p_conta, categoria_id: cat?.id, evento_id: ev.id, descricao: 'Saldo' })
    }
    return ev.id
  },
  pagar_inscricao(p) {
    if (!veFin()) throw new ErroBanco('42501', 'Sem permissão.')
    const i = T.inscricoes_workshop.find((x) => x.id === p.p_inscricao)
    if (!i) throw new ErroBanco('42501', 'Inscrição não encontrada.')
    if (i.status === 'paga') return i.lancamento_id
    const d = String(p.p_data ?? hojeISO())
    const cat = T.categorias.find((c) => c.natureza === 'receita' && c.fonte === 'workshop')
    const l = inserir('lancamentos', { tipo: 'entrada', valor: i.valor, data_vencimento: d, data_pagamento: d, conta_id: p.p_conta, categoria_id: cat?.id, evento_id: i.evento_id, descricao: 'Inscrição no workshop' })
    Object.assign(i, { status: 'paga', lancamento_id: l.id })
    return l.id
  },
  emitir_contrato(p) {
    if (!ehProp()) throw new ErroBanco('42501', 'Só a proprietária emite contratos.')
    const ev = T.eventos.find((e) => e.id === p.p_evento)
    if (!ev) throw new ErroBanco('42501', 'Evento não encontrado.')
    const doEvento = T.contratos.filter((c) => c.evento_id === ev.id && !c.excluido_em)
    let numero: string, versao: number
    if (doEvento.length) {
      numero = String(doEvento[0].numero)
      versao = Math.max(...doEvento.map((c) => num(c.versao))) + 1
    } else {
      const d = String(ev.data_evento)
      const prefixo = d.slice(2, 4) + d.slice(5, 7) + d.slice(8, 10)
      const n = new Set(T.contratos.filter((c) => String(c.numero).startsWith(prefixo + '/')).map((c) => c.numero)).size + 1
      numero = `${prefixo}/${String(n).padStart(3, '0')}`
      versao = 1
    }
    return inserir('contratos', { evento_id: ev.id, numero, versao, emitido_em: agora(), assinado_em: null, cancelado_em: null, dados: p.p_dados })
  },
  gerar_recorrencias(p) {
    if (!veFin()) throw new ErroBanco('42501', 'Sem acesso ao financeiro desta empresa.')
    let criados = 0
    const ate = String(p.p_ate)
    for (const r of T.recorrencias.filter((x) => x.ativa && !x.excluido_em)) {
      const hoje = new Date()
      for (let k = 0; ; k++) {
        const ini = new Date(hoje.getFullYear(), hoje.getMonth() + k, 1)
        const fim = new Date(hoje.getFullYear(), hoje.getMonth() + k + 1, 0)
        const ym = `${ini.getFullYear()}-${String(ini.getMonth() + 1).padStart(2, '0')}`
        if (`${ym}-01` > ate) break
        const venc = `${ym}-${String(Math.min(num(r.dia_vencimento), fim.getDate())).padStart(2, '0')}`
        const existe = T.lancamentos.some((l) => l.recorrencia_id === r.id && !l.excluido_em && String(l.data_vencimento).slice(0, 7) === ym)
        if (!existe && !mesFechado(venc)) {
          T.lancamentos.push({ ...base(usuario ?? PROPRIETARIA), tipo: 'saida', valor: r.valor, data_vencimento: venc, data_pagamento: null, conta_id: r.conta_id, categoria_id: r.categoria_id, evento_id: null, recorrencia_id: r.id, descricao: r.descricao })
          criados++
        }
      }
    }
    return criados
  },
}

// ---------------------------------------------------------------------------
// Login simulado
// ---------------------------------------------------------------------------
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
function sessaoPara(email: string) {
  const id = /assist/i.test(email) ? ASSISTENTE : PROPRIETARIA
  usuario = id
  const exp = Math.floor(Date.now() / 1000) + 3600 * 12
  const user = { id, aud: 'authenticated', role: 'authenticated', email, app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-10-01T00:00:00Z' }
  const access_token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: id, exp, role: 'authenticated', aud: 'authenticated', email })}.demo`
  return { access_token, token_type: 'bearer', expires_in: 3600 * 12, expires_at: exp, refresh_token: `demo-${id}`, user }
}
let ultimaSessao: ReturnType<typeof sessaoPara> | null = null

// ---------------------------------------------------------------------------
// fetch que substitui a rede
// ---------------------------------------------------------------------------
const json = (corpo: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(corpo === undefined ? null : JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json', ...headers } })

export async function fetchDemo(entrada: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = new URL(typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url)
  const metodo = (init.method ?? 'GET').toUpperCase()
  const cab = new Headers(init.headers)
  const corpo = typeof init.body === 'string' && init.body ? JSON.parse(init.body) : {}
  await new Promise((r) => setTimeout(r, 60))

  if (url.pathname.startsWith('/auth/v1/')) {
    const rota = url.pathname.slice('/auth/v1/'.length)
    if (rota === 'token') {
      if (url.searchParams.get('grant_type') === 'password') {
        if (!corpo.email || !corpo.password) return json({ error: 'invalid_grant', error_description: 'Invalid login credentials' }, 400)
        ultimaSessao = sessaoPara(String(corpo.email))
        return json(ultimaSessao)
      }
      return ultimaSessao ? json(ultimaSessao) : json({ error: 'invalid_grant' }, 400)
    }
    if (rota === 'user') return ultimaSessao ? json(ultimaSessao.user) : json({ msg: 'not logged in' }, 401)
    if (rota === 'logout') { usuario = null; ultimaSessao = null; return new Response(null, { status: 204 }) }
    if (rota === 'recover') return json({})
    return json({})
  }

  const m = url.pathname.match(/^\/rest\/v1\/(rpc\/)?(\w+)/)
  if (!m) return json({ message: 'não encontrado' }, 404)
  const [, rpc, nome] = m
  try {
    if (!usuario) throw new ErroBanco('42501', 'Sem sessão.', 401)
    if (rpc) {
      const fn = RPC[nome]
      if (!fn) throw new ErroBanco('PGRST202', 'Função não encontrada.', 404)
      return json(fn(corpo))
    }
    const visao = view(nome)
    const escrita = metodo !== 'GET'
    if (!visao && !T[nome]) throw new ErroBanco('42P01', 'Tabela não encontrada.', 404)
    if (!pode(nome, escrita)) {
      if (escrita) throw new ErroBanco('42501', 'new row violates row-level security policy')
      return json(cab.get('Accept')?.includes('vnd.pgrst.object') ? null : [])
    }
    const prefer = cab.get('Prefer') ?? ''
    const representar = prefer.includes('return=representation')
    if (metodo === 'GET') {
      let linhas = filtrar(visao ?? T[nome], url.searchParams)
      if (nome === 'usuarios_empresas') linhas = linhas.map((v) => ({ ...v, empresas: empresa }))
      linhas = ordenar(linhas, url.searchParams.get('order'))
      const off = Number(url.searchParams.get('offset') ?? 0)
      const lim = url.searchParams.get('limit')
      linhas = linhas.slice(off, lim ? off + Number(lim) : undefined)
      if (cab.get('Accept')?.includes('vnd.pgrst.object')) {
        if (linhas.length !== 1) throw new ErroBanco('PGRST116', 'JSON object requested, multiple (or no) rows returned', 406)
        return json(linhas[0])
      }
      return json(linhas)
    }
    if (metodo === 'POST') {
      const novos = (Array.isArray(corpo) ? corpo : [corpo]).map((d: Linha) => inserir(nome, d))
      if (!representar) return new Response(null, { status: 201 })
      return json(cab.get('Accept')?.includes('vnd.pgrst.object') ? novos[0] : novos, 201)
    }
    if (metodo === 'PATCH') {
      const alvo = nome === 'empresas' ? [empresa] : filtrar(T[nome], url.searchParams)
      for (const l of alvo) atualizar(nome, l, corpo)
      return representar ? json(alvo) : new Response(null, { status: 204 })
    }
    if (metodo === 'DELETE') {
      const alvo = new Set(filtrar(T[nome], url.searchParams))
      T[nome] = T[nome].filter((l) => !alvo.has(l))
      return new Response(null, { status: 204 })
    }
    return json({}, 405)
  } catch (e) {
    const err = e instanceof ErroBanco ? e : new ErroBanco('XX000', 'erro interno', 500)
    return json({ code: err.code, message: err.message, details: null, hint: null }, err.status)
  }
}

