// Testes da Edge Function google-agenda com o Supabase e o Google simulados (nada sai para a internet).
import { beforeEach, describe, expect, it } from 'vitest'
import { assinarEstado, cifrar, criarFuncao, decifrar, itemDoCompromisso, itensDoEvento, lerEstado, type Ambiente } from './index'

const CHAVE = btoa(String.fromCharCode(...new Uint8Array(32).map((_, i) => i * 7 + 3)))
const env: Ambiente = {
  SUPABASE_URL: 'https://proj.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_servico',
  GOOGLE_CLIENT_ID: 'cliente', GOOGLE_CLIENT_SECRET: 'segredo', GOOGLE_TOKEN_KEY: CHAVE, APP_URL: 'https://app.exemplo.com',
}
const EMPRESA = 'eeeeeeee-0000-0000-0000-00000000000a'
const EVENTO = 'dddddddd-0000-0000-0000-00000000000a'
const COMP = 'c0c0c0c0-0000-0000-0000-00000000000a'

type Linha = Record<string, unknown>
let db: Record<string, Linha[]>
let google: { eventos: Map<string, Linha>; seq: number; revogados: string[]; refreshValido: boolean; agendas: string[] }

function filtrar(linhas: Linha[], q: URLSearchParams) {
  return linhas.filter((l) => [...q].every(([k, v]) => {
    if (['select', 'order', 'limit', 'on_conflict'].includes(k)) return true
    const [op, ...r] = v.split('.'); const val = r.join('.')
    if (op === 'eq') return String(l[k]) === val
    if (op === 'gte') return String(l[k]) >= val
    if (op === 'is') return val === 'null' ? l[k] == null : true
    return true
  }))
}

// Usuários: jwt-prop (proprietária), jwt-assist (assistente).
const USUARIOS: Record<string, { id: string; papel: string }> = { 'jwt-prop': { id: 'u1', papel: 'proprietaria' }, 'jwt-assist': { id: 'u2', papel: 'assistente' } }

