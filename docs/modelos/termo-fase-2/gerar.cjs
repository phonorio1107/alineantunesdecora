// Gera o PDF do termo de aprovação da Fase 2 a partir do modelo e dos dados de um cliente.
// Uso: node docs/modelos/termo-fase-2/gerar.cjs docs/modelos/termo-fase-2/aline.json docs/termo-aprovacao-fase-2.pdf
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function main() {
  const [dadosPath, saida] = process.argv.slice(2);
  if (!dadosPath || !saida) {
    console.error('Uso: node gerar.cjs <dados.json> <saida.pdf>');
    process.exit(1);
  }
  const d = JSON.parse(fs.readFileSync(dadosPath, 'utf8'));
  const listas = {
    perguntas_prototipo: d.perguntas_prototipo.map((q) => `<li>${esc(q)}<div class="lines"><i></i><i></i></div></li>`).join(''),
    perguntas_negocio: d.perguntas_negocio.map((q) => `<li>${esc(q)}<div class="lines"><i></i><i></i></div></li>`).join(''),
    linhas_dados: d.linhas_dados.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join(''),
    cuidados_dados: d.cuidados_dados.map((c) => `<li>${esc(c)}</li>`).join(''),
    logo: fs.readFileSync(path.join(__dirname, '../../../marca/pedro-hoffman/logo-horizontal-tinta.svg'), 'utf8'),
  };
  const simbolo = fs.readFileSync(path.join(__dirname, '../../../marca/pedro-hoffman/simbolo-tinta.svg'), 'utf8')
    .replace('<svg ', '<svg style="height:8pt;width:auto;vertical-align:-1pt;margin-right:5pt" ');
  let html = fs.readFileSync(path.join(__dirname, 'modelo.html'), 'utf8');
  html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (k in listas) return listas[k];
    if (!(k in d)) throw new Error(`Campo ausente nos dados: ${k}`);
    return esc(d[k]);
  });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: saida,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;padding:0 18mm;font-family:Inter,sans-serif;font-size:7pt;color:#5A5A62;display:flex;justify-content:space-between;align-items:center;letter-spacing:.06em">
      <span>${simbolo}TERMO DE APROVAÇÃO · ${esc(d.cliente.toUpperCase())}</span>
      <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`,
    margin: { top: '22mm', bottom: '22mm', left: '18mm', right: '18mm' },
  });
  await browser.close();
  console.log('PDF gerado em', saida);
}

main().catch((e) => { console.error(e); process.exit(1); });
