// Junta o build "demo" num único arquivo HTML (CSS e JS embutidos) para publicar como página de teste.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'dist-demo'
const html = readFileSync(join(dir, 'index.html'), 'utf8')
const css = [...html.matchAll(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"/g)].map((m) => readFileSync(join(dir, m[1]), 'utf8'))
const js = [...html.matchAll(/<script type="module"[^>]*src="\.\/([^"]+)"/g)].map((m) => readFileSync(join(dir, m[1]), 'utf8'))
const safe = (code) => code.replace(/<\/script/gi, '<\\/script')

const page = `<meta charset="utf-8">
<title>Aline Antunes Decora</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${css.join('\n')}</style>
<div id="root"></div>
<script type="module">${safe(js.join('\n'))}</script>
`
writeFileSync(join(dir, 'aline-antunes-decora.html'), page)
console.log(`dist-demo/aline-antunes-decora.html (${(page.length / 1024).toFixed(0)} KB)`)
