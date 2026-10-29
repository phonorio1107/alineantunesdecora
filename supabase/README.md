# Supabase

- `migrations/`: a fonte de verdade do banco (nome com data). Toda mudança entra por aqui.
- `tests/`: teste de isolamento entre empresas e perfis (roda no GitHub Actions a cada pull request).
- `aplicar/`: atalho para o **primeiro uso** de um projeto novo, colando no SQL Editor do Supabase:
  1. `01-estrutura-completa.sql` (gerado por `npm run sql:juntar`; junta todas as migrações)
  2. `02-primeiro-acesso.sql` (cria a empresa de teste e liga o seu usuário como proprietária)
  3. `03-parcelas-e-recorrencias.sql` (30/10/2026: parcelas, repetição mensal de entradas e saídas, CEP do cliente; cria o controle de migrações). Para quem já rodou o 01 antes desta data
  4. `04-agenda-e-google.sql` (31/10/2026: compromissos da agenda e ligação com o Google Agenda)

Projeto de testes (`aline_antunes_decora-dev`): "Enable Data API" ligado, "Automatically expose new tables" **desligado**, "Enable automatic RLS" ligado.
