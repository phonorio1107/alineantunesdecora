# Supabase

- `migrations/`: a fonte de verdade do banco (nome com data). Toda mudança entra por aqui.
- `tests/`: teste de isolamento entre empresas e perfis (roda no GitHub Actions a cada pull request).
- `aplicar/`: atalho para o **primeiro uso** de um projeto novo, colando no SQL Editor do Supabase:
  1. `01-estrutura-completa.sql` (gerado por `npm run sql:juntar`; junta todas as migrações)
  2. `02-primeiro-acesso.sql` (cria a empresa de teste e liga o seu usuário como proprietária)

Projeto de testes (`aline_antunes_decora-dev`): "Enable Data API" ligado, "Automatically expose new tables" **desligado**, "Enable automatic RLS" ligado.
