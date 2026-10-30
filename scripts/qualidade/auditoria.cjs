// Auditoria automática das telas (Fase 7 e Fase 10). Entra no sistema, abre cada item do menu e mede:
//   1. contraste de todo texto visível contra o fundo real (WCAG 1.4.3: 4,5:1; 3:1 para texto grande)
//   2. formatos fora do padrão brasileiro (data ISO ou americana, ponto decimal, NaN/undefined/null)
//   3. tela mais larga que o celular (rolagem lateral)
//   4. mais de um botão principal visível na tela
// Roda nos temas claro e escuro, em 1280px e 360px.
//
// Uso (com a prévia servida ou o endereço publicado):
//   URL=http://127.0.0.1:4173 EMAIL=aline@demo.com SENHA=x node scripts/qualidade/auditoria.cjs
// Opcionais: BOTAO_PRINCIPAL=.btn-p  MENU="nav.nav a"  MENU_CEL=".abas-celular a"  TEMA_ESCURO="tema=escuro" (chave=valor no localStorage)
// Sai com código 1 se encontrar qualquer problema. Não usa dados reais: rode na prévia (build:demo) ou com usuário de teste.
const { chromium } = require('playwright')

const URL_BASE = process.env.URL ?? 'http://127.0.0.1:4173'
const EMAIL = process.env.EMAIL ?? 'teste@demo.com'
const SENHA = process.env.SENHA ?? 'x'
const BOTAO = process.env.BOTAO_PRINCIPAL ?? '.btn-p'
const MENU = process.env.MENU ?? 'nav.nav a'
const [CHAVE_TEMA, VALOR_TEMA] = (process.env.TEMA_ESCURO ?? 'tema=escuro').split('=')

function medir(botao) {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r, g, b, a } }
  const sobre = (f, t) => ({ r: f.r * f.a + t.r * (1 - f.a), g: f.g * f.a + t.g * (1 - f.a), b: f.b * f.a + t.b * (1 - f.a), a: 1 })
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
  const razao = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
  const fundo = (el) => {
    const camadas = []
    for (let e = el; e; e = e.parentElement) {
      const bg = parse(getComputedStyle(e).backgroundColor)
      if (bg && bg.a > 0) { camadas.push(bg); if (bg.a >= 1) break }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 }
    for (const c of camadas.reverse()) base = sobre(c, base)
    return base
  }
  const FORMATOS = [
    [/\b\d{4}-\d{2}-\d{2}\b/, 'data ISO'],
    [/\b(\d{1,2})\/(\d{1,2})\/\d{4}\b/, 'data americana', (m) => Number(m[2]) > 12],
    [/R\$\s?\d+\.\d{2}\b/, 'moeda com ponto decimal'],
    [/\b(NaN|undefined|null|Infinity|\[object)\b/, 'valor quebrado na tela'],
  ]
  const problemas = []
  const vistos = new Set()
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const t = n.textContent.trim(); if (!t) continue
    const el = n.parentElement
    if (!el || vistos.has(el) || !el.getClientRects().length || el.closest('script,style,[aria-hidden="true"],.sr-only,:disabled,[disabled]')) continue
    vistos.add(el)
    for (const [re, nome, cond] of FORMATOS) { const m = t.match(re); if (m && (!cond || cond(m))) problemas.push(`formato (${nome}): "${t.slice(0, 50)}"`) }
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden') continue
    let op = 1; for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity)
    if (op < 0.99) continue
    const fg = parse(cs.color); if (!fg) continue
    const bg = fundo(el)
    const c = razao(fg.a < 1 ? sobre(fg, bg) : fg, bg)
    const tam = parseFloat(cs.fontSize), grande = tam >= 24 || (tam >= 18.66 && Number(cs.fontWeight) >= 700)
    if (c < (grande ? 3 : 4.5)) problemas.push(`contraste ${c.toFixed(2)}:1 (mín ${grande ? 3 : 4.5}) "${t.slice(0, 40)}" cor ${cs.color} fundo rgb(${[bg.r, bg.g, bg.b].map(Math.round)}) .${String(el.className).split(' ')[0]}`)
  }
  if (document.documentElement.scrollWidth > innerWidth + 1) problemas.push(`rolagem lateral: página com ${document.documentElement.scrollWidth}px numa tela de ${innerWidth}px`)
  const principais = [...document.querySelectorAll(`main ${botao}`)].filter((b) => b.offsetParent).map((b) => b.textContent.trim())
  if (principais.length > 1) problemas.push(`${principais.length} botões principais: ${principais.join(' · ')}`)
  return problemas
}

;(async () => {
  const b = await chromium.launch()
  const achados = new Map()
  for (const escuro of [false, true]) {
    for (const vw of [{ width: 1280, height: 900 }, { width: 360, height: 760 }]) {
      const cel = vw.width < 600
      const p = await b.newPage({ viewport: vw, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce', ...(cel ? { isMobile: true, hasTouch: true } : {}) })
      if (escuro) await p.addInitScript(([k, v]) => localStorage.setItem(k, v), [CHAVE_TEMA, VALOR_TEMA])
      const rodada = `${escuro ? 'escuro' : 'claro'} ${vw.width}px`
      const auditar = async (tela) => {
        await p.waitForTimeout(800)
        for (const x of await p.evaluate(medir, BOTAO)) (achados.get(x) ?? achados.set(x, []).get(x)).push(`${rodada} · ${tela}`)
      }
      await p.goto(URL_BASE)
      await auditar('entrar')
      await p.fill('input[type=email]', EMAIL); await p.fill('input[type=password]', SENHA); await p.keyboard.press('Enter'); await p.waitForTimeout(2000)
      // Navega clicando (sem recarregar: a prévia guarda os dados só na memória da aba).
      const menu = await p.$$eval(cel ? 'nav.nav a, .abas-celular a, main a[href^="/"]' : MENU, (as) => [...new Set(as.map((a) => a.getAttribute('href')))])
      const rotas = cel ? [...new Set([...menu, ...(await p.$$eval(MENU, (as) => as.map((a) => a.getAttribute('href'))))])] : menu
      for (const href of rotas.filter((h) => h && !h.startsWith('http'))) {
        await p.evaluate((h) => { history.pushState({}, '', h); dispatchEvent(new PopStateEvent('popstate')) }, href)
        await auditar(href)
      }
      await p.close()
    }
  }
  await b.close()
  if (!achados.size) { console.log('Auditoria: nenhum problema em contraste, formatos, largura ou botões principais.'); return }
  console.log(`Auditoria: ${achados.size} problema(s)\n`)
  for (const [x, onde] of achados) console.log(`- ${x}\n    em ${onde.length} lugar(es), ex.: ${onde.slice(0, 3).join('; ')}`)
  process.exitCode = 1
})()
