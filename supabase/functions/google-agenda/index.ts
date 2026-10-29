// Edge Function "google-agenda": liga o sistema ao Google Agenda da proprietária.
//
// - O sistema escreve numa agenda própria dentro do Google dela ("Aline Antunes Decora"): festas, entregas,
//   devoluções e compromissos. Mudou ou apagou no sistema, muda ou some no Google.
// - A agenda pessoal dela (a principal) só é lida, para aparecer na Agenda do sistema. Nada dela fica guardado.
// - O token do Google fica cifrado (AES-GCM) na tabela google_contas, que só esta função lê (chave de serviço).
//
// Arquivo único, sem imports: dá para colar no editor de Edge Functions do painel do Supabase.
// Segredos (Edge Functions → Secrets): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_TOKEN_KEY (32 bytes em base64),
// APP_URL (endereço do sistema). SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY o Supabase já fornece.
// Na função, desligue "Verify JWT": o Google volta para cá sem login; as outras ações conferem o login aqui dentro.
// Passo a passo: docs/google-agenda.md

export interface Ambiente {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_TOKEN_KEY: string
  APP_URL: string
  NOME_AGENDA?: string
}

type Fetch = typeof fetch
type Json = Record<string, unknown>

const FUSO = 'America/Sao_Paulo'
const ESCOPOS = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.app.created', // criar a agenda do sistema e mexer só nela
  'https://www.googleapis.com/auth/calendar.events.readonly', // ler a agenda pessoal, sem alterar
]
const GOOGLE_API = 'https://www.googleapis.com/calendar/v3'

// ---------------------------------------------------------------------------
// Utilidades: base64, cifra do token e assinatura do "state"
// ---------------------------------------------------------------------------
const paraB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const paraB64url = (bytes: Uint8Array) => paraB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const deB64url = (s: string) => deB64(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4))
const texto = new TextEncoder()

async function chaves(segredo: string) {
  const bruto = deB64(segredo)
  if (bruto.length !== 32) throw new Error('GOOGLE_TOKEN_KEY precisa ter 32 bytes em base64.')
  const cifra = await crypto.subtle.importKey('raw', bruto, 'AES-GCM', false, ['encrypt', 'decrypt'])
  // Chave de assinatura derivada, para não usar a mesma chave em dois algoritmos.
  const derivada = new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array([...texto.encode('state:'), ...bruto])))
  const assina = await crypto.subtle.importKey('raw', derivada, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
  return { cifra, assina }
}

export async function cifrar(segredo: string, valor: string) {
  const { cifra } = await chaves(segredo)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const dados = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cifra, texto.encode(valor)))
  return paraB64(new Uint8Array([...iv, ...dados]))
}

export async function decifrar(segredo: string, guardado: string) {
  const { cifra } = await chaves(segredo)
  const bytes = deB64(guardado)
  const claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, cifra, bytes.slice(12))
  return new TextDecoder().decode(claro)
}

export async function assinarEstado(segredo: string, dados: { e: string; u: string }, validadeSeg = 600) {
  const { assina } = await chaves(segredo)
  const corpo = paraB64url(texto.encode(JSON.stringify({ ...dados, x: Math.floor(Date.now() / 1000) + validadeSeg })))
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', assina, texto.encode(corpo)))
  return `${corpo}.${paraB64url(sig)}`
}

export async function lerEstado(segredo: string, estado: string): Promise<{ e: string; u: string } | null> {
  const [corpo, sig] = estado.split('.')
  if (!corpo || !sig) return null
  const { assina } = await chaves(segredo)
  try {
    const ok = await crypto.subtle.verify('HMAC', assina, deB64url(sig), texto.encode(corpo))
    if (!ok) return null
    const d = JSON.parse(new TextDecoder().decode(deB64url(corpo))) as { e: string; u: string; x: number }
    if (typeof d.x !== 'number' || d.x < Math.floor(Date.now() / 1000)) return null
    return { e: d.e, u: d.u }
  } catch {
    return null // state malformado
  }
}

