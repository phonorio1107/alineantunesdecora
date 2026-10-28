# Aline Antunes Decora · Sistema de gestão

Sistema financeiro e de eventos da **Aline Antunes Decora** (decoração de festas, assessoria e workshops em Louveira/SP). Projeto piloto de Pedro Hoffman. O andamento está em [`PROJETO.md`](PROJETO.md).

## Stack

React 19 + TypeScript estrito + Vite · Tailwind · Supabase (Postgres com RLS, autenticação) · TanStack Query · React Hook Form + Zod · Lucide · hospedagem no Cloudflare Pages.

## Rodar localmente

```bash
npm ci
```

```bash
cp .env.example .env.local
```

Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com o projeto de **desenvolvimento** e rode:

```bash
npm run dev
```

## Banco de dados

- Migrações em `supabase/migrations/` (nome com data). Nunca altere a produção pela interface do Supabase.
- Teste de isolamento entre empresas e perfis: `supabase/tests/isolamento.sql`. Roda dentro de uma transação e desfaz tudo.

Num Postgres local, simulando o Supabase:

```bash
psql -v ON_ERROR_STOP=1 -f supabase/tests/supabase_local_stub.sql
```

```bash
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261028120000_estrutura_v1.sql
```

```bash
psql -v ON_ERROR_STOP=1 -f supabase/tests/isolamento.sql
```

O GitHub Actions roda tudo isso a cada pull request (`.github/workflows/verificacao.yml`).

## Pastas

| Pasta | O que tem |
|---|---|
| `src/` | App da v1 (login, camada de dados; telas em construção) |
| `supabase/` | Migrações e testes do banco |
| `prototipo/` | Protótipo clicável aprovado na Fase 2 |
| `docs/` | Modelagem, revisão do código antigo, termos e modelos de documento |
| `legado/v2/` | Telas da v2 (agenda, orçamentos, ordens de serviço, acervo) guardadas para depois; fora do build |
| `marca/` | Logo da cliente e marca Pedro Hoffman |
