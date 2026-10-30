// Gera o Reels (MP4 1080×1920, 30 fps) a partir de reels.html, quadro a quadro, e a capa (PNG).
// Uso: node divulgacao/aline-antunes/gerar-reels.cjs   (precisa de ffmpeg)
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process')
const { chromium } = require('playwright')
const dir = __dirname, FPS = 30
const simbolo = fs.readFileSync(path.join(dir, '../../marca/pedro-hoffman/simbolo-tinta.svg'), 'utf8').replace(/ width="\d+" height="\d+"/, '')
const palavras = (f) => f.split(' ').map((p) => `<span>${p}</span>`).join(' ')
;(async () => {
  let html = fs.readFileSync(path.join(dir, 'reels.html'), 'utf8')
    .replace('{{f1}}', palavras('Ela faz festas incríveis.'))
    .replace('{{f2}}', palavras('As contas viviam num caderno.'))
    .replaceAll('{{simbolo}}', simbolo)
    .replace('{{degraus}}', [1, 2, 3, 4, 5].map((i) => `<i style="height:${12 + i * 7}px"></i>`).join(''))
  const temp = path.join(dir, '_reels.html'); fs.writeFileSync(temp, html)
  const quadros = path.join(require('os').tmpdir(), 'reels-quadros'); fs.rmSync(quadros, { recursive: true, force: true }); fs.mkdirSync(quadros)
  const saida = path.join(dir, 'saida'); fs.mkdirSync(saida, { recursive: true })
  const b = await chromium.launch()
  try {
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 } })
    await p.goto('file://' + temp); await p.evaluate(() => document.fonts.ready)
    await p.evaluate(() => Promise.all([...document.images].map((i) => i.decode())))
    const dur = await p.evaluate(() => window.DUR)
    const total = Math.round(dur * FPS)
    for (let f = 0; f < total; f++) {
      await p.evaluate((t) => window.quadro(t), f / FPS)
      await p.screenshot({ path: path.join(quadros, `q${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 94 })
    }
    // Capa do Reels: o instante com o convite na tela
    await p.evaluate(() => window.quadro(9.6)); await p.screenshot({ path: path.join(saida, 'reels-capa.png') })
    console.log(`${total} quadros`)
  } finally { await b.close(); fs.unlinkSync(temp) }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(quadros, 'q%04d.jpg'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(saida, 'reels.mp4')])
  fs.rmSync(quadros, { recursive: true, force: true })
  console.log('Reels em', path.join(saida, 'reels.mp4'))
})()
