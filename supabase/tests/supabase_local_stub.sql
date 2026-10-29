-- Só para rodar os testes num Postgres comum (local ou no GitHub Actions).
-- Imita o que o Supabase já traz pronto: papéis anon/authenticated/service_role, schema auth e auth.uid().
-- NUNCA rode este arquivo num projeto Supabase de verdade.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
end $$;

create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  ), '')::uuid;
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- Modo estrito: imita o projeto com "Automatically expose new tables" DESLIGADO (o recomendado e o que usamos).
-- Nenhuma tabela nova nasce com permissão para os papéis da API; cada migração precisa conceder o que for preciso.
-- Se funciona assim, funciona também com a opção ligada (as concessões a mais são cobertas pelos revokes e pela RLS).
