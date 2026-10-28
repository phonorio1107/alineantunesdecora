# Termo de aprovação da Fase 2 (modelo reutilizável)

PDF de 3 páginas que o cliente responde para fechar a Fase 2: aprovação do protótipo, concordância com os dados pessoais e prazos de guarda, e informações para os cálculos.

## Como gerar para um cliente novo

1. Copie `aline.json` para `<cliente>.json` e troque os campos (cliente, responsável, link do protótipo, tabela de dados pessoais, perguntas).
2. Rode:

```bash
node docs/modelos/termo-fase-2/gerar.js docs/modelos/termo-fase-2/<cliente>.json docs/termo-aprovacao-fase-2.pdf
```

Precisa do Playwright com Chromium (já instalado nas sessões em nuvem do Claude Code). A fonte é a Inter; sem ela, o navegador usa a sem serifa do sistema.

## Identidade visual Pedro Hoffman (provisória)

- Preto `#111111` e branco, com detalhes em azul-marinho `#14284B` (fundo suave `#E8ECF3`)
- Marca: quadrado azul-marinho + "PEDRO HOFFMAN" em caixa alta, espaçado
- Tipografia: Inter (corpo) e Inter Display (título)
- Numeração de seções em quadrado azul-marinho; caixas de concordância com borda azul-marinho à esquerda

Pendente: logo definitivo, contato (e-mail/WhatsApp) e se o quadrado da assinatura nos documentos do Pedro é azul-marinho ou o verde usado no rodapé dos sistemas.

## Trecho para a skill `novo-cliente-saas` (Fase 2)

Acrescentar no fim da seção "Fase 2: Modelagem e protótipo":

```markdown
- Aprovação do cliente pelo **termo de aprovação da Fase 2** (modelo em `docs/modelos/termo-fase-2/` do template-base):
  copie `aline.json` como base, preencha com os dados do cliente e gere o PDF com `gerar.js`.
  O termo cobre: aprovação do protótipo, concordância com o mapa de dados pessoais e prazos de guarda, e as informações
  que faltam para os cálculos. Guarde a resposta do cliente (print, áudio transcrito ou folha assinada) em `docs/aprovacoes/`
  e registre a data no PROJETO.md. Sem essa resposta, a Fase 2 não fecha.
```
