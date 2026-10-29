// Gera as lâminas de planos para o WhatsApp (PNG 1080×1350, uma por lâmina) e um PDF com todas.
// Uso: node docs/modelos/planos/gerar.cjs [planos.json] [pasta de saída]
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const marca = (v) => (v === 'sim' ? '<span class="sim">✓</span>' : v === 'não' ? '<span class="nao">—</span>' : esc(v))

async function main() {
  const dir = __dirname
  const dados = JSON.parse(fs.readFileSync(process.argv[2] || path.join(dir, 'planos.json'), 'utf8'))
  const saida = process.argv[3] || path.join(dir, 'saida')
  fs.mkdirSync(saida, { recursive: true })
  const simbolo = fs.readFileSync(path.join(dir, '../../../marca/pedro-hoffman/simbolo-tinta.svg'), 'utf8').replace(/ width="\d+" height="\d+"/, '')
  const dest = dados.planos.findIndex((p) => p.destaque)
  const cls = (i) => (i === dest ? ' destaque' : '')
  const faixas = (lista) => lista.map(([t, b, s], i) => `<div class="faixa${cls(i)}"><span class="t">${esc(dados.planos[i].nome)}${t !== dados.planos[i].nome ? ' · ' + esc(t) : ''}</span><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('')
  const blocos = {
    simbolo,
    simbolo_branco: simbolo.replaceAll('#0E0E10', '#FFFFFF'),
    cartoes: dados.planos.map((p, i) => `<div class="plano${cls(i)}">${p.destaque ? `<span class="selo">${esc(p.destaque)}</span>` : ''}<span class="nome">${esc(p.nome)}</span><span class="para">${esc(p.para)}</span><div class="preco"><b>${esc(p.mensal)}<small> /mês</small></b><span>Implantação ${esc(p.setup)}</span></div></div>`).join(''),
    tabela: `<tr><th></th>${dados.planos.map((p, i) => `<th class="${i === dest ? 'dest' : ''}">${esc(p.nome)}</th>`).join('')}</tr>` +
      dados.tabela.map(([rot, ...v]) => `<tr><td>${esc(rot)}</td>${v.map((x, i) => `<td class="${i === dest ? 'dest' : ''}">${marca(x)}</td>`).join('')}</tr>`).join(''),
    faixas_backup: faixas(dados.faixas_backup),
    faixas_manutencao: faixas(dados.faixas_manutencao),
    faixas_suporte: faixas(dados.faixas_suporte),
    extras: dados.extras.map(([t, s]) => `<li><span><b>${esc(t)}</b><small>${esc(s)}</small></span></li>`).join(''),
    condicoes: dados.condicoes, // texto com <b> controlado por quem edita o JSON
  }
  const html = fs.readFileSync(path.join(dir, 'apresentacao.html'), 'utf8').replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in blocos)) throw new Error(`Campo ausente: ${k}`)
    return blocos[k]
  })
  const temp = path.join(dir, '_montada.html')
  fs.writeFileSync(temp, html)
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } })
    await page.goto('file://' + temp)
    await page.evaluate(() => document.fonts.ready)
    const lam = await page.$$('.slide')
    for (let i = 0; i < lam.length; i++) {
      const transborda = await lam[i].evaluate((el) => el.scrollHeight > el.clientHeight + 1)
      if (transborda) console.warn(`ATENÇÃO: lâmina ${i + 1} tem conteúdo passando da altura`)
      await lam[i].screenshot({ path: path.join(saida, `planos-${i + 1}.png`) })
    }
    await page.pdf({ path: path.join(saida, 'planos-pedro-hoffman.pdf'), width: '1080px', height: '1350px', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } })
    console.log(`${lam.length} lâminas e o PDF em ${saida}`)
  } finally {
    await browser.close()
    fs.unlinkSync(temp)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
