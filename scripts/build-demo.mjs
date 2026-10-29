// Junta o build "demo" num único arquivo HTML (CSS, JS, imagens e fontes embutidos) para testar sem servidor.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'dist-demo'
const html = readFileSync(join(dir, 'index.html'), 'utf8')
const css = [...html.matchAll(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"/g)].map((m) => readFileSync(join(dir, m[1]), 'utf8'))
const js = [...html.matchAll(/<script type="module"[^>]*src="\.\/([^"]+)"/g)].map((m) => readFileSync(join(dir, m[1]), 'utf8'))
// U+FFFD vira o escape \\uFFFD (mesmo valor no JavaScript), para o arquivo não parecer corrompido a quem o lê.
const seguro = (code) => code.replace(/<\/script/gi, '<\\/script').replace(/\uFFFD/g, '\\uFFFD')

const pagina = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>Prévia Aline Antunes</title>
<style>${css.join('\n')}</style>
</head>
<body>
<div id="root"></div>
<script type="module">${seguro(js.join('\n'))}</script>
</body>
</html>
`
writeFileSync(join(dir, 'previa-aline-antunes.html'), pagina)
// Versão para publicar como página no claude.ai (sem as tags de documento, que a plataforma adiciona).
const corpo = pagina.replace(/^<!doctype html>\n<html lang="pt-BR">\n<head>\n/, '').replace('</head>\n<body>\n', '').replace(/<\/body>\n<\/html>\n$/, '').replace(/<meta charset="utf-8">\n<meta name="viewport"[^>]*>\n/, '')
writeFileSync(join(dir, 'previa-pagina.html'), corpo)
console.log(`dist-demo/previa-aline-antunes.html (${(pagina.length / 1024 / 1024).toFixed(1)} MB)`)
