# Termo de aprovação da Fase 2 (modelo reutilizável)

PDF de 3 páginas que o cliente responde para fechar a Fase 2: aprovação do protótipo, concordância com os dados pessoais e prazos de guarda, e informações para os cálculos.

## Como gerar para um cliente novo

1. Copie `aline.json` para `<cliente>.json` e troque os campos (cliente, responsável, link do protótipo, tabela de dados pessoais, perguntas).
2. Rode:

```bash
node docs/modelos/termo-fase-2/gerar.js docs/modelos/termo-fase-2/<cliente>.json docs/termo-aprovacao-fase-2.pdf
```

Precisa do Playwright com Chromium (já instalado nas sessões em nuvem do Claude Code). A fonte é a Inter; sem ela, o navegador usa a sem serifa do sistema.

## Identidade visual

Segue o design system **Pedro Hoffman Degrau** (https://claude.ai/artifact/TTBKvP6xEKFKxHtrAiHGcp):

- Preto e branco em tudo; o marinho `#0B1F3A` é só para agir (aqui, as caixas de marcar e o link)
- Tinta `#0E0E10`, texto secundário `#5A5A62`, bordas `#E6E6E8`, painéis `#F5F5F6`
- Títulos em Inter Tight 600/700 com espaçamento negativo; texto em Inter com números tabulares
- Logo horizontal em tinta no topo; símbolo no rodapé. Arquivos em `marca/pedro-hoffman/`

As fontes vêm do Google Fonts; sem internet, o navegador usa a sem serifa do sistema.

## Trecho para a skill `novo-cliente-saas` (Fase 2)

Acrescentar no fim da seção "Fase 2: Modelagem e protótipo":

```markdown
- Aprovação do cliente pelo **termo de aprovação da Fase 2** (modelo em `docs/modelos/termo-fase-2/` do template-base):
  copie `aline.json` como base, preencha com os dados do cliente e gere o PDF com `gerar.js`.
  O termo cobre: aprovação do protótipo, concordância com o mapa de dados pessoais e prazos de guarda, e as informações
  que faltam para os cálculos. Guarde a resposta do cliente (print, áudio transcrito ou folha assinada) em `docs/aprovacoes/`
  e registre a data no PROJETO.md. Sem essa resposta, a Fase 2 não fecha.
```
