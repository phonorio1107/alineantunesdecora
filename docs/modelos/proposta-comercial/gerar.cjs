// Gera o PDF da proposta comercial a partir do modelo e dos dados de um cliente.
// Uso: node docs/modelos/proposta-comercial/gerar.cjs docs/modelos/proposta-comercial/exemplo.json saida.pdf
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lista = (itens) => itens.map((i) => `<li>${esc(i)}</li>`).join('');

async function main() {
  const [dadosPath, saida] = process.argv.slice(2);
  if (!dadosPath || !saida) {
    console.error('Uso: node gerar.cjs <dados.json> <saida.pdf>');
    process.exit(1);
  }
  const d = JSON.parse(fs.readFileSync(dadosPath, 'utf8'));
  const blocos = {
    escopo: lista(d.escopo),
    inclui_setup: lista(d.inclui_setup),
    inclui_mensalidade: lista(d.inclui_mensalidade),
    nao_inclui: lista(d.nao_inclui),
    condicoes: d.condicoes.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join(''),
    logo: fs.readFileSync(path.join(__dirname, '../../../marca/pedro-hoffman/logo-horizontal-tinta.svg'), 'utf8'),
  };
  const simbolo = fs.readFileSync(path.join(__dirname, '../../../marca/pedro-hoffman/simbolo-tinta.svg'), 'utf8')
    .replace('<svg ', '<svg style="height:8pt;width:auto;vertical-align:-1pt;margin-right:5pt" ');
  let html = fs.readFileSync(path.join(__dirname, 'modelo.html'), 'utf8');
  html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (k in blocos) return blocos[k];
    if (!(k in d)) throw new Error(`Campo ausente nos dados: ${k}`);
    return esc(d[k]);
  });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' }).catch(() => page.setContent(html));
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: saida,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;padding:0 18mm;font-family:Inter,sans-serif;font-size:7pt;color:#5A5A62;display:flex;justify-content:space-between;align-items:center;letter-spacing:.06em">
      <span>${simbolo}PROPOSTA COMERCIAL · ${esc(d.cliente.toUpperCase())}</span>
      <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`,
    margin: { top: '20mm', bottom: '22mm', left: '18mm', right: '18mm' },
  });
  await browser.close();
  console.log('PDF gerado em', saida);
}

main().catch((e) => { console.error(e); process.exit(1); });
