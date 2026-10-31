# Reels do caso Aline em Remotion

Mesmo roteiro e ritmo do `reels.mp4`, refeito do zero em [Remotion](https://www.remotion.dev) (React), com as telas atuais da prévia (**dados fictícios**). 25 s, 1080×1920, 30 fps, mudo (a música entra no Instagram).

- `src/roteiro.ts`: frases, legendas, telas, tempos e anéis de destaque. Para mudar texto ou ordem, mexa só aqui.
- `src/Abertura.tsx`: fundo escuro, frases palavra por palavra.
- `src/Sistema.tsx`: papel branco, celular trocando as telas, legenda, anéis, degraus e fecho da marca.
- `public/telas/`: prints da prévia a 390 px (×3). Anel = `[x, y, largura, altura]` em px CSS dessa tela.

```bash
cd divulgacao/aline-antunes/reel-remotion && npm install
```

```bash
npx remotion studio
```

```bash
npx remotion render ReelsAline out/reels-remotion.mp4 --codec=h264 --crf=18
```

Na nuvem do Claude Code, acrescente `--browser-executable=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome` (ou o caminho do Chromium da sessão).

Remotion é gratuito para equipes de até 3 pessoas; acima disso precisa de licença.
