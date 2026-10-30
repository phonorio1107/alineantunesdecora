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

/** Igual ao gatilho do banco: deixa os movimentos "evento" de uma venda iguais ao que ela pede. */
function sincronizarEm(t: Record<string, Linha[]>, eventoId: string) {
  const ev = t.eventos.find((e) => e.id === eventoId)
  if (!ev) return
  const ativa = !ev.excluido_em && (ev.status === 'confirmado' || ev.status === 'realizado')
  const desejado = new Map<string, number>()
  if (ativa) {
    for (const i of t.eventos_itens.filter((x) => x.evento_id === eventoId && x.peca_id)) {
      const p = t.pecas.find((x) => x.id === i.peca_id)
      if (!p) continue
      desejado.set(String(i.peca_id), (desejado.get(String(i.peca_id)) ?? 0) + Number(p.tipo === 'consumo' ? i.quantidade : i.perdidas))
    }
  }
  const atual = new Map<string, number>()
  for (const m of t.estoque_movimentos.filter((x) => x.evento_id === eventoId && x.motivo === 'evento')) atual.set(String(m.peca_id), (atual.get(String(m.peca_id)) ?? 0) - Number(m.quantidade))
  for (const pid of new Set([...desejado.keys(), ...atual.keys()])) {
    const dif = (desejado.get(pid) ?? 0) - (atual.get(pid) ?? 0)
    if (dif) t.estoque_movimentos.push({ ...base(), peca_id: pid, evento_id: eventoId, quantidade: -dif, motivo: 'evento', observacao: String(ev.titulo).slice(0, 200) })
  }
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
    valor_fechado: valor, vagas: null, valor_inscricao: null, status, local_nome: null, local_endereco: null, entrega_em: null, devolucao_em: null,
    areas: { [fonte]: valor }, fechado_em: status === 'orcamento' ? null : '2026-09-01T12:00:00Z', conferido_em: null, observacoes: null, ...extra,
  })
  t.eventos = [
    ev('Aniversário de 1 ano · Maria Luísa', 0, 'decoracao', '2026-10-04', 3800, 'realizado'),
    ev('Chá revelação · Sofia e Bruno', 1, 'decoracao', '2026-10-12', 2600, 'realizado'),
    ev('Casamento · Juliana e Rafael', 2, 'assessoria', '2026-10-24', 5500, 'realizado'),
    ev('3º Workshop Flores à Mesa', null, 'workshop', '2026-11-08', 0, 'confirmado', { vagas: 12, valor_inscricao: 280, cidade: 'Louveira' }),
    ev('15 anos · Isabela', 3, 'decoracao', '2026-11-21', 6200, 'confirmado', { local_nome: 'Salão Jardim', local_endereco: 'Av. Exemplo, 400 · Jundiaí/SP', entrega_em: '2026-11-21T14:00:00-03:00', devolucao_em: '2026-11-21T23:30:00-03:00' }),
    ev('Bodas de ouro · Helena e Carlos', 4, 'decoracao', '2026-12-06', 4200, 'confirmado'),
    ev('Aniversário de 4 anos · Theo', 5, 'decoracao', '2026-10-31', 3200, 'confirmado'),
    ev('Batizado · Antônio', 1, 'decoracao', '2026-12-13', 2800, 'orcamento', {
      areas: { decoracao: 0, assessoria: 0 }, observacoes: 'Tema anjinhos, tons de azul-claro e branco. Mesa para 30 convidados. Cliente pediu arranjos com flores naturais.',
    }),
    ev('Chá de bebê · Lívia', 3, 'decoracao', '2026-11-29', 0, 'orcamento', { observacoes: 'Ainda escolhendo entre safári e jardim.' }),
  ]
  // Festa do Theo: decoração e assessoria juntas.
  Object.assign(t.eventos[6], { valor_fechado: 3200, areas: { decoracao: 2600, assessoria: 600 } })
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
  const peca = (codigo: string, nome: string, categoria: string, tipo: string, custo: number, qtd: number) => {
    const p = { ...base(), codigo, nome, categoria, tipo, custo_unitario: custo, observacoes: null }
    t.estoque_movimentos.push({ ...base(), peca_id: p.id, evento_id: null, quantidade: qtd, motivo: 'ajuste', observacao: 'Cadastro' })
    return p
  }
  t.estoque_movimentos = []
  t.pecas = [
    peca('1', 'Mesa azul baixa', 'Mesas', 'acervo', 350, 2), peca('2', 'Mesa provençal branca', 'Mesas', 'acervo', 890, 3),
    peca('3', 'Cilindro branco grande', 'Cilindros', 'acervo', 420, 4), peca('4', 'Cilindro branco médio', 'Cilindros', 'acervo', 320, 4),
    peca('5', 'Painel redondo de madeira 2 m', 'Painéis', 'acervo', 680, 2), peca('6', 'Boleira de vidro alta', 'Boleiras', 'acervo', 95, 6),
    peca('7', 'Bandeja espelhada dourada', 'Bandejas', 'acervo', 48, 12), peca('8', 'Vaso de vidro canelado', 'Arranjos', 'acervo', 36, 20),
    peca('9', 'Toalha de linho off-white 3 m', 'Tecidos', 'acervo', 140, 5), peca('10', 'Cordão de luz quente 10 m', 'Iluminação', 'acervo', 55, 8),
    peca('40', 'Balão 9 pol. rosa-claro', 'Balões', 'consumo', 0.45, 600), peca('41', 'Balão 16 pol. branco', 'Balões', 'consumo', 1.9, 120),
    peca('42', 'Fita de cetim rosé (rolo)', 'Fitas', 'consumo', 12, 14),
  ]
  const P = (codigo: string) => t.pecas.find((p) => p.codigo === codigo)!.id as string
  const item = (evi: number, tipo: string, pc: string | null, descricao: string, quantidade: number, valor_unitario: number, ordem: number, perdidas = 0) =>
    ({ ...base(), evento_id: EV(evi), tipo, peca_id: pc ? P(pc) : null, descricao, quantidade, valor_unitario, perdidas, ordem })
  t.eventos_itens = [
    item(4, 'peca', '5', 'Painel redondo', 1, 0, 0), item(4, 'peca', '2', 'Mesa principal provençal', 1, 0, 1), item(4, 'peca', '1', 'Mesa de apoio', 1, 0, 2),
    item(4, 'peca', '3', 'Cilindro grande', 2, 0, 3), item(4, 'peca', '6', 'Boleira', 3, 0, 4), item(4, 'peca', '40', 'Arco de balões desconstruído', 250, 0, 5),
    item(4, 'servico', null, 'Projeto de decoração · pacote Excepcional', 1, 5400, 6), item(4, 'servico', null, 'Montagem e desmontagem', 1, 800, 7),
    item(6, 'peca', '1', 'Mesa de apoio', 1, 0, 0), item(6, 'peca', '8', 'Vasinhos de flores', 6, 0, 1), item(6, 'peca', '40', 'Balões', 180, 0, 2),
    item(6, 'servico', null, 'Decoração tema Fundo do Mar', 1, 2600, 3), item(6, 'servico', null, 'Assessoria do dia', 1, 600, 4),
    item(7, 'peca', '2', 'Mesa de doces', 1, 0, 0), item(7, 'peca', '9', 'Toalha off-white', 2, 0, 1), item(7, 'peca', '8', 'Arranjos com flores naturais', 8, 0, 2),
    item(7, 'servico', null, 'Projeto de decoração · pacote Especial', 1, 2500, 3),
  ]
  // Baixas das vendas fechadas (consumo) e a peça que não voltou da festa da Maria Luísa.
  t.eventos_itens.push(item(0, 'peca', '7', 'Bandejas', 6, 0, 0, 1))
  t.eventos[0].conferido_em = '2026-10-05T10:00:00Z'
  const comp = (titulo: string, inicio: string, fim: string, local: string | null, evento: number | null = null, dia_inteiro = false) =>
    ({ ...base(), titulo, inicio, fim, dia_inteiro, local, notas: null, evento_id: evento === null ? null : EV(evento) })
  t.compromissos = [
    comp('Visita ao Salão Jardim', '2026-11-03T15:00:00-03:00', '2026-11-03T16:00:00-03:00', 'Salão Jardim, Jundiaí', 3),
    comp('Comprar flores no Ceasa', '2026-11-06T06:30:00-03:00', '2026-11-06T08:00:00-03:00', 'Ceasa Campinas'),
    comp('Reunião com a Patrícia (15 anos)', '2026-11-11T19:00:00-03:00', '2026-11-11T20:00:00-03:00', 'Ateliê'),
    comp('Feira de decoração', '2026-11-17T12:00:00-03:00', '2026-11-17T12:00:00-03:00', 'Expo Center Norte', null, true),
  ]
  t.fechamentos_mensais = []
  t.contratos = []
  for (const e of t.eventos) sincronizarEm(t, e.id as string)
  t.registros_atividades = []
  return t
}