// ---------------------------------------------------------------------------
// Conversão: item do sistema → evento do Google
// ---------------------------------------------------------------------------
const proximoDia = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}
/** Data local de São Paulo (AAAA-MM-DD) de um instante. */
export const dataLocal = (instante: string) => new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(instante))
const somarHora = (instante: string, horas: number) => new Date(new Date(instante).getTime() + horas * 3_600_000).toISOString()

export type Origem = 'compromisso' | 'evento' | 'entrega' | 'devolucao'
export interface ItemGoogle { origem: Origem; origemId: string; corpo: Json }

const marca = (origem: Origem, id: string) => ({ extendedProperties: { private: { sistema: 'aline-antunes-decora', origem, origem_id: id } } })

export function itensDoEvento(ev: Json, clienteNome: string | null, appUrl: string): ItemGoogle[] {
  const id = String(ev.id)
  const titulo = String(ev.titulo)
  const local = [ev.local_nome, ev.local_endereco, ev.cidade].filter(Boolean).join(' · ') || undefined
  const link = `${appUrl.replace(/\/$/, '')}/eventos/${id}`
  const descricao = [clienteNome ? `Cliente: ${clienteNome}` : null, `Abrir no sistema: ${link}`].filter(Boolean).join('\n')
  const itens: ItemGoogle[] = [{
    origem: 'evento',
    origemId: id,
    corpo: { summary: titulo, location: local, description: descricao, start: { date: ev.data_evento }, end: { date: proximoDia(String(ev.data_evento)) }, transparency: 'transparent', ...marca('evento', id) },
  }]
  if (ev.entrega_em) {
    itens.push({ origem: 'entrega', origemId: id, corpo: { summary: `Entrega · ${titulo}`, location: local, description: descricao, start: { dateTime: ev.entrega_em, timeZone: FUSO }, end: { dateTime: somarHora(String(ev.entrega_em), 1), timeZone: FUSO }, ...marca('entrega', id) } })
  }
  if (ev.devolucao_em) {
    itens.push({ origem: 'devolucao', origemId: id, corpo: { summary: `Devolução · ${titulo}`, location: local, description: descricao, start: { dateTime: ev.devolucao_em, timeZone: FUSO }, end: { dateTime: somarHora(String(ev.devolucao_em), 1), timeZone: FUSO }, ...marca('devolucao', id) } })
  }
  return itens
}

export function itemDoCompromisso(c: Json, appUrl: string): ItemGoogle {
  const id = String(c.id)
  const quando = c.dia_inteiro
    ? { start: { date: dataLocal(String(c.inicio)) }, end: { date: proximoDia(dataLocal(String(c.fim))) } }
    : { start: { dateTime: c.inicio, timeZone: FUSO }, end: { dateTime: c.fim, timeZone: FUSO } }
  const descricao = [c.notas, `Abrir no sistema: ${appUrl.replace(/\/$/, '')}/agenda`].filter(Boolean).join('\n\n')
  return { origem: 'compromisso', origemId: id, corpo: { summary: c.titulo, location: c.local ?? undefined, description: descricao, ...quando, ...marca('compromisso', id) } }
}

