-- A função public.rls_auto_enable() é do próprio Supabase (recurso "Enable automatic RLS").
-- Ela só precisa rodar como gatilho de evento, nunca por chamada da API: tira a permissão de execução
-- de anon, authenticated e public. O gatilho continua funcionando (roda como dono da função).
-- Se a função não existir (Postgres comum, usado nos testes), não faz nada.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
