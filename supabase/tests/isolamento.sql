-- Teste de isolamento entre empresas e entre perfis (Fase 4).
-- Roda dentro de uma transação e desfaz tudo no fim: não deixa nenhum dado para trás.
-- Uso: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/isolamento.sql
-- Rodar a cada migração que cria ou altera tabela. Qualquer falha interrompe com a mensagem "FALHOU: ...".

begin;

-- ---------------------------------------------------------------------------
-- Dados de teste (como superusuário, sem RLS)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'prop-a@teste.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'assist-a@teste.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'free-a@teste.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'prop-b@teste.local');

insert into public.empresas (id, nome) values
  ('eeeeeeee-0000-0000-0000-00000000000a', 'Empresa A'),
  ('eeeeeeee-0000-0000-0000-00000000000b', 'Empresa B');

insert into public.usuarios_empresas (empresa_id, usuario_id, papel) values
  ('eeeeeeee-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'proprietaria'),
  ('eeeeeeee-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'assistente'),
  ('eeeeeeee-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a3', 'freelancer'),
  ('eeeeeeee-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'proprietaria');

insert into public.clientes (id, empresa_id, nome, telefone) values
  ('cccccccc-0000-0000-0000-00000000000a', 'eeeeeeee-0000-0000-0000-00000000000a', 'Cliente da A', '11999990000'),
  ('cccccccc-0000-0000-0000-00000000000b', 'eeeeeeee-0000-0000-0000-00000000000b', 'Cliente da B', '11988880000');
insert into public.clientes_documentos (cliente_id, empresa_id, cpf_cnpj) values
  ('cccccccc-0000-0000-0000-00000000000a', 'eeeeeeee-0000-0000-0000-00000000000a', '52998224725'),
  ('cccccccc-0000-0000-0000-00000000000b', 'eeeeeeee-0000-0000-0000-00000000000b', '11144477735');

insert into public.eventos (id, empresa_id, cliente_id, titulo, data_evento, valor_fechado) values
  ('dddddddd-0000-0000-0000-00000000000a', 'eeeeeeee-0000-0000-0000-00000000000a', 'cccccccc-0000-0000-0000-00000000000a', 'Festa da A', '2026-11-20', 3000),
  ('dddddddd-0000-0000-0000-00000000000b', 'eeeeeeee-0000-0000-0000-00000000000b', 'cccccccc-0000-0000-0000-00000000000b', 'Festa da B', '2026-11-21', 4000);

insert into public.contas (id, empresa_id, nome, saldo_inicial, data_saldo_inicial) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'eeeeeeee-0000-0000-0000-00000000000a', 'Banco A', 1000, '2026-01-01'),
  ('aaaaaaaa-0000-0000-0000-00000000000b', 'eeeeeeee-0000-0000-0000-00000000000b', 'Banco B', 5000, '2026-01-01');

insert into public.lancamentos (empresa_id, tipo, valor, data_vencimento, data_pagamento, conta_id, categoria_id, evento_id, descricao)
select e, 'entrada', 900, '2026-10-10', '2026-10-10', k, (select id from public.categorias where empresa_id = e and nome = 'Decoração'), ev, 'Entrada (30%)'
from (values ('eeeeeeee-0000-0000-0000-00000000000a'::uuid, 'aaaaaaaa-0000-0000-0000-00000000000a'::uuid, 'dddddddd-0000-0000-0000-00000000000a'::uuid),
             ('eeeeeeee-0000-0000-0000-00000000000b'::uuid, 'aaaaaaaa-0000-0000-0000-00000000000b'::uuid, 'dddddddd-0000-0000-0000-00000000000b'::uuid)) v(e, k, ev);

insert into public.recorrencias (empresa_id, descricao, valor, dia_vencimento, categoria_id, conta_id)
select e, 'Aluguel', 1200, 5, (select id from public.categorias where empresa_id = e and nome = 'Aluguel'), k
from (values ('eeeeeeee-0000-0000-0000-00000000000a'::uuid, 'aaaaaaaa-0000-0000-0000-00000000000a'::uuid),
             ('eeeeeeee-0000-0000-0000-00000000000b'::uuid, 'aaaaaaaa-0000-0000-0000-00000000000b'::uuid)) v(e, k);

insert into public.inscricoes_workshop (empresa_id, evento_id, nome, valor)
values ('eeeeeeee-0000-0000-0000-00000000000b', 'dddddddd-0000-0000-0000-00000000000b', 'Aluna da B', 280);

insert into public.fechamentos_mensais (empresa_id, mes_referencia)
values ('eeeeeeee-0000-0000-0000-00000000000b', '2026-08-01');

-- 0. RLS ligado em todas as tabelas do public
do $$
declare n int;
begin
  select count(*) into n from pg_tables where schemaname = 'public' and not rowsecurity;
  if n > 0 then raise exception 'FALHOU: % tabela(s) do public sem RLS', n; end if;
  raise notice 'ok  0. RLS ligado em todas as tabelas do public';
end $$;

-- ---------------------------------------------------------------------------
-- 1. Proprietária da empresa A não enxerga, cria, altera nem apaga nada da B
-- ---------------------------------------------------------------------------
set local role authenticated;
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true); end $$;

do $$
declare
  t text; n int;
  b constant uuid := 'eeeeeeee-0000-0000-0000-00000000000b';
begin
  foreach t in array array['clientes', 'clientes_documentos', 'eventos', 'contas', 'categorias', 'recorrencias', 'lancamentos',
                           'inscricoes_workshop', 'fechamentos_mensais', 'registros_atividades', 'usuarios_empresas',
                           'saldos_contas', 'resultado_eventos'] loop
    execute format('select count(*) from public.%I where empresa_id = $1', t) into n using b;
    if n <> 0 then raise exception 'FALHOU: A leu % linha(s) da B em %', n, t; end if;
  end loop;
  select count(*) into n from public.empresas where id = b;
  if n <> 0 then raise exception 'FALHOU: A leu a empresa B'; end if;
  raise notice 'ok  1a. A não lê nada da B (13 tabelas e views + empresas)';

  begin
    insert into public.clientes (empresa_id, nome) values (b, 'Intrusa');
    raise exception 'FALHOU: A criou cliente na B';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.lancamentos (empresa_id, tipo, valor, data_vencimento, conta_id, categoria_id)
    values (b, 'saida', 10, '2026-10-01', 'aaaaaaaa-0000-0000-0000-00000000000b',
            (select id from public.categorias where empresa_id = 'eeeeeeee-0000-0000-0000-00000000000a' limit 1));
    raise exception 'FALHOU: A criou lançamento na B';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok  1b. A não cria registros na B';

  update public.clientes set nome = 'Alterado' where empresa_id = b;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: A alterou % cliente(s) da B', n; end if;
  update public.lancamentos set valor = 1 where empresa_id = b;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: A alterou lançamento da B'; end if;
  delete from public.clientes where empresa_id = b;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: A apagou cliente da B'; end if;
  delete from public.lancamentos where empresa_id = b;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: A apagou lançamento da B'; end if;
  raise notice 'ok  1c. A não altera nem apaga nada da B';

  -- Referência cruzada: lançamento da A apontando para a conta da B
  begin
    insert into public.lancamentos (empresa_id, tipo, valor, data_vencimento, conta_id, categoria_id)
    values ('eeeeeeee-0000-0000-0000-00000000000a', 'saida', 10, '2026-10-01', 'aaaaaaaa-0000-0000-0000-00000000000b',
            (select id from public.categorias where empresa_id = 'eeeeeeee-0000-0000-0000-00000000000a' and nome = 'Flores'));
    raise exception 'FALHOU: lançamento da A usou a conta da B';
  exception when foreign_key_violation then null;
  end;
  -- Mover um registro da A para a B
  begin
    update public.clientes set empresa_id = b where id = 'cccccccc-0000-0000-0000-00000000000a';
    raise exception 'FALHOU: A moveu cliente para a B';
  exception when insufficient_privilege then null;
  end;
  -- Dar a si mesma acesso à empresa B
  begin
    insert into public.usuarios_empresas (empresa_id, usuario_id, papel)
    values (b, '00000000-0000-0000-0000-0000000000a1', 'proprietaria');
    raise exception 'FALHOU: A se colocou como proprietária da B';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok  1d. Sem referência cruzada, sem mover registro, sem se dar acesso à B';

  -- A enxerga os próprios dados, incluindo CPF
  select count(*) into n from public.clientes_documentos where empresa_id = 'eeeeeeee-0000-0000-0000-00000000000a';
  if n <> 1 then raise exception 'FALHOU: proprietária A não vê o CPF da própria cliente'; end if;
  select count(*) into n from public.lancamentos where empresa_id = 'eeeeeeee-0000-0000-0000-00000000000a';
  if n <> 1 then raise exception 'FALHOU: proprietária A não vê os próprios lançamentos'; end if;
  raise notice 'ok  1e. A vê os próprios dados (clientes, CPF, lançamentos)';
end $$;

-- 2. Autor não pode ser forjado; mês fechado trava lançamentos; log sem dados pessoais
do $$
declare v_autor uuid; n int; v_id uuid;
  a constant uuid := 'eeeeeeee-0000-0000-0000-00000000000a';
begin
  insert into public.clientes (empresa_id, nome, criado_por)
  values (a, 'Cliente nova', '00000000-0000-0000-0000-0000000000b1') returning id, criado_por into v_id, v_autor;
  if v_autor <> '00000000-0000-0000-0000-0000000000a1' then raise exception 'FALHOU: criado_por foi forjado'; end if;
  raise notice 'ok  2a. criado_por é sempre quem está logado';

  insert into public.fechamentos_mensais (empresa_id, mes_referencia) values (a, '2026-09-01');
  begin
    insert into public.lancamentos (empresa_id, tipo, valor, data_vencimento, data_pagamento, conta_id, categoria_id)
    values (a, 'saida', 50, '2026-09-15', '2026-09-15', 'aaaaaaaa-0000-0000-0000-00000000000a',
            (select id from public.categorias where empresa_id = a and nome = 'Flores'));
    raise exception 'FALHOU: lançou em mês fechado';
  exception when insufficient_privilege then null;
  end;
  update public.fechamentos_mensais set excluido_em = now() where empresa_id = a and mes_referencia = '2026-09-01';
  insert into public.lancamentos (empresa_id, tipo, valor, data_vencimento, data_pagamento, conta_id, categoria_id)
  values (a, 'saida', 50, '2026-09-15', '2026-09-15', 'aaaaaaaa-0000-0000-0000-00000000000a',
          (select id from public.categorias where empresa_id = a and nome = 'Flores'));
  raise notice 'ok  2b. Mês fechado trava lançamentos; reaberto, volta a aceitar';

  update public.clientes set telefone = '11977776666' where id = v_id;
  select count(*) into n from public.registros_atividades
  where registro_id = v_id and acao = 'update' and colunas_alteradas = '{telefone}';
  if n <> 1 then raise exception 'FALHOU: alteração de cliente não foi registrada'; end if;
  select count(*) into n from public.registros_atividades
  where empresa_id = a and colunas_alteradas::text ~ '[0-9]{8,}';
  if n <> 0 then raise exception 'FALHOU: registro de atividades contém dado pessoal'; end if;
  begin
    insert into public.registros_atividades (empresa_id, tabela, registro_id, acao) values (a, 'x', v_id, 'insert');
    raise exception 'FALHOU: usuário escreveu direto no registro de atividades';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok  2c. Registro de atividades guarda só nomes de colunas e não aceita escrita direta';
end $$;

-- ---------------------------------------------------------------------------
-- 3. Assistente sem financeiro liberado
-- ---------------------------------------------------------------------------
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true); end $$;
do $$
declare n int; a constant uuid := 'eeeeeeee-0000-0000-0000-00000000000a';
begin
  select count(*) into n from public.clientes where empresa_id = a;
  if n = 0 then raise exception 'FALHOU: assistente não vê clientes'; end if;
  select count(*) into n from public.clientes_documentos;
  if n <> 0 then raise exception 'FALHOU: assistente vê CPF/CNPJ'; end if;
  select count(*) into n from public.lancamentos;
  if n <> 0 then raise exception 'FALHOU: assistente sem liberação vê lançamentos'; end if;
  select count(*) into n from public.contas;
  if n <> 0 then raise exception 'FALHOU: assistente sem liberação vê contas'; end if;
  select count(*) into n from public.registros_atividades;
  if n <> 0 then raise exception 'FALHOU: assistente vê o registro de atividades'; end if;
  begin
    insert into public.lancamentos (empresa_id, tipo, valor, data_vencimento, conta_id, categoria_id)
    values (a, 'saida', 10, '2026-10-01', 'aaaaaaaa-0000-0000-0000-00000000000a',
            (select id from public.categorias where empresa_id = a limit 1));
    raise exception 'FALHOU: assistente sem liberação lançou';
  exception when insufficient_privilege then null;
  end;
  update public.usuarios_empresas set papel = 'proprietaria', financeiro_liberado = true
  where usuario_id = '00000000-0000-0000-0000-0000000000a2';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: assistente se promoveu'; end if;
  delete from public.clientes where empresa_id = a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: assistente apagou cliente'; end if;
  raise notice 'ok  3a. Assistente vê clientes, mas não CPF, financeiro nem log; não se promove nem apaga';
