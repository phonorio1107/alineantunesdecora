// Gera o carrossel (6 PNGs 1080×1350) a partir de post.html. Uso: node divulgacao/aline-antunes/gerar-post.cjs
const fs = require('fs'), path = require('path')
const { chromium } = require('playwright')
const dir = __dirname
const simbolo = fs.readFileSync(path.join(dir, '../../marca/pedro-hoffman/simbolo-tinta.svg'), 'utf8').replace(/ width="\d+" height="\d+"/, '')
const marca = (cor) => `<span class="marca">${cor === 'clara' ? simbolo.replaceAll('#0E0E10', '#FFFFFF') : simbolo}Pedro Hoffman</span>`
const check = '<svg viewBox="0 0 24 24" fill="none" stroke="#0B1F3A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
const degraus = (n) => `<span class="degraus" aria-hidden="true">${[1, 2, 3, 4, 5, 6].map((i) => `<i class="${i < n ? 'feito' : i === n ? 'aqui' : ''}" style="height:${8 + i * 4.3}px"></i>`).join('')}</span>`
;(async () => {
  let html = fs.readFileSync(path.join(dir, 'post.html'), 'utf8')
  html = html.replace(/\{\{marca\}\}/g, marca()).replace(/\{\{marca-clara\}\}/g, marca('clara')).replace(/\{\{check\}\}/g, check).replace(/\{\{degraus:(\d)\}\}/g, (_, n) => degraus(Number(n)))
  const temp = path.join(dir, '_post.html'); fs.writeFileSync(temp, html)
  const saida = path.join(dir, 'saida'); fs.mkdirSync(saida, { recursive: true })
  const b = await chromium.launch()
  try {
    const p = await b.newPage({ viewport: { width: 1080, height: 1350 } })
    await p.goto('file://' + temp); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300)
    const lam = await p.$$('.slide')
    for (let i = 0; i < lam.length; i++) await lam[i].screenshot({ path: path.join(saida, `post-${i + 1}.png`) })
    console.log(`${lam.length} lâminas em ${saida}`)
  } finally { await b.close(); fs.unlinkSync(temp) }
})()
