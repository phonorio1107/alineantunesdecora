// Confere um projeto Supabase de verdade (testes ou produção): o banco responde, a segurança está de pé e o login funciona.
// Uso (as variáveis vêm do seu .env.local ou do terminal; a senha nunca vai para o repositório):
//   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... node scripts/verificar-supabase.mjs
//   (opcional) TESTE_EMAIL=... TESTE_SENHA=... para conferir também o login e o perfil
const url = process.env.VITE_SUPABASE_URL
const chave = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !chave) { console.error('Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'); process.exit(2) }

let falhas = 0
const ok = (t) => console.log('ok     ', t)
const falha = (t) => { falhas++; console.log('FALHOU ', t) }
const api = (caminho, init = {}, token) => fetch(`${url}${caminho}`, { ...init, headers: { apikey: chave, Authorization: `Bearer ${token ?? chave}`, 'Content-Type': 'application/json', ...init.headers } })

// 1. Sem login, nenhuma tabela entrega dados
for (const t of ['empresas', 'usuarios_empresas', 'clientes', 'clientes_documentos', 'eventos', 'lancamentos', 'contas', 'contratos', 'saldos_contas', 'resultado_eventos']) {
  const r = await api(`/rest/v1/${t}?select=*&limit=1`)
  const corpo = await r.text()
  const vazio = r.ok ? corpo.trim() === '[]' : [401, 403].includes(r.status)
  vazio ? ok(`visitante sem login não lê ${t} (HTTP ${r.status})`) : falha(`visitante leu ${t}: HTTP ${r.status}`)
}
// 2. Visitante não escreve
const w = await api('/rest/v1/clientes', { method: 'POST', body: JSON.stringify({ nome: 'Intruso' }) })
;[401, 403].includes(w.status) ? ok(`visitante não cria cliente (HTTP ${w.status})`) : falha(`visitante conseguiu escrever: HTTP ${w.status}`)
// 3. Funções não executam sem login
const f = await api('/rest/v1/rpc/gerar_recorrencias', { method: 'POST', body: JSON.stringify({ p_empresa: '00000000-0000-0000-0000-000000000000', p_ate: '2026-12-31' }) })
;[401, 403, 404].includes(f.status) ? ok(`visitante não executa funções (HTTP ${f.status})`) : falha(`função executou sem login: HTTP ${f.status}`)

// 4. Login e perfil (só se TESTE_EMAIL e TESTE_SENHA estiverem definidos)
if (process.env.TESTE_EMAIL && process.env.TESTE_SENHA) {
  const l = await api('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: process.env.TESTE_EMAIL, password: process.env.TESTE_SENHA }) })
  const s = await l.json()
  if (!l.ok || !s.access_token) falha(`login recusado (HTTP ${l.status})`)
  else {
    ok('login aceito')
    const v = await (await api(`/rest/v1/usuarios_empresas?select=papel,empresas(nome)&usuario_id=eq.${s.user.id}`, {}, s.access_token)).json()
    v.length === 1 ? ok(`perfil carregado: ${v[0].papel} em ${v[0].empresas?.nome}`) : falha(`perfil: esperado 1 vínculo, veio ${v.length}`)
    const c = await (await api('/rest/v1/categorias?select=nome', {}, s.access_token)).json()
    c.length >= 15 ? ok(`${c.length} categorias padrão visíveis`) : falha(`categorias: esperado 15 ou mais, vieram ${c.length}`)
    const sd = await (await api('/rest/v1/saldos_contas?select=nome,saldo', {}, s.access_token)).json()
    Array.isArray(sd) && sd.length >= 1 ? ok(`conta(s) encontrada(s): ${sd.map((x) => x.nome).join(', ')}`) : falha('nenhuma conta encontrada')
  }
} else console.log('pulou  login (defina TESTE_EMAIL e TESTE_SENHA para conferir também o login)')

console.log(falhas ? `\n${falhas} verificação(ões) falharam.` : '\nTudo certo.')
process.exit(falhas ? 1 : 0)