const falso: typeof fetch = async (entrada, init = {}) => {
  const url = new URL(String(entrada))
  const metodo = (init.method ?? 'GET').toUpperCase()
  const cab = new Headers(init.headers)
  const json = (c: unknown, s = 200) => new Response(c === null ? null : JSON.stringify(c), { status: s })
  if (url.host === 'proj.supabase.co' && url.pathname === '/auth/v1/user') {
    const u = USUARIOS[(cab.get('Authorization') ?? '').replace('Bearer ', '')]
    return u ? json({ id: u.id }) : json({}, 401)
  }
  if (url.host === 'proj.supabase.co' && url.pathname.startsWith('/rest/v1/')) {
    const tabela = url.pathname.slice('/rest/v1/'.length)
    const servico = cab.get('apikey') === env.SUPABASE_SERVICE_ROLE_KEY
    if (!servico && tabela.startsWith('google_')) return json({ message: 'permission denied' }, 401) // sem grant para authenticated
    let linhas = db[tabela] ?? []
    if (!servico) linhas = linhas.filter((l) => tabela === 'usuarios_empresas' || l.empresa_id === EMPRESA) // RLS simplificada
    if (metodo === 'GET') return json(filtrar(linhas, url.searchParams))
    if (metodo === 'POST') {
      const novo = JSON.parse(String(init.body)) as Linha
      const chaves = (url.searchParams.get('on_conflict') ?? '').split(',').filter(Boolean)
      const i = db[tabela].findIndex((l) => chaves.length && chaves.every((k) => l[k] === novo[k]))
      if (i >= 0) db[tabela][i] = { ...db[tabela][i], ...novo }; else db[tabela].push(novo)
      return json(null, 201)
    }
    if (metodo === 'PATCH') { for (const l of filtrar(db[tabela], url.searchParams)) Object.assign(l, JSON.parse(String(init.body))); return json(null, 204) }
    if (metodo === 'DELETE') { const fora = new Set(filtrar(db[tabela], url.searchParams)); db[tabela] = db[tabela].filter((l) => !fora.has(l)); return json(null, 204) }
  }
  if (url.host === 'oauth2.googleapis.com' && url.pathname === '/token') {
    const p = new URLSearchParams(String(init.body))
    if (p.get('grant_type') === 'authorization_code') {
      const idToken = ['x', btoa(JSON.stringify({ email: 'aline@gmail.com' })), 'y'].join('.')
      return json({ access_token: 'acesso', refresh_token: 'refresh-secreto', id_token: idToken, scope: 'openid email https://www.googleapis.com/auth/calendar.app.created https://www.googleapis.com/auth/calendar.events.readonly' })
    }
    return google.refreshValido && p.get('refresh_token') === 'refresh-secreto' ? json({ access_token: 'acesso' }) : json({ error: 'invalid_grant' }, 400)
  }
  if (url.host === 'oauth2.googleapis.com' && url.pathname === '/revoke') { google.revogados.push(new URLSearchParams(String(init.body)).get('token') ?? ''); return json({}) }
  if (url.host === 'www.googleapis.com') {
    if (cab.get('Authorization') !== 'Bearer acesso') return json({}, 401)
    const p = url.pathname.replace('/calendar/v3', '')
    if (p === '/calendars' && metodo === 'POST') { google.agendas.push('cal-sistema'); return json({ id: 'cal-sistema' }) }
    if (/^\/calendars\/[^/]+$/.test(p)) return json({ id: 'cal-sistema' }, google.agendas.length ? 200 : 404)
    if (p === '/calendars/primary/events') return json({ items: [
      { id: 'p1', summary: 'Dentista', start: { dateTime: '2026-11-03T10:00:00-03:00' }, end: { dateTime: '2026-11-03T11:00:00-03:00' }, status: 'confirmed' },
      { id: 'p2', summary: 'Cancelado', start: { date: '2026-11-04' }, end: { date: '2026-11-05' }, status: 'cancelled' },
    ] })
    const m = p.match(/^\/calendars\/cal-sistema\/events(?:\/(.+))?$/)
    if (m) {
      if (metodo === 'POST') { const id = `g${++google.seq}`; google.eventos.set(id, JSON.parse(String(init.body))); return json({ id }) }
      if (metodo === 'PUT') { if (!google.eventos.has(m[1])) return json({}, 404); google.eventos.set(m[1], JSON.parse(String(init.body))); return json({ id: m[1] }) }
      if (metodo === 'DELETE') { const ok = google.eventos.delete(m[1]); return json(null, ok ? 204 : 410) }
    }
  }
  throw new Error(`fetch não simulado: ${metodo} ${url}`)
}

const funcao = criarFuncao(env, falso)
const post = (jwt: string, corpo: unknown) => funcao(new Request('https://proj.supabase.co/functions/v1/google-agenda', { method: 'POST', headers: { Authorization: `Bearer ${jwt}` }, body: JSON.stringify(corpo) }))

async function conectar() {
  const r = await (await post('jwt-prop', { acao: 'conectar' })).json() as { url: string }
  const state = new URL(r.url).searchParams.get('state')!
  return funcao(new Request(`https://proj.supabase.co/functions/v1/google-agenda?code=abc&state=${encodeURIComponent(state)}`))
}

beforeEach(() => {
  db = {
    usuarios_empresas: [{ empresa_id: EMPRESA, usuario_id: 'u1', papel: 'proprietaria', excluido_em: null }, { empresa_id: EMPRESA, usuario_id: 'u2', papel: 'assistente', excluido_em: null }],
    eventos: [{ id: EVENTO, empresa_id: EMPRESA, titulo: 'Aniversário da Laura', data_evento: '2026-11-20', cliente_id: 'cli1', status: 'confirmado', entrega_em: '2026-11-20T13:00:00Z', devolucao_em: null, local_nome: 'Salão Flor', local_endereco: null, cidade: 'Louveira', excluido_em: null }],
    clientes: [{ id: 'cli1', empresa_id: EMPRESA, nome: 'Renata Oliveira' }],
    compromissos: [{ id: COMP, empresa_id: EMPRESA, titulo: 'Visita ao salão', inicio: '2026-11-10T17:00:00Z', fim: '2026-11-10T18:00:00Z', dia_inteiro: false, local: null, notas: null, excluido_em: null }],
    google_contas: [], google_vinculos: [],
  }
  google = { eventos: new Map(), seq: 0, revogados: [], refreshValido: true, agendas: [] }
})