let T = semear()
export const recomecar = () => {
  T = semear()
  fatoresDemo = []
}

// ---------------------------------------------------------------------------
// Regras de acesso (as mesmas ideias da RLS do banco real, simplificadas)
// ---------------------------------------------------------------------------
let usuario: string | null = null
let googleLigado = true
const vinculo = () => T.usuarios_empresas.find((v) => v.usuario_id === usuario && !v.excluido_em)
const ehProp = () => vinculo()?.papel === 'proprietaria'
const veFin = () => ehProp() || (vinculo()?.papel === 'assistente' && !!vinculo()?.financeiro_liberado)
const FINANCEIRO = new Set(['contas', 'categorias', 'recorrencias', 'lancamentos', 'fechamentos_mensais', 'saldos_contas'])
const SO_PROPRIETARIA = new Set(['clientes_documentos', 'contratos', 'registros_atividades'])
const CADASTROS = new Set(['clientes', 'eventos', 'inscricoes_workshop', 'resultado_eventos', 'compromissos', 'pecas', 'eventos_itens', 'estoque_movimentos', 'estoque_pecas'])
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
  if (nome === 'estoque_pecas') {
    return T.pecas.filter((p) => !p.excluido_em).map((p) => ({
      ...p, quantidade: T.estoque_movimentos.filter((m) => m.peca_id === p.id).reduce((t, m) => t + num(m.quantidade), 0),
    }))
  }
  if (nome === 'resultado_eventos') {
    return T.eventos.filter((e) => !e.excluido_em && e.status !== 'orcamento').map((e) => {
      const ls = veFin() ? T.lancamentos.filter((l) => l.evento_id === e.id && !l.excluido_em) : []
      const soma = (f: (l: Linha) => boolean) => ls.filter(f).reduce((t, l) => t + num(l.valor), 0)
      return {
        empresa_id: E, evento_id: e.id, titulo: e.titulo, fonte: e.fonte, data_evento: e.data_evento, valor_fechado: e.valor_fechado,
        recebido: soma((l) => l.tipo === 'entrada' && !!l.data_pagamento), a_receber: soma((l) => l.tipo === 'entrada' && !l.data_pagamento), custos: soma((l) => l.tipo === 'saida'),
        areas: e.areas,
      }
    })
  }
  return null
}

