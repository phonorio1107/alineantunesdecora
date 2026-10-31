// Gera a "câmera": quadros 1080×1920 da prévia do sistema (dados fictícios) e um roteiro de durações para o ffmpeg.
const { chromium } = require('playwright')
const fs = require('fs')
;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  const p = await ctx.newPage()
  const lista = []; let n = 0
  const foto = async (dur) => { const f = `q/${String(n++).padStart(4, '0')}.png`; await p.screenshot({ path: f }); lista.push([f, dur]) }
  const parado = async (dur) => { await p.waitForTimeout(900); await foto(dur) }
  const yDe = (sel) => p.evaluate((s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + scrollY : 0 }, sel)
  // rolagem suave de y0 até y1 em d segundos, a 30 quadros/s (easing suave)
  const rolar = async (y1, d) => {
    const y0 = await p.evaluate(() => scrollY), N = Math.round(d * 30)
    for (let i = 1; i <= N; i++) { const k = i / N, e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
      await p.evaluate((y) => window.scrollTo(0, y), y0 + (y1 - y0) * e); await foto(1 / 30) }
  }
  await p.goto('http://127.0.0.1:4173/'); await p.waitForTimeout(800)
  await p.fill('input[type=email]', 'aline@demo.com'); await p.fill('.senha input', 'x'); await p.click('button:has-text("Entrar")'); await p.waitForTimeout(3500)
  // 0–9.4 · Início: convite do próximo evento, depois desce até o livro-caixa
  await parado(5.0); await rolar(560, 2.2); await foto(2.2)
  // 9.4–12.2 · Vendas: orçamentos
  await p.click('.abas-celular >> text="Vendas"'); await parado(2.8)
  // 12.2–15.2 · orçamento com peças e serviços
  await p.click('a.linha:has-text("Batizado")'); await parado(0.6)
  await rolar((await yDe('#t-itens')) - 90, 1.0); await foto(1.4)
  // 15.2–18.8 · fechar venda → contrato
  await p.evaluate(() => window.scrollTo(0, 0)); await p.click('.cabecalho button:has-text("Fechar venda")'); await p.waitForTimeout(600)
  await p.fill('#f-valor', '3.300,00'); await p.fill('#f-va-decoracao', '2.700,00'); await p.fill('#f-va-assessoria', '600,00'); await p.locator('#f-valor').blur()
  await parado(1.8)
  await p.click('.folha .acoes button:has-text("Fechar venda")'); await parado(1.8)
  await p.click('.folha button:has-text("Depois")'); await p.waitForTimeout(400)
  // 18.8–22.2 · estoque com códigos
  await p.click('.abas-celular >> text="Mais"'); await p.waitForTimeout(400); await p.click('main a:has-text("Estoque")'); await parado(1.0)
  await rolar((await yDe('.filtros')) - 20, 1.0); await foto(1.4)
  // 22.2–25.0 · conferência da devolução (festa que já passou)
  await p.click('.abas-celular >> text="Vendas"'); await p.waitForTimeout(400); await p.click('.etapa:has-text("Eventos")'); await p.click('.abas button:has-text("Realizados")'); await p.waitForTimeout(500)
  await p.click('a.evento:has-text("Maria Luísa")'); await p.waitForTimeout(900)
  await p.evaluate((y) => window.scrollTo(0, y), (await yDe('#t-conf')) - 120); await parado(2.8)
  // 25.0–28.0 · lucro de cada evento
  await p.click('.abas-celular >> text="Vendas"'); await p.waitForTimeout(400); await p.click('.etapa:has-text("Eventos")'); await p.waitForTimeout(500)
  await p.click('a.evento:has-text("15 anos")'); await p.waitForTimeout(900)
  await p.evaluate((y) => window.scrollTo(0, y), (await yDe('section.kv')) - 260); await parado(3.0)
  // 28.0–fim · de volta ao Início, no celular
  await p.click('.abas-celular >> text="Início"'); await p.evaluate(() => window.scrollTo(0, 0)); await parado(8.6)
  fs.writeFileSync('q/lista.txt', lista.map(([f, d]) => `file '${f.slice(2)}'\nduration ${d.toFixed(4)}`).join('\n') + `\nfile '${lista.at(-1)[0].slice(2)}'\n`)
  console.log(n, 'quadros', lista.reduce((t, [, d]) => t + d, 0).toFixed(2), 's')
  await ctx.close(); await b.close()
})()
