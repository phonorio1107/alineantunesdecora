-- Primeiro acesso: cria a empresa e liga a sua conta como proprietária.
-- ANTES: em Authentication → Users → "Add user" → "Create new user", crie o usuário com e-mail e senha
--        (marque "Auto Confirm User"). Depois troque o e-mail abaixo pelo que você criou e clique em Run.
-- Só para o projeto de TESTES. Em produção, a empresa da Aline é criada com os dados reais, uma vez, com calma.

do $$
declare
  v_email constant text := 'TROQUE-PELO-SEU-EMAIL@exemplo.com';
  v_user uuid;
  v_emp uuid;
begin
  select id into v_user from auth.users where email = v_email;
  if v_user is null then
    raise exception 'Usuário % não encontrado em Authentication → Users. Crie o usuário primeiro.', v_email;
  end if;
  if exists (select 1 from public.usuarios_empresas where usuario_id = v_user) then
    raise exception 'Este usuário já está ligado a uma empresa.';
  end if;

  insert into public.empresas (nome, razao_social, responsavel_nome)
  values ('Aline Antunes Decora', 'EMPRESA DE TESTE', 'Aline Antunes')
  returning id into v_emp;                       -- as categorias padrão são criadas sozinhas

  insert into public.usuarios_empresas (empresa_id, usuario_id, papel) values (v_emp, v_user, 'proprietaria');
  insert into public.contas (empresa_id, nome, saldo_inicial, data_saldo_inicial) values (v_emp, 'Conta principal', 0, current_date);
  raise notice 'Pronto: empresa % ligada a %', v_emp, v_email;
end $$;
