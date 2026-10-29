-- Liga uma pessoa que já existe em Authentication → Users à empresa da Aline (a que o 02 criou).
-- ANTES: em Authentication → Users → "Add user" → "Create new user" (e-mail, senha, "Auto Confirm User").
-- Troque o e-mail e o perfil abaixo e clique em Run. Pode rodar uma vez para cada pessoa.
--   perfil 'proprietaria' : vê e faz tudo (financeiro, CPF/CNPJ, contratos, equipe)
--   perfil 'assistente'   : clientes, eventos e agenda; sem CPF; financeiro só se liberado em Configurações
--   perfil 'freelancer'   : não vê nada no sistema (por enquanto)

do $$
declare
  v_email constant text := 'TROQUE-PELO-EMAIL-DA-PESSOA@exemplo.com';
  v_perfil constant public.papel_usuario := 'proprietaria';
  v_user uuid;
  v_emp uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(trim(v_email));
  if v_user is null then
    raise exception 'Usuário % não encontrado em Authentication → Users. Crie o usuário primeiro.', v_email;
  end if;
  if exists (select 1 from public.usuarios_empresas where usuario_id = v_user and excluido_em is null) then
    raise exception 'Este usuário já está ligado a uma empresa.';
  end if;
  select id into v_emp from public.empresas where excluido_em is null order by criado_em limit 1;
  if v_emp is null then
    raise exception 'Nenhuma empresa criada ainda. Rode antes o 02-primeiro-acesso.sql.';
  end if;
  insert into public.usuarios_empresas (empresa_id, usuario_id, papel) values (v_emp, v_user, v_perfil);
  raise notice 'Pronto: % agora é % da empresa %', v_email, v_perfil, v_emp;
end $$;