describe('cifra e assinatura', () => {
  it('cifra e decifra o token, com resultado diferente a cada vez', async () => {
    const a = await cifrar(CHAVE, 'refresh-secreto'), b = await cifrar(CHAVE, 'refresh-secreto')
    expect(a).not.toBe(b)
    expect(a).not.toContain('refresh')
    expect(await decifrar(CHAVE, a)).toBe('refresh-secreto')
  })
  it('state assinado: aceita o original, recusa adulterado e vencido', async () => {
    const s = await assinarEstado(CHAVE, { e: EMPRESA, u: 'u1' })
    expect(await lerEstado(CHAVE, s)).toEqual({ e: EMPRESA, u: 'u1' })
    const [corpo, sig] = s.split('.')
    const outro = btoa(JSON.stringify({ e: 'outra', u: 'u1', x: 9e9 })).replace(/=+$/, '')
    expect(await lerEstado(CHAVE, `${outro}.${sig}`)).toBeNull()
    expect(await lerEstado(CHAVE, `${corpo}.x${sig.slice(1)}`)).toBeNull()
    expect(await lerEstado(CHAVE, await assinarEstado(CHAVE, { e: EMPRESA, u: 'u1' }, -10))).toBeNull()
  })
})

describe('conversão para o Google', () => {
  it('evento vira dia inteiro, com entrega e devolução quando houver horário', () => {
    const itens = itensDoEvento({ id: 'e1', titulo: 'Festa', data_evento: '2026-12-31', entrega_em: '2026-12-31T12:00:00Z', devolucao_em: '2027-01-01T15:00:00Z', cidade: 'Jundiaí' }, 'Ana', 'https://app/')
    expect(itens.map((i) => i.origem)).toEqual(['evento', 'entrega', 'devolucao'])
    expect(itens[0].corpo.start).toEqual({ date: '2026-12-31' })
    expect(itens[0].corpo.end).toEqual({ date: '2027-01-01' })
    expect(String(itens[0].corpo.description)).toContain('Cliente: Ana')
    expect(String(itens[0].corpo.description)).not.toMatch(/\d{3}\.\d{3}/) // nada de CPF
    expect(itens[1].corpo.summary).toBe('Entrega · Festa')
  })
  it('compromisso de dia inteiro usa a data de São Paulo', () => {
    const it2 = itemDoCompromisso({ id: 'c', titulo: 'Feira de flores', inicio: '2026-11-10T02:00:00Z', fim: '2026-11-10T02:00:00Z', dia_inteiro: true }, 'https://app')
    expect(it2.corpo.start).toEqual({ date: '2026-11-09' }) // 23h do dia 9 em São Paulo
    expect(it2.corpo.end).toEqual({ date: '2026-11-10' })
  })
})

