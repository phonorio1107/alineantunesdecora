# Ferramentas e skills de apoio da marca Pedro Hoffman

Catálogo para lembrar o que já está avaliado e como usar em qualquer cliente. Atualize a cada skill ou ferramenta nova.

## Skill `reel`: cortar e editar Reels (9:16) a partir do vídeo bruto

| | |
|---|---|
| **Para que serve** | Corta silêncios, "éé", gaguejos e repetições do vídeo bruto e edita no estilo "VSL com interface animada": tela cheia alternando com tela dividida, uma peça de interface entra em cada palavra-chave, legenda que segue a boca, efeitos sonoros discretos e áudio em −14 LUFS. Entrega `render/reel-v1.mp4`. |
| **Quando usar** | Vídeo vertical ou horizontal com a pessoa falando para a câmera. Peça: "edita esse reel", "corta e edita", "monta esse bruto". |
| **Não serve para** | Vídeo longo de YouTube, vídeo sem ninguém falando, roteiro, legenda do post, carrossel. |
| **Origem** | https://github.com/Felpborges/skill-reel (autor: Felpborges) |
| **Versão revisada** | commit `b9c1222` ("skill reel: corte + motor VSL numa skill só"), revisada em 31/10/2026: sem rede além do modelo de rosto do Google e do npm, sem envio de dados, regra de nunca publicar o vídeo. |
| **Instalar (computador)** | `git clone https://github.com/Felpborges/skill-reel.git ~/.claude/skills/reel` e depois `git -C ~/.claude/skills/reel checkout b9c1222` |
| **Instalar (claude.ai)** | Enviar o `skill-reel.zip` em Configurações → Skills |
| **Precisa de** | ffmpeg, whisper-cli (whisper.cpp) com o modelo `ggml-large-v3-turbo.bin` (~1,6 GB, em `~/.cache/whisper-cpp/`), Python 3 com numpy e opencv, Node 20+, Google Chrome. Conferir com `python3 ~/.claude/skills/reel/corte/scripts/0-checar.py` |
| **Mac** | `brew install ffmpeg whisper-cpp node numpy opencv` |
| **Regras dela** | Rosto nunca coberto; material real (print e logo oficial, nunca inventado); zona segura do Instagram; nenhum nome de terceiro no vídeo; nunca publica nem envia o vídeo. |
| **Cuidados com cliente** | Gravação com a voz e o rosto de uma pessoa: peça autorização para usar. Prints só da prévia com dados fictícios. |
| **Já usada em** | Roteiro do Reels do Pedro sobre o sistema da Aline Antunes Decora (nov/2026). |

> Para atualizar a versão: ler o que mudou no repositório antes (`git diff b9c1222..HEAD`), revisar e só então trocar o commit fixado.