end $$;

reset role;
update public.usuarios_empresas set financeiro_liberado = true where usuario_id = '00000000-0000-0000-0000-0000000000a2';
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.lancamentos where empresa_id = 'eeeeeeee-0000-0000-0000-00000000000a';
  if n = 0 then raise exception 'FALHOU: assistente liberada não vê lançamentos'; end if;
  select count(*) into n from public.lancamentos where empresa_id = 'eeeeeeee-0000-0000-0000-00000000000b';
  if n <> 0 then raise exception 'FALHOU: assistente liberada vê lançamentos da B'; end if;
  raise notice 'ok  3b. Com o financeiro liberado, assistente vê só os lançamentos da própria empresa';
end $$;

-- ---------------------------------------------------------------------------
-- 4. Freelancer: nenhum dado de cliente nem valor (v1)
-- ---------------------------------------------------------------------------
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true); end $$;
do $$
declare t text; n int;
begin
  foreach t in array array['clientes', 'clientes_documentos', 'eventos', 'lancamentos', 'contas', 'inscricoes_workshop', 'resultado_eventos'] loop
    execute format('select count(*) from public.%I', t) into n;
    if n <> 0 then raise exception 'FALHOU: freelancer leu % linha(s) de %', n, t; end if;
  end loop;
  raise notice 'ok  4. Freelancer não vê clientes, eventos nem valores';