describe('função google-agenda', () => {
  it('só a proprietária conecta; a volta do Google guarda o token cifrado e cria a agenda do sistema', async () => {
    expect((await post('jwt-assist', { acao: 'conectar' })).status).toBe(403)
    const r = await (await post('jwt-prop', { acao: 'conectar' })).json() as { url: string }
    const u = new URL(r.url)
    expect(u.host).toBe('accounts.google.com')
    expect(u.searchParams.get('access_type')).toBe('offline')
    expect(u.searchParams.get('redirect_uri')).toBe('https://proj.supabase.co/functions/v1/google-agenda')
    const volta = await conectar()
    expect(volta.status).toBe(302)
    expect(volta.headers.get('Location')).toBe('https://app.exemplo.com/agenda?google=conectado')
    expect(db.google_contas).toHaveLength(1)
    expect(String(db.google_contas[0].token_cifrado)).not.toContain('refresh-secreto')
    expect(db.google_contas[0].calendario_id).toBe('cal-sistema')
    expect(db.google_contas[0].email).toBe('aline@gmail.com')
  })

  it('state falso ou cancelamento voltam para a agenda com aviso', async () => {
    const r1 = await funcao(new Request('https://proj.supabase.co/functions/v1/google-agenda?code=abc&state=falso.falso'))
    expect(r1.headers.get('Location')).toContain('google=erro')
    const r2 = await funcao(new Request('https://proj.supabase.co/functions/v1/google-agenda?error=access_denied'))
    expect(r2.headers.get('Location')).toBe('https://app.exemplo.com/agenda?google=cancelado')
    expect(db.google_contas).toHaveLength(0)
  })

  it('sem login, recusa', async () => {
    expect((await post('jwt-falso', { acao: 'status' })).status).toBe(401)
  })

  it('sem Google conectado, sincronizar não faz nada', async () => {
    expect(await (await post('jwt-prop', { acao: 'sincronizar', origem: 'evento', id: EVENTO })).json()).toEqual({ conectado: false })
  })

  it('evento: cria festa e entrega, atualiza, tira a entrega e apaga tudo ao cancelar', async () => {
    await conectar()
    await post('jwt-assist', { acao: 'sincronizar', origem: 'evento', id: EVENTO })
    expect(google.eventos.size).toBe(2)
    expect(db.google_vinculos.map((v) => v.origem).sort()).toEqual(['entrega', 'evento'])
    db.eventos[0].titulo = 'Aniversário de 5 anos da Laura'
    db.eventos[0].entrega_em = null
    await post('jwt-prop', { acao: 'sincronizar', origem: 'evento', id: EVENTO })
    expect(google.eventos.size).toBe(1)
    expect([...google.eventos.values()][0].summary).toBe('Aniversário de 5 anos da Laura')
    db.eventos[0].status = 'cancelado'
    await post('jwt-prop', { acao: 'sincronizar', origem: 'evento', id: EVENTO })
    expect(google.eventos.size).toBe(0)
    expect(db.google_vinculos).toHaveLength(0)
  })

  it('compromisso: cria, recria se apagaram no Google, e some ao excluir no sistema', async () => {
    await conectar()
    await post('jwt-prop', { acao: 'sincronizar', origem: 'compromisso', id: COMP })
    expect(google.eventos.size).toBe(1)
    google.eventos.clear() // alguém apagou direto no Google
    await post('jwt-prop', { acao: 'sincronizar', origem: 'compromisso', id: COMP })
    expect(google.eventos.size).toBe(1)
    db.compromissos[0].excluido_em = '2026-11-01T00:00:00Z'
    await post('jwt-prop', { acao: 'sincronizar', origem: 'compromisso', id: COMP })
    expect(google.eventos.size).toBe(0)
  })

  it('sincronizar tudo manda eventos e compromissos', async () => {
    await conectar()
    const r = await (await post('jwt-prop', { acao: 'sincronizar_tudo' })).json()
    expect(r).toMatchObject({ conectado: true, eventos: 1, compromissos: 1 })
    expect(google.eventos.size).toBe(3)
  })

  it('agenda pessoal: a proprietária vê (sem os cancelados); a assistente não', async () => {
    await conectar()
    const dona = await (await post('jwt-prop', { acao: 'listar', de: '2026-11-01', ate: '2026-11-30' })).json() as { itens: Linha[] }
    expect(dona.itens).toEqual([{ id: 'p1', titulo: 'Dentista', inicio: '2026-11-03T10:00:00-03:00', fim: '2026-11-03T11:00:00-03:00', dia_inteiro: false, local: null }])
    const assist = await (await post('jwt-assist', { acao: 'listar', de: '2026-11-01', ate: '2026-11-30' })).json() as { itens: Linha[] }
    expect(assist.itens).toEqual([])
  })

  it('status: e-mail só para a proprietária', async () => {
    await conectar()
    expect(await (await post('jwt-prop', { acao: 'status' })).json()).toEqual({ conectado: true, email: 'aline@gmail.com', erro: null })
    expect(await (await post('jwt-assist', { acao: 'status' })).json()).toEqual({ conectado: true, email: null, erro: null })
  })

  it('acesso revogado no Google: avisa e registra o erro', async () => {
    await conectar()
    google.refreshValido = false
    const r = await post('jwt-prop', { acao: 'sincronizar', origem: 'evento', id: EVENTO })
    expect(r.status).toBe(409)
    expect(String(db.google_contas[0].ultimo_erro)).toContain('Conecte de novo')
  })

  it('desconectar revoga no Google e apaga o token', async () => {
    await conectar()
    await post('jwt-prop', { acao: 'sincronizar_tudo' })
    expect((await post('jwt-assist', { acao: 'desconectar' })).status).toBe(403)
    await post('jwt-prop', { acao: 'desconectar' })
    expect(google.revogados).toEqual(['refresh-secreto'])
    expect(db.google_contas).toHaveLength(0)
    expect(db.google_vinculos).toHaveLength(0)
  })
})
