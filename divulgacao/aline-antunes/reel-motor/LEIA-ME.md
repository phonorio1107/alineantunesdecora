# Reels "sistema da Aline" feito com o motor da skill `reel`

Saída: `../saida/reels-motor-v1.mp4` (1080×1920, 36,7 s) e a capa `../saida/reels-motor-capa.png`.

## Como foi feito
A skill `reel` (github.com/Felpborges/skill-reel, commit b9c1222) edita um vídeo de alguém falando. Aqui não há rosto nem voz, então:
- **câmera** = a prévia do sistema no celular (dados fictícios), capturada quadro a quadro em 1080×1920 por `quadros.cjs` (rolagens a 30 quadros/s);
- **fala** = o roteiro em legenda: `transcript.json` tem o tempo de cada palavra (definido por nós), e cada peça entra na palavra por `K.at()`;
- **legenda** = a do motor, com rastreio fixo (sem boca) e uma tarja escura para ler sobre a tela clara;
- **pele** = marca Pedro Hoffman (`pele-resolvida.json`: fundo #0E0E10, marinho #1E3F73 e #8FB0E3, Inter Tight e Inter);
- **mapa** = `beats.js` (gancho com HUD de filmadora → "antes" em tela dividida → sistema em tela cheia, card em pé e tela dividida → fecho escuro com "Manda DOR no direct").

## Som
O render do hyperframes só leva o áudio que está no HTML; os efeitos do kit nascem durante a animação. Eles foram mixados com ffmpeg a partir de `sons.json` (28 efeitos, 0,76/s), sem trilha. Volume final −19,7 LUFS, pico −1,5 dBTP. A ideia é pôr uma música do próprio Instagram por cima.

## Conferido
lint 0 erros · zona segura OK (perfil Reels) · folha de quadros (`folha-final.png`).
O `verificar.py` da skill não se aplica inteiro (ele mede rosto e voz a −14 LUFS).

## Refazer
1. Servir a prévia (`npm run build:demo`) e rodar `node quadros.cjs` (gera a câmera).
2. Copiar `~/.claude/skills/reel/modelo` para `motor/` e rodar `bash preparar.sh --video camera.mp4 --palavras transcript.json`.
3. Pôr `beats.js` em `motor/src/`, `vsl.json` em `motor/` e `pele-resolvida.json` + fontes Inter em `../`.
4. `node montar.mjs`, depois `npx hyperframes render -q high`, e mixar os efeitos de `sons.json`.

Antes de postar: autorização da Aline.
