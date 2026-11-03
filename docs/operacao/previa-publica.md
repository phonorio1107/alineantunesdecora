# Prévia pública do sistema (demonstração para clientes em potencial)

Site estático com **dados fictícios e sem banco**: quem entra pode mexer em tudo e nada é salvo (recarregar a página reinicia). Fica num Worker **separado** do sistema real (`wrangler.demo.jsonc`), com `noindex`.

Entrada na prévia: qualquer e-mail e senha. `aline@demo.com` vê tudo; `assistente@demo.com` vê sem o financeiro. Verificação em duas etapas: código `123456`.

## Publicar (uma vez, no painel do Cloudflare)
1. Workers e Pages → **Create** → **Import a repository** → escolha o repositório → nome **aline-antunes-previa**.
2. Branch: `main`.
3. Build command: `npm run build:demo`.
4. Deploy command: `npx wrangler deploy --config wrangler.demo.jsonc`.
5. Salvar e publicar. O endereço sai como `aline-antunes-previa.<sua-conta>.workers.dev`.

Cada mudança na `main` republica a prévia sozinha. O sistema real (outro Worker) não é afetado.

## Antes de divulgar o link
- A prévia mostra o nome e a marca da Aline Antunes Decora: **peça a autorização dela**.
- Mostra o selo "Prévia" e dados fictícios (nomes e valores inventados).