// ---------------------------------------------------------------------------
// Filtros no formato do PostgREST: col=eq.x, is.null, gte, lte, or=(and(...),and(...))
// ---------------------------------------------------------------------------
function condicao(linha: Linha, col: string, op: string, val: string): boolean {
  const v = linha[col]
  if (op === 'not') { const [op2, ...r] = val.split('.'); return !condicao(linha, col, op2, r.join('.')) }
  if (op === 'in') return val.replace(/^\(|\)$/g, '').split(',').map((x) => x.replace(/^"|"$/g, '')).includes(String(v))
  if (op === 'eq') return String(v) === val
  if (op === 'neq') return String(v) !== val
  if (op === 'is') return val === 'null' ? v == null : String(v) === val
  const cmp = (a: unknown, b: string) => (typeof a === 'number' && b !== '' && !Number.isNaN(Number(b)) ? a - Number(b) : String(a) < b ? -1 : String(a) > b ? 1 : 0)
  if (op === 'gte') return v != null && cmp(v, val) >= 0
  if (op === 'lte') return v != null && cmp(v, val) <= 0
  if (op === 'gt') return v != null && cmp(v, val) > 0
  if (op === 'lt') return v != null && cmp(v, val) < 0
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
  eventos: { status: 'confirmado', tipo: 'infantil', fonte: 'decoracao', valor_fechado: 0, vagas: null, valor_inscricao: null, cidade: null, local_nome: null, local_endereco: null, entrega_em: null, devolucao_em: null, areas: {}, fechado_em: null, conferido_em: null, observacoes: null },
  lancamentos: { data_pagamento: null, evento_id: null, recorrencia_id: null, descricao: null },
  contas: { ativa: true, saldo_inicial: 0 },
  categorias: { ativa: true, fonte: null },
  recorrencias: { ativa: true },
  inscricoes_workshop: { status: 'reservada', lancamento_id: null },
  fechamentos_mensais: { resumo: {} },
  pecas: { categoria: null, tipo: 'acervo', custo_unitario: 0, observacoes: null },
  eventos_itens: { peca_id: null, quantidade: 1, valor_unitario: 0, perdidas: 0, ordem: 0 },
  estoque_movimentos: { evento_id: null, observacao: null },
}
function inserir(tabela: string, dados: Linha): Linha {
  const linha: Linha = { ...base(usuario ?? PROPRIETARIA), ...PADROES[tabela], ...dados, criado_por: usuario, criado_em: agora(), atualizado_em: agora() }
  if (tabela === 'lancamentos') travar(linha)
  if (tabela === 'estoque_movimentos' && (linha.motivo !== 'ajuste' || linha.evento_id)) throw new ErroBanco('42501', 'new row violates row-level security policy')
  if (tabela === 'pecas' && T.pecas.some((p) => !p.excluido_em && String(p.codigo).trim().toLowerCase() === String(linha.codigo).trim().toLowerCase())) {
    throw new ErroBanco('23505', 'duplicate key value violates unique constraint "pecas_codigo_idx"', 409)
  }
  if (tabela === 'clientes_documentos') {
    const atual = T.clientes_documentos.find((d) => d.cliente_id === linha.cliente_id)
    if (atual) { Object.assign(atual, dados, { atualizado_em: agora() }); return atual }
  }
  T[tabela].push(linha)
  if (tabela === 'eventos_itens') sincronizarEm(T, String(linha.evento_id))
  return linha
}
function atualizar(tabela: string, linha: Linha, dados: Linha) {
  if (tabela === 'lancamentos') { travar(linha); travar({ ...linha, ...dados }) }
  if ('empresa_id' in dados && dados.empresa_id !== linha.empresa_id) throw new ErroBanco('42501', 'Não é permitido mover um registro para outra empresa.')
  Object.assign(linha, dados, { atualizado_em: agora() })
  if (tabela === 'eventos_itens') sincronizarEm(T, String(linha.evento_id))
  if (tabela === 'eventos' && ('status' in dados || 'excluido_em' in dados)) sincronizarEm(T, String(linha.id))
}