end $$;

-- ---------------------------------------------------------------------------
-- 5. Proprietária da B não enxerga a A
-- ---------------------------------------------------------------------------
do $$ begin perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true); end $$;
do $$
declare t text; n int;
begin
  foreach t in array array['clientes', 'clientes_documentos', 'eventos', 'lancamentos', 'usuarios_empresas', 'registros_atividades'] loop
    execute format('select count(*) from public.%I where empresa_id = $1', t) into n using 'eeeeeeee-0000-0000-0000-00000000000a'::uuid;
    if n <> 0 then raise exception 'FALHOU: B leu % linha(s) da A em %', n, t; end if;
  end loop;
  begin
    insert into public.lancamentos (empresa_id, tipo, valor, data_vencimento, data_pagamento, conta_id, categoria_id)
    values ('eeeeeeee-0000-0000-0000-00000000000b', 'saida', 10, '2026-08-10', '2026-08-10', 'aaaaaaaa-0000-0000-0000-00000000000b',
            (select id from public.categorias where empresa_id = 'eeeeeeee-0000-0000-0000-00000000000b' and nome = 'Flores'));
    raise exception 'FALHOU: B lançou no próprio mês fechado';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok  5. B não lê nada da A e respeita o próprio mês fechado';
end $$;

-- ---------------------------------------------------------------------------
-- 6. Visitante sem login (anon) não lê nada
-- ---------------------------------------------------------------------------
reset role;
set local role anon;
do $$ begin perform set_config('request.jwt.claims', '', true); end $$;
do $$
declare t text;
begin
  foreach t in array array['empresas', 'usuarios_empresas', 'clientes', 'clientes_documentos', 'eventos', 'lancamentos',
                           'contas', 'categorias', 'saldos_contas', 'resultado_eventos'] loop
    begin
      execute format('select count(*) from public.%I', t);
      raise exception 'FALHOU: anon conseguiu consultar %', t;
    exception when insufficient_privilege then null;
    end;
  end loop;
  raise notice 'ok  6. Visitante sem login não consulta nenhuma tabela';
end $$;

reset role;
\echo 'TESTE DE ISOLAMENTO: TUDO OK'
rollback;
