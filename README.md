# Aline Antunes Decora · Sistema de gestão

Sistema financeiro e de eventos da **Aline Antunes Decora** (decoração de festas, assessoria e workshops em Louveira/SP). Projeto piloto de Pedro Hoffman. Andamento e decisões em [`PROJETO.md`](PROJETO.md); visão em linguagem simples na [página de acompanhamento](https://claude.ai/artifact/Q5sgxoiMfr7tMEHPBRcM9n).

## Arquitetura

```
Celular / computador
      │ HTTPS
      ▼
Cloudflare (Workers com arquivos estáticos) ── serve o site (dist/) com os cabeçalhos de segurança
      │ chave pública (publishable)
      ▼
Supabase (São Paulo) ── Postgres com RLS + login
      ▲
      │ todo dia às 03:17
GitHub Actions ── backup criptografado → Cloudflare R2
```

- **Front-end:** React 19, TypeScript estrito, Vite, Tailwind, TanStack Query, React Hook Form + Zod, Lucide. PDFs com `@react-pdf/renderer`, planilhas com `exceljs`. Fontes servidas pelo próprio site (sem Google Fonts).
- **Banco:** Postgres no Supabase. Segurança por linha (RLS) em todas as tabelas, uma política por operação, isolamento por empresa e perfil (proprietária, assistente, freelancer). Funções com privilégio só no schema `privado`.
- **Hospedagem:** Cloudflare, publicado a cada envio para a `main`.

## Contas e quem tem acesso

| Serviço | Para quê | Conta | 2FA |
|---|---|---|---|
| GitHub | Código, verificação automática, backup | Pedro (`phonorio1107`) | Sim |
| Supabase | Banco e login (projeto `aline_antunes_decora-dev`, ref `nqdlsiqunkeaufgravhg`, plano gratuito) | Pedro | Sim |
| Cloudflare | Site (`aline-antunes-decora`) e backups (R2) | Pedro, login Google | Pelo Gmail |
| Gmail | Recupera todas as outras | Pedro | Sim |

Nenhuma senha, chave secreta ou string de conexão fica neste repositório.

## Variáveis

| Variável | Onde | Secreta? |
|---|---|---|
| `VITE_SUPABASE_URL` | Build do Cloudflare e `.env.local` | Não |
| `VITE_SUPABASE_ANON_KEY` (publishable) | Build do Cloudflare e `.env.local` | Não (vai dentro do site) |
| `NODE_VERSION=22` | Build do Cloudflare | Não |
| `SUPABASE_DB_URL`, `BACKUP_AGE_PUBLIC_KEY`, `R2_*` | Segredos do GitHub (backup) | Sim (exceto a chave pública) |

A `service_role` / secret key do Supabase **nunca** entra no front-end nem no repositório; `scripts/cliente/publicar.sh` recusa publicar com ela.

## Rodar localmente

```bash
npm ci
```

```bash
cp .env.example .env.local
```

Preencha as duas variáveis e rode:

```bash
npm run dev
```

Prévia com dados fictícios, sem banco (gera `dist-demo/previa-aline-antunes.html`):

```bash
npm run build:demo
```

## Verificações

```bash
npm run typecheck
```

```bash
npm test
```

O GitHub Actions (`.github/workflows/verificacao.yml`) roda tipos, testes, build, `npm audit` e o **teste de isolamento** do banco a cada envio.

## Banco de dados

- Migrações em `supabase/migrations/` (nome com data). Toda mudança entra por uma migração nova; nunca altere o banco pelo painel.
- Aplicar num banco: `DATABASE_URL=... bash scripts/cliente/migrar.sh` (só roda as pendentes e anota em `controle.migracoes`). O banco da Aline recebeu as 4 primeiras à mão: na primeira vez, use `MARCAR_ATE=20261029110000`.
- Teste de isolamento: `supabase/tests/isolamento.sql` (num Postgres local com `supabase/tests/supabase_local_stub.sql`).
- Conferir o projeto no ar: `npm run verificar:supabase`.
- Pasta `supabase/aplicar/`: arquivos únicos para colar no SQL Editor (gerados com `npm run sql:juntar`).

## Publicar (deploy)

Envio para a `main` → o Cloudflare roda `npm run build` e `npx wrangler deploy`. O `wrangler.jsonc` aponta para `dist/` com fallback de SPA; o build gera `dist/_headers` com CSP, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy` e bloqueio de iframe. Para clientes em outras contas: `scripts/cliente/publicar.sh` (ver `docs/operacao/novo-cliente.md`).

## Backup e restauração

Diário, criptografado, com teste de restauração automático: [`docs/backup.md`](docs/backup.md). Inclui como recuperar de verdade.

## Rotinas

| Quando | O quê | Tempo |
|---|---|---|
| Semanal | Alertas do backup e do Dependabot; responder suporte | 10 a 15 min |
| Mensal | Abrir um backup à mão; Security Advisor; uso do plano gratuito | 1 a 2 h |
| Trimestral | Usuários e permissões; bibliotecas maiores; checklist de segurança | 2 a 3 h |
| Anual | Reajuste, renovação, revisão de LGPD | meio dia |

## Documentos

- `docs/lgpd/`: política de privacidade, termos de uso, suboperadores e plano de incidente (rascunhos para advogado).
- `docs/operacao/novo-cliente.md`: checklist para um cliente novo.
- `docs/modelos/`: termo de aprovação da Fase 2 e proposta comercial (geram PDF).
- `docs/fase-2-modelagem.md`, `docs/contrato-observacoes.md`, `docs/revisao-codigo-antigo.md`.
- `legado/`: telas da versão antiga, fora do build.

## Estrutura

```
src/app, src/components, src/paginas   telas
src/auth                               entrar, nova senha, sessão
src/data                               consultas (TanStack), tipos, esquemas Zod
src/lib                                cálculos (com testes), formatação, erros
src/pdf, src/export                    PDFs, Excel e CSV
src/demo                               banco simulado da prévia (fora do build de produção)
supabase/                              migrações, testes, arquivos para o SQL Editor
scripts/                               backup, cliente (migrar/publicar), utilitários
```