// ---------------------------------------------------------------------------
// A função
// ---------------------------------------------------------------------------
class Falha extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export function criarFuncao(env: Ambiente, f: Fetch = fetch) {
  const supa = env.SUPABASE_URL.replace(/\/$/, '')
  const retorno = `${supa}/functions/v1/google-agenda`
  const app = env.APP_URL.replace(/\/$/, '')
  const nomeAgenda = env.NOME_AGENDA || 'Aline Antunes Decora'
  const cors = {
    'Access-Control-Allow-Origin': app,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
  const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  // Banco: como o usuário (a RLS decide o que ele vê) ou como serviço (só para google_contas e google_vinculos).
  const cabServico = (): Record<string, string> => {
    const k = env.SUPABASE_SERVICE_ROLE_KEY
    return k.split('.').length === 3 ? { apikey: k, Authorization: `Bearer ${k}` } : { apikey: k }
  }
  const rest = async (caminho: string, init: RequestInit & { comoUsuario?: string } = {}) => {
    const cab: Record<string, string> = init.comoUsuario
      ? { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${init.comoUsuario}` }
      : cabServico()
    const r = await f(`${supa}/rest/v1/${caminho}`, { ...init, headers: { 'Content-Type': 'application/json', ...cab, ...(init.headers as Record<string, string> | undefined) } })
    if (!r.ok) throw new Falha(502, `Banco respondeu ${r.status} em ${caminho.split('?')[0]}`)
    const corpo = await r.text() // escrita sem "return=representation" volta sem corpo
    return corpo ? JSON.parse(corpo) : null
  }

  async function contexto(req: Request) {
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!jwt) throw new Falha(401, 'Entre no sistema de novo.')
    const u = await f(`${supa}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${jwt}` } })
    if (!u.ok) throw new Falha(401, 'Entre no sistema de novo.')
    const usuario = (await u.json()) as { id: string }
    const v = (await rest(`usuarios_empresas?select=empresa_id,papel&usuario_id=eq.${usuario.id}&excluido_em=is.null&order=criado_em&limit=1`, { comoUsuario: jwt })) as { empresa_id: string; papel: string }[]
    if (!v.length) throw new Falha(403, 'Sem acesso a nenhuma empresa.')
    return { jwt, usuarioId: usuario.id, empresaId: v[0].empresa_id, papel: v[0].papel }
  }

  const contaGoogle = async (empresaId: string) =>
    ((await rest(`google_contas?empresa_id=eq.${empresaId}&select=*`)) as Json[])[0] ?? null

  async function registrarErro(empresaId: string, msg: string | null) {
    await rest(`google_contas?empresa_id=eq.${empresaId}`, { method: 'PATCH', body: JSON.stringify({ ultimo_erro: msg, ultimo_erro_em: msg ? new Date().toISOString() : null }) })
  }

  async function tokenAcesso(empresaId: string, conta: Json) {
    const refresh = await decifrar(env.GOOGLE_TOKEN_KEY, String(conta.token_cifrado))
    const r = await f('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: refresh, grant_type: 'refresh_token' }),
    })
    const j = (await r.json()) as Json
    if (!r.ok) {
      const msg = j.error === 'invalid_grant' ? 'A ligação com o Google expirou ou foi removida. Conecte de novo na Agenda.' : 'O Google recusou a renovação do acesso.'
      await registrarErro(empresaId, msg)
      throw new Falha(409, msg)
    }
    return String(j.access_token)
  }

  const google = async (token: string, caminho: string, init: RequestInit = {}) => {
    const r = await f(caminho.startsWith('http') ? caminho : `${GOOGLE_API}${caminho}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) } })
    return r
  }

  // Cria ou atualiza no Google; guarda o vínculo. Se o evento do Google sumiu, cria de novo.
  async function gravar(empresaId: string, token: string, calendario: string, item: ItemGoogle) {
    const vinc = ((await rest(`google_vinculos?empresa_id=eq.${empresaId}&origem=eq.${item.origem}&origem_id=eq.${item.origemId}&select=google_evento_id`)) as Json[])[0]
    const base = `/calendars/${encodeURIComponent(calendario)}/events`
    if (vinc) {
      const r = await google(token, `${base}/${encodeURIComponent(String(vinc.google_evento_id))}`, { method: 'PUT', body: JSON.stringify(item.corpo) })
      if (r.ok) return 'atualizado'
      if (r.status !== 404 && r.status !== 410) throw new Falha(502, `Google respondeu ${r.status} ao atualizar.`)
    }
    const r = await google(token, base, { method: 'POST', body: JSON.stringify(item.corpo) })
    if (!r.ok) throw new Falha(502, `Google respondeu ${r.status} ao criar.`)
    const novo = (await r.json()) as Json
    await rest('google_vinculos?on_conflict=empresa_id,origem,origem_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ empresa_id: empresaId, origem: item.origem, origem_id: item.origemId, google_evento_id: novo.id, atualizado_em: new Date().toISOString() }),
    })
    return 'criado'
  }

  async function apagar(empresaId: string, token: string, calendario: string, origem: Origem, origemId: string) {
    const vinc = ((await rest(`google_vinculos?empresa_id=eq.${empresaId}&origem=eq.${origem}&origem_id=eq.${origemId}&select=google_evento_id`)) as Json[])[0]
    if (!vinc) return false
    const r = await google(token, `/calendars/${encodeURIComponent(calendario)}/events/${encodeURIComponent(String(vinc.google_evento_id))}`, { method: 'DELETE' })
    if (!r.ok && r.status !== 404 && r.status !== 410) throw new Falha(502, `Google respondeu ${r.status} ao apagar.`)
    await rest(`google_vinculos?empresa_id=eq.${empresaId}&origem=eq.${origem}&origem_id=eq.${origemId}`, { method: 'DELETE' })
    return true
  }

  async function sincronizarEvento(ctx: { jwt: string; empresaId: string }, token: string, cal: string, id: string) {
    const ev = ((await rest(`eventos?id=eq.${id}&select=*`, { comoUsuario: ctx.jwt })) as Json[])[0]
    const origens: Origem[] = ['evento', 'entrega', 'devolucao']
    if (!ev || ev.excluido_em || ev.status === 'cancelado') {
      for (const o of origens) await apagar(ctx.empresaId, token, cal, o, id)
      return { apagados: 1 }
    }
    const cli = ev.cliente_id ? ((await rest(`clientes?id=eq.${ev.cliente_id}&select=nome`, { comoUsuario: ctx.jwt })) as Json[])[0] : null
    const itens = itensDoEvento(ev, cli ? String(cli.nome) : null, app)
    for (const it of itens) await gravar(ctx.empresaId, token, cal, it)
    for (const o of origens) if (!itens.some((i) => i.origem === o)) await apagar(ctx.empresaId, token, cal, o, id)
    return { gravados: itens.length }
  }

  async function sincronizarCompromisso(ctx: { jwt: string; empresaId: string }, token: string, cal: string, id: string) {
    const c = ((await rest(`compromissos?id=eq.${id}&select=*`, { comoUsuario: ctx.jwt })) as Json[])[0]
    if (!c || c.excluido_em) {
      await apagar(ctx.empresaId, token, cal, 'compromisso', id)
      return { apagados: 1 }
    }
    await gravar(ctx.empresaId, token, cal, itemDoCompromisso(c, app))
    return { gravados: 1 }
  }

  async function prontoParaSincronizar(empresaId: string) {
    const conta = await contaGoogle(empresaId)
    if (!conta || !conta.calendario_id) return null
    return { token: await tokenAcesso(empresaId, conta), cal: String(conta.calendario_id) }
  }

  async function sincronizarTudo(ctx: { jwt: string; empresaId: string }, token: string, cal: string) {
    const desde = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
    const eventos = (await rest(`eventos?empresa_id=eq.${ctx.empresaId}&data_evento=gte.${desde}&excluido_em=is.null&select=id`, { comoUsuario: ctx.jwt })) as Json[]
    const comps = (await rest(`compromissos?empresa_id=eq.${ctx.empresaId}&inicio=gte.${desde}&excluido_em=is.null&select=id`, { comoUsuario: ctx.jwt })) as Json[]
    for (const e of eventos) await sincronizarEvento(ctx, token, cal, String(e.id))
    for (const c of comps) await sincronizarCompromisso(ctx, token, cal, String(c.id))
    return { eventos: eventos.length, compromissos: comps.length }
  }

  // Volta do Google depois de ela autorizar.
  async function retornoDoGoogle(url: URL) {
    const ir = (status: string, motivo?: string) =>
      new Response(null, { status: 302, headers: { Location: `${app}/agenda?google=${status}${motivo ? `&motivo=${encodeURIComponent(motivo)}` : ''}` } })
    if (url.searchParams.get('error')) return ir('cancelado')
    const estado = await lerEstado(env.GOOGLE_TOKEN_KEY, url.searchParams.get('state') ?? '')
    if (!estado) return ir('erro', 'O pedido expirou. Tente conectar de novo.')
    const r = await f('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: url.searchParams.get('code') ?? '', client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: retorno, grant_type: 'authorization_code' }),
    })
    const tok = (await r.json()) as Json
    if (!r.ok || !tok.refresh_token) return ir('erro', 'O Google não liberou o acesso. Tente de novo e marque todas as permissões.')
    const escopo = String(tok.scope ?? '')
    if (!escopo.includes('calendar.app.created') || !escopo.includes('calendar.events.readonly')) return ir('erro', 'Faltou marcar as permissões da agenda. Tente de novo e marque todas.')
    let email: string | null = null
    try {
      email = JSON.parse(new TextDecoder().decode(deB64url(String(tok.id_token).split('.')[1]))).email ?? null
    } catch { /* sem e-mail: segue */ }
    const acesso = String(tok.access_token)
    const anterior = await contaGoogle(estado.e)
    let calendario = anterior?.calendario_id ? String(anterior.calendario_id) : null
    if (calendario && !(await google(acesso, `/calendars/${encodeURIComponent(calendario)}`)).ok) calendario = null
    if (!calendario) {
      const c = await google(acesso, '/calendars', { method: 'POST', body: JSON.stringify({ summary: nomeAgenda, description: 'Festas, entregas, devoluções e compromissos do sistema. Edite pelo sistema: mudanças feitas aqui podem ser substituídas.', timeZone: FUSO }) })
      if (!c.ok) return ir('erro', 'Não foi possível criar a agenda no Google.')
      calendario = String(((await c.json()) as Json).id)
    }
    await rest('google_contas?on_conflict=empresa_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ empresa_id: estado.e, usuario_id: estado.u, email, token_cifrado: await cifrar(env.GOOGLE_TOKEN_KEY, String(tok.refresh_token)), calendario_id: calendario, conectado_em: new Date().toISOString(), ultimo_erro: null, ultimo_erro_em: null }),
    })
    return ir('conectado')
  }

  return async function (req: Request): Promise<Response> {
    const url = new URL(req.url)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    try {
      if (req.method === 'GET' && (url.searchParams.has('code') || url.searchParams.has('error'))) return await retornoDoGoogle(url)
      if (req.method !== 'POST') return resposta({ erro: 'Método não aceito.' }, 405)
      const corpo = (await req.json().catch(() => ({}))) as Json
      const ctx = await contexto(req)
      const dona = ctx.papel === 'proprietaria'
      const podeEditar = dona || ctx.papel === 'assistente'

      switch (corpo.acao) {
        case 'status': {
          const conta = await contaGoogle(ctx.empresaId)
          return resposta({ conectado: !!conta, email: dona ? conta?.email ?? null : null, erro: conta?.ultimo_erro ?? null })
        }
        case 'conectar': {
          if (!dona) throw new Falha(403, 'Só a proprietária conecta o Google.')
          const state = await assinarEstado(env.GOOGLE_TOKEN_KEY, { e: ctx.empresaId, u: ctx.usuarioId })
          const p = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: retorno, response_type: 'code', scope: ESCOPOS.join(' '), access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state })
          return resposta({ url: `https://accounts.google.com/o/oauth2/v2/auth?${p}` })
        }
        case 'desconectar': {
          if (!dona) throw new Falha(403, 'Só a proprietária desconecta o Google.')
          const conta = await contaGoogle(ctx.empresaId)
          if (conta) {
            const refresh = await decifrar(env.GOOGLE_TOKEN_KEY, String(conta.token_cifrado)).catch(() => null)
            if (refresh) await f('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: refresh }) }).catch(() => null)
            await rest(`google_vinculos?empresa_id=eq.${ctx.empresaId}`, { method: 'DELETE' })
            await rest(`google_contas?empresa_id=eq.${ctx.empresaId}`, { method: 'DELETE' })
          }
          return resposta({ conectado: false })
        }
        case 'sincronizar': {
          if (!podeEditar) throw new Falha(403, 'Sem permissão.')
          const id = String(corpo.id ?? '')
          if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Falha(400, 'Item inválido.')
          const pronto = await prontoParaSincronizar(ctx.empresaId)
          if (!pronto) return resposta({ conectado: false })
          const r = corpo.origem === 'evento'
            ? await sincronizarEvento(ctx, pronto.token, pronto.cal, id)
            : await sincronizarCompromisso(ctx, pronto.token, pronto.cal, id)
          await registrarErro(ctx.empresaId, null)
          return resposta({ conectado: true, ...r })
        }
        case 'sincronizar_tudo': {
          if (!podeEditar) throw new Falha(403, 'Sem permissão.')
          const pronto = await prontoParaSincronizar(ctx.empresaId)
          if (!pronto) return resposta({ conectado: false })
          const r = await sincronizarTudo(ctx, pronto.token, pronto.cal)
          await registrarErro(ctx.empresaId, null)
          return resposta({ conectado: true, ...r })
        }
        case 'listar': {
          // A agenda pessoal é da proprietária: a equipe não vê.
          if (!dona) return resposta({ conectado: false, itens: [] })
          const de = String(corpo.de ?? ''), ate = String(corpo.ate ?? '')
          if (!/^\d{4}-\d{2}-\d{2}$/.test(de) || !/^\d{4}-\d{2}-\d{2}$/.test(ate)) throw new Falha(400, 'Período inválido.')
          const conta = await contaGoogle(ctx.empresaId)
          if (!conta) return resposta({ conectado: false, itens: [] })
          const token = await tokenAcesso(ctx.empresaId, conta)
          const p = new URLSearchParams({ timeMin: `${de}T00:00:00-03:00`, timeMax: `${ate}T23:59:59-03:00`, singleEvents: 'true', orderBy: 'startTime', maxResults: '250', timeZone: FUSO })
          const r = await google(token, `/calendars/primary/events?${p}`)
          if (!r.ok) throw new Falha(502, `Google respondeu ${r.status} ao ler a agenda.`)
          const lista = ((await r.json()) as { items?: Json[] }).items ?? []
          const itens = lista
            .filter((e) => e.status !== 'cancelled')
            .map((e) => {
              const ini = e.start as Json, fim = e.end as Json
              return { id: e.id, titulo: e.summary ?? '(sem título)', inicio: ini.dateTime ?? ini.date, fim: fim.dateTime ?? fim.date, dia_inteiro: !ini.dateTime, local: e.location ?? null }
            })
          return resposta({ conectado: true, itens })
        }
        default:
          throw new Falha(400, 'Ação desconhecida.')
      }
    } catch (e) {
      if (e instanceof Falha) return resposta({ erro: e.message }, e.status)
      console.error('google-agenda', e instanceof Error ? e.name : 'erro')
      return resposta({ erro: 'Erro inesperado na ligação com o Google.' }, 500)
    }
  }
}

// Ponto de entrada no Supabase (Deno). Fora dele (testes), nada roda sozinho.
const D = (globalThis as unknown as { Deno?: { env: { get(k: string): string | undefined }; serve(h: (r: Request) => Promise<Response>): void } }).Deno
if (D) {
  const ler = (k: string) => D.env.get(k) ?? ''
  D.serve(criarFuncao({
    SUPABASE_URL: ler('SUPABASE_URL'),
    SUPABASE_ANON_KEY: ler('SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: ler('SUPABASE_SERVICE_ROLE_KEY'),
    GOOGLE_CLIENT_ID: ler('GOOGLE_CLIENT_ID'),
    GOOGLE_CLIENT_SECRET: ler('GOOGLE_CLIENT_SECRET'),
    GOOGLE_TOKEN_KEY: ler('GOOGLE_TOKEN_KEY'),
    APP_URL: ler('APP_URL'),
    NOME_AGENDA: ler('NOME_AGENDA'),
  }))
}
