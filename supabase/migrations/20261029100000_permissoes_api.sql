-- Permissões explícitas para a API do Supabase.
-- O projeto desliga "Automatically expose new tables": tabela nova nasce SEM acesso para anon e authenticated.
-- Aqui concedemos só o mínimo que cada tabela precisa. Quem decide quais LINHAS cada pessoa vê continua sendo a RLS.
-- Vale também se a opção estiver ligada: o que sobra é retirado do papel anon abaixo.

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema privado to authenticated;

-- Pessoas logadas: só as operações que as políticas de RLS já preveem.
grant select, update on public.empresas to authenticated;
grant select, insert, update, delete on public.usuarios_empresas to authenticated;
grant select, insert, update, delete on
  public.clientes, public.clientes_documentos, public.eventos, public.inscricoes_workshop,
  public.contas, public.categorias, public.recorrencias, public.lancamentos, public.contratos
  to authenticated;
grant select, insert, update on public.fechamentos_mensais to authenticated; -- fechar e reabrir; nunca apagar
grant select on public.registros_atividades to authenticated;                -- só leitura; a escrita é do gatilho
grant select on public.saldos_contas, public.resultado_eventos to authenticated;

-- Visitante sem login: nada.
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;

-- Painel e rotinas do servidor (service_role ignora a RLS, mas precisa de permissão na tabela).
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