const addDias = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  const x = new Date(y, m - 1, d + n)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

/** Área principal: a de maior valor entre decoração e assessoria; workshop só quando é a única. */
const principal = (areas: Linha, padrao: string) =>
  Object.entries(areas).filter(([k]) => k !== 'workshop').sort((a, b) => num(b[1]) - num(a[1]) || a[0].localeCompare(b[0]))[0]?.[0] ?? ('workshop' in areas ? 'workshop' : padrao)

const RPC: Record<string, (p: Linha) => unknown> = {
  criar_evento(p) {
    if (vinculo()?.papel === 'freelancer') throw new ErroBanco('42501', 'Sem permissão.')
    const areas = (p.p_areas as Linha | null) ?? { [String(p.p_fonte)]: num(p.p_valor_fechado) }
    const ev = inserir('eventos', {
      cliente_id: p.p_cliente ?? null, titulo: p.p_titulo, tipo: p.p_tipo, fonte: principal(areas, String(p.p_fonte)), data_evento: p.p_data_evento, cidade: p.p_cidade ?? null,
      valor_fechado: num(p.p_valor_fechado), vagas: p.p_vagas ?? null, valor_inscricao: p.p_valor_inscricao ?? null, areas, status: 'orcamento',
    })
    if (!p.p_orcamento) RPC.fechar_orcamento({ p_evento: ev.id, p_valor: num(p.p_valor_fechado), p_areas: areas, p_entrada_percentual: p.p_entrada_percentual, p_data_entrada: p.p_data_entrada, p_conta: p.p_conta })
    return ev.id
  },
  fechar_orcamento(p) {
    if (vinculo()?.papel === 'freelancer') throw new ErroBanco('42501', 'Sem permissão.')
    const ev = T.eventos.find((e) => e.id === p.p_evento && !e.excluido_em)
    if (!ev) throw new ErroBanco('42501', 'Orçamento não encontrado.')
    if (ev.status !== 'orcamento') throw new ErroBanco('22023', 'Este orçamento já foi fechado.', 400)
    const valor = Math.round(num(p.p_valor) * 100) / 100
    let areas = (p.p_areas as Linha | null) ?? (ev.areas as Linha)
    if (!Object.keys(areas).length) areas = { [String(ev.fonte)]: valor }
    if (Object.keys(areas).length === 1) areas = { [Object.keys(areas)[0]]: valor }
    else if (Math.round(Object.values(areas).reduce((t: number, v) => t + num(v), 0) * 100) !== Math.round(valor * 100)) throw new ErroBanco('22023', 'A soma das áreas precisa dar o valor fechado.', 400)
    const fonte = principal(areas, String(ev.fonte))
    atualizar('eventos', ev, { status: 'confirmado', valor_fechado: valor, areas, fonte, fechado_em: agora() })
    if (fonte !== 'workshop' && valor > 0 && veFin()) {
      const cat = T.categorias.find((c) => c.natureza === 'receita' && c.fonte === fonte && !c.excluido_em)
      const pct = Math.min(100, Math.max(0, num(p.p_entrada_percentual)))
      const entrada = Math.round(valor * pct) / 100
      const rot = Number.isInteger(pct) ? String(pct) : pct.toFixed(1).replace('.', ',')
      if (entrada > 0) inserir('lancamentos', { tipo: 'entrada', valor: entrada, data_vencimento: p.p_data_entrada, conta_id: p.p_conta, categoria_id: cat?.id, evento_id: ev.id, descricao: `Entrada (${rot}%)` })
      if (valor - entrada > 0) inserir('lancamentos', { tipo: 'entrada', valor: Math.round((valor - entrada) * 100) / 100, data_vencimento: addDias(String(ev.data_evento), -num(empresa.dias_saldo_antes_evento)), conta_id: p.p_conta, categoria_id: cat?.id, evento_id: ev.id, descricao: 'Saldo' })
    }
    return null
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
    if (ev.status === 'orcamento') throw new ErroBanco('22023', 'Feche o orçamento antes de gerar o contrato.', 400)
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
      const inicio = r.inicio ? String(r.inicio).slice(0, 7) : ''
      for (let k = 0; ; k++) {
        const ini = new Date(hoje.getFullYear(), hoje.getMonth() + k, 1)
        const fim = new Date(hoje.getFullYear(), hoje.getMonth() + k + 1, 0)
        const ym = `${ini.getFullYear()}-${String(ini.getMonth() + 1).padStart(2, '0')}`
        if (`${ym}-01` > ate) break
        if (inicio && ym < inicio) continue
        const venc = `${ym}-${String(Math.min(num(r.dia_vencimento), fim.getDate())).padStart(2, '0')}`
        const existe = T.lancamentos.some((l) => l.recorrencia_id === r.id && !l.excluido_em && String(l.data_vencimento).slice(0, 7) === ym)
        if (!existe && !mesFechado(venc)) {
          T.lancamentos.push({ ...base(usuario ?? PROPRIETARIA), tipo: r.tipo ?? 'saida', valor: r.valor, data_vencimento: venc, data_pagamento: null, conta_id: r.conta_id, categoria_id: r.categoria_id, evento_id: null, recorrencia_id: r.id, descricao: r.descricao })
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
// Verificação em duas etapas simulada: o código certo é sempre 123456. Só a proprietária pode ligar (como no sistema real, qualquer um pode; aqui basta um).
let fatoresDemo: { id: string; factor_type: string; status: string; friendly_name: string; created_at: string; updated_at: string }[] = []
function sessaoPara(email: string, aal: 'aal1' | 'aal2' = 'aal1') {
  const id = /assist/i.test(email) ? ASSISTENTE : PROPRIETARIA
  usuario = aal === 'aal2' || fatoresDemo.every((f) => f.status !== 'verified') ? id : null // com duas etapas ligadas, só abre depois do código
  const exp = Math.floor(Date.now() / 1000) + 3600 * 12
  const user = { id, aud: 'authenticated', role: 'authenticated', email, app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-10-01T00:00:00Z', factors: fatoresDemo }
  const access_token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: id, exp, role: 'authenticated', aud: 'authenticated', email, aal, amr: [{ method: 'password', timestamp: exp - 3600 }] })}.demo`
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
    if (rota === 'user') return ultimaSessao ? json({ ...ultimaSessao.user, factors: fatoresDemo }) : json({ msg: 'not logged in' }, 401)
    if (rota === 'factors' && metodo === 'POST') {
      const f = { id: crypto.randomUUID(), factor_type: 'totp', status: 'unverified', friendly_name: String(corpo.friendly_name ?? 'Celular'), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      fatoresDemo.push(f)
      // O Supabase devolve o SVG puro; o supabase-js põe o "data:image/svg+xml" na frente.
      const qr = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21"><rect width="21" height="21" fill="#fff"/><path d="M1 1h7v7H1zM13 1h7v7h-7zM1 13h7v7H1zM10 10h2v2h-2zM14 12h3v3h-3zM9 15h2v4H9zM17 17h3v3h-3z" fill="#3b2130"/></svg>'
      return json({ id: f.id, type: 'totp', friendly_name: f.friendly_name, totp: { qr_code: qr, secret: 'DEMO5ECRETKEY2345', uri: 'otpauth://totp/demo' } })
    }
    const mf = rota.match(/^factors\/([\w-]+)(?:\/(challenge|verify))?$/)
    if (mf) {
      const f = fatoresDemo.find((x) => x.id === mf[1])
      if (!f) return json({ code: 404, msg: 'Fator não encontrado' }, 404)
      if (mf[2] === 'challenge') return json({ id: crypto.randomUUID(), type: 'totp', expires_at: Math.floor(Date.now() / 1000) + 300 })
      if (mf[2] === 'verify') {
        if (String(corpo.code) !== '123456') return json({ code: 400, error_code: 'mfa_verification_failed', msg: 'Invalid TOTP code entered' }, 400)
        f.status = 'verified'
        ultimaSessao = sessaoPara(String(ultimaSessao?.user.email ?? 'aline@demo.com'), 'aal2')
        return json(ultimaSessao)
      }
      if (metodo === 'DELETE') { fatoresDemo = fatoresDemo.filter((x) => x.id !== f.id); ultimaSessao = ultimaSessao ? sessaoPara(String(ultimaSessao.user.email), 'aal1') : null; return json({ id: f.id }) }
    }
    if (rota === 'logout') { usuario = null; ultimaSessao = null; return new Response(null, { status: 204 }) }
    if (rota === 'recover') return json({})
    return json({})
  }

  // Edge Function google-agenda simulada: na prévia, o Google aparece como ligado, com uma agenda pessoal de exemplo.
  if (url.pathname === '/functions/v1/google-agenda') {
    if (!usuario) return json({ erro: 'Entre no sistema de novo.' }, 401)
    const acao = corpo.acao
    if (acao === 'status') return json({ conectado: googleLigado, email: ehProp() && googleLigado ? 'aline.antunes@gmail.com' : null, erro: null })
    if (acao === 'conectar') { googleLigado = true; return json({ url: '' }) }
    if (acao === 'desconectar') { googleLigado = false; return json({ conectado: false }) }
    if (acao === 'sincronizar' || acao === 'sincronizar_tudo') return json({ conectado: googleLigado, eventos: 4, compromissos: 4 })
    if (acao === 'listar') {
      if (!ehProp() || !googleLigado) return json({ conectado: googleLigado, itens: [] })
      const g = (id: string, titulo: string, inicio: string, fim: string, dia_inteiro = false) => ({ id, titulo, inicio, fim, dia_inteiro, local: null })
      return json({ conectado: true, itens: [
        g('p1', 'Dentista', '2026-11-04T10:00:00-03:00', '2026-11-04T11:00:00-03:00'),
        g('p2', 'Aniversário da Bia (sobrinha)', '2026-11-14', '2026-11-15', true),
        g('p3', 'Pilates', '2026-11-05T07:00:00-03:00', '2026-11-05T08:00:00-03:00'),
        g('p4', 'Pilates', '2026-11-12T07:00:00-03:00', '2026-11-12T08:00:00-03:00'),
        g('p5', 'Almoço com a família', '2026-11-01T12:30:00-03:00', '2026-11-01T14:30:00-03:00'),
      ].filter((i) => i.inicio.slice(0, 10) >= String(corpo.de) && i.inicio.slice(0, 10) <= String(corpo.ate)) })
    }
    return json({ erro: 'Ação desconhecida.' }, 400)
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
      if (nome === 'eventos_itens') for (const l of alvo) sincronizarEm(T, String(l.evento_id))
      return new Response(null, { status: 204 })
    }
    return json({}, 405)
  } catch (e) {
    const err = e instanceof ErroBanco ? e : new ErroBanco('XX000', 'erro interno', 500)
    return json({ code: err.code, message: err.message, details: null, hint: null }, err.status)
  }
}

