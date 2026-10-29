-- GERADO por "npm run sql:juntar". Não edite: mude as migrações em supabase/migrations.
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em Run. Rode UMA vez, num projeto novo e vazio.
-- Migrações incluídas: 20261028120000_estrutura_v1.sql, 20261029090000_contratos_e_logistica.sql, 20261029100000_permissoes_api.sql, 20261029110000_revoga_rls_auto_enable.sql, 20261030090000_parcelas_e_recorrencias.sql, 20261031090000_agenda_e_google.sql

-- ============================================================
-- 20261028120000_estrutura_v1.sql
-- ============================================================
-- Estrutura da v1 (financeiro + eventos) da Aline Antunes Decora.
-- Modelo aprovado em docs/fase-2-modelagem.md. Regras de segurança da Fase 4:
--   * RLS em todas as tabelas do schema public, políticas por empresa_id via usuarios_empresas;
--   * uma política por operação, com "with check" em insert e update;
--   * nada de user_metadata nem "using (true)";
--   * funções security definer só no schema privado, com search_path vazio;
--   * views com security_invoker.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.papel_usuario as enum ('proprietaria', 'assistente', 'freelancer');
create type public.origem_cliente as enum ('instagram', 'indicacao', 'whatsapp', 'site', 'outra');
create type public.tipo_evento as enum ('infantil', 'casamento', 'quinze_anos', 'cha', 'batizado', 'corporativo', 'workshop', 'outro');
create type public.fonte_receita as enum ('decoracao', 'assessoria', 'workshop');
create type public.status_evento as enum ('confirmado', 'realizado', 'cancelado');
create type public.status_inscricao as enum ('reservada', 'paga', 'cancelada');
create type public.tipo_lancamento as enum ('entrada', 'saida');
create type public.natureza_categoria as enum ('receita', 'variavel', 'fixo', 'retirada');

-- ---------------------------------------------------------------------------
-- Schema privado: funções auxiliares que as políticas usam (não exposto pela API)
-- ---------------------------------------------------------------------------
create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated;

-- ---------------------------------------------------------------------------
-- Empresas e vínculo de usuários
-- ---------------------------------------------------------------------------
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) between 2 and 120),
  logo_url text,
  cor_destaque text check (cor_destaque ~ '^#[0-9A-Fa-f]{6}$'),
  reserva_meses numeric(4, 1) not null default 3 check (reserva_meses between 0 and 24),
  retirada_minima numeric(12, 2) not null default 0 check (retirada_minima >= 0),
  entrada_percentual numeric(5, 2) not null default 30 check (entrada_percentual between 0 and 100),
  dias_saldo_antes_evento int not null default 5 check (dias_saldo_antes_evento between 0 and 60),
  percentual_lucro_empresa numeric(5, 2) check (percentual_lucro_empresa between 0 and 100),
  percentual_lucro_proprietaria numeric(5, 2) check (percentual_lucro_proprietaria between 0 and 100),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null default auth.uid(),
  excluido_em timestamptz,
  check (coalesce(percentual_lucro_empresa, 0) + coalesce(percentual_lucro_proprietaria, 0) <= 100)
);

create table public.usuarios_empresas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  papel public.papel_usuario not null,
  financeiro_liberado boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null default auth.uid(),
  excluido_em timestamptz,
  unique (empresa_id, usuario_id)
);
create index usuarios_empresas_usuario_idx on public.usuarios_empresas (usuario_id);
create index usuarios_empresas_empresa_idx on public.usuarios_empresas (empresa_id);

-- Funções de permissão. security definer para ler usuarios_empresas sem cair na própria RLS.
create function privado.eh_membro(p_empresa uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.usuarios_empresas ue
    where ue.empresa_id = p_empresa and ue.usuario_id = auth.uid() and ue.excluido_em is null
  );
$$;

create function privado.tem_papel(p_empresa uuid, p_papeis public.papel_usuario[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.usuarios_empresas ue
    where ue.empresa_id = p_empresa and ue.usuario_id = auth.uid() and ue.excluido_em is null
      and ue.papel = any (p_papeis)
  );
$$;

-- Financeiro: proprietária sempre; assistente só se liberado.
create function privado.ve_financeiro(p_empresa uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.usuarios_empresas ue
    where ue.empresa_id = p_empresa and ue.usuario_id = auth.uid() and ue.excluido_em is null
      and (ue.papel = 'proprietaria' or (ue.papel = 'assistente' and ue.financeiro_liberado))
  );
$$;

revoke all on function privado.eh_membro(uuid), privado.tem_papel(uuid, public.papel_usuario[]), privado.ve_financeiro(uuid) from public;
grant execute on function privado.eh_membro(uuid), privado.tem_papel(uuid, public.papel_usuario[]), privado.ve_financeiro(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Cadastros
-- ---------------------------------------------------------------------------
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null check (length(trim(nome)) between 2 and 120),
  telefone text check (telefone ~ '^[0-9]{10,11}$'),
  email text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  endereco text check (length(endereco) <= 200),
  cidade text check (length(cidade) <= 80),
  origem public.origem_cliente not null default 'outra',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null default auth.uid(),
  excluido_em timestamptz,
  unique (empresa_id, id)
);
create index clientes_empresa_idx on public.clientes (empresa_id);
create index clientes_nome_idx on public.clientes (empresa_id, nome);

-- CPF/CNPJ fica em tabela separada: só a proprietária lê e grava (permissão no banco, não só na tela).
create table public.clientes_documentos (
  cliente_id uuid primary key,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  cpf_cnpj text not null check (cpf_cnpj ~ '^([0-9]{11}|[0-9]{14})$'),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null default auth.uid(),
  excluido_em timestamptz,
  foreign key (empresa_id, cliente_id) references public.clientes (empresa_id, id) on delete cascade
);
create index clientes_documentos_empresa_idx on public.clientes_documentos (empresa_id);

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  cliente_id uuid,
  titulo text not null check (length(trim(titulo)) between 3 and 120),
  tipo public.tipo_evento not null default 'infantil',
  fonte public.fonte_receita not null default 'decoracao',
  data_evento date not null,
  cidade text check (length(cidade) <= 80),
  valor_fechado numeric(12, 2) not null default 0 check (valor_fechado >= 0),
  vagas int check (vagas > 0),
  valor_inscricao numeric(12, 2) check (valor_inscricao >= 0),
  status public.status_evento not null default 'confirmado',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null default auth.uid(),
  excluido_em timestamptz,
  unique (empresa_id, id),
  foreign key (empresa_id, cliente_id) references public.clientes (empresa_id, id) on delete restrict,
  check (fonte = 'workshop' or cliente_id is not null)
);
create index eventos_empresa_data_idx on public.eventos (empresa_id, data_evento);
create index eventos_cliente_idx on public.eventos (cliente_id);

-- ---------------------------------------------------------------------------
-- Financeiro
-- ---------------------------------------------------------------------------
create table public.contas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null check (length(trim(nome)) between 2 and 60),
  saldo_inicial numeric(12, 2) not null default 0,
  data_saldo_inicial date not null default current_date,
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null default auth.uid(),
  excluido_em timestamptz,
  unique (empresa_id, id)
);
create index contas_empresa_idx on public.contas (empresa_id);

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null check (length(trim(nome)) between 2 and 60),
  tipo public.tipo_lancamento not null,
  natureza public.natureza_categoria not null,
  fonte public.fonte_receita,
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null default auth.uid(),
  excluido_em timestamptz,
  unique (empresa_id, id),
  check ((tipo = 'entrada') = (natureza = 'receita'))
);
create index categorias_empresa_idx on public.categorias (empresa_id);

create table public.recorrencias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  descricao text not null check (length(trim(descricao)) between 2 and 80),
  valor numeric(12, 2) not null check (valor > 0),
  dia_vencimento int not null check (dia_vencimento between 1 and 31),
  categoria_id uuid not null,
  conta_id uuid not null,
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null default auth.uid(),
  excluido_em timestamptz,
  unique (empresa_id, id),
  foreign key (empresa_id, categoria_id) references public.categorias (empresa_id, id) on delete restrict,
  foreign key (empresa_id, conta_id) references public.contas (empresa_id, id) on delete restrict
);
create index recorrencias_empresa_idx on public.recorrencias (empresa_id);

create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  tipo public.tipo_lancamento not null,
  valor numeric(12, 2) not null check (valor > 0),
  data_vencimento date not null,
  data_pagamento date, -- vazia = previsto
  conta_id uuid not null,
  categoria_id uuid not null,
  evento_id uuid,
  recorrencia_id uuid,
  descricao text check (length(descricao) <= 120),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null default auth.uid(),
  excluido_em timestamptz,
  unique (empresa_id, id),
  foreign key (empresa_id, conta_id) references public.contas (empresa_id, id) on delete restrict,
  foreign key (empresa_id, categoria_id) references public.categorias (empresa_id, id) on delete restrict,
  foreign key (empresa_id, evento_id) references public.eventos (empresa_id, id) on delete restrict,
  foreign key (empresa_id, recorrencia_id) references public.recorrencias (empresa_id, id) on delete set null (recorrencia_id)
);
create index lancamentos_empresa_venc_idx on public.lancamentos (empresa_id, data_vencimento);
create index lancamentos_empresa_pag_idx on public.lancamentos (empresa_id, data_pagamento);
create index lancamentos_evento_idx on public.lancamentos (evento_id);
create unique index lancamentos_recorrencia_mes_idx
  on public.lancamentos (recorrencia_id, date_trunc('month', data_vencimento::timestamp))
  where recorrencia_id is not null and excluido_em is null;

create table public.inscricoes_workshop (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  evento_id uuid not null,
  nome text not null check (length(trim(nome)) between 2 and 120),
  telefone text check (telefone ~ '^[0-9]{10,11}$'),
  valor numeric(12, 2) not null check (valor >= 0),
  status public.status_inscricao not null default 'reservada',
  lancamento_id uuid,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null default auth.uid(),
  excluido_em timestamptz,
  foreign key (empresa_id, evento_id) references public.eventos (empresa_id, id) on delete cascade,
  foreign key (empresa_id, lancamento_id) references public.lancamentos (empresa_id, id) on delete set null (lancamento_id)
);
create index inscricoes_empresa_idx on public.inscricoes_workshop (empresa_id);
create index inscricoes_evento_idx on public.inscricoes_workshop (evento_id);

create table public.fechamentos_mensais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  mes_referencia date not null check (extract(day from mes_referencia) = 1),
  resumo jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null default auth.uid(),
  excluido_em timestamptz -- preenchido = mês reaberto
);
create unique index fechamentos_mes_ativo_idx on public.fechamentos_mensais (empresa_id, mes_referencia) where excluido_em is null;

-- Registro de atividades: só nomes de colunas alteradas, nunca valores (nada de dado pessoal no log).
create table public.registros_atividades (
  id bigint generated always as identity primary key,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  tabela text not null,
  registro_id uuid not null,
  acao text not null check (acao in ('insert', 'update', 'delete')),
  colunas_alteradas text[] not null default '{}',
  usuario_id uuid,
  quando timestamptz not null default now()
);
create index registros_empresa_quando_idx on public.registros_atividades (empresa_id, quando desc);

-- ---------------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------------
-- Autor e data de alteração não podem ser forjados; empresa_id não pode mudar.
create function privado.carimbar()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.criado_por := coalesce(auth.uid(), new.criado_por);
    new.criado_em := now();
  else
    new.criado_por := old.criado_por;
    new.criado_em := old.criado_em;
    if to_jsonb(new) ? 'empresa_id' and (to_jsonb(new) ->> 'empresa_id') is distinct from (to_jsonb(old) ->> 'empresa_id') then
      raise exception 'Não é permitido mover um registro para outra empresa.' using errcode = '42501';
    end if;
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['empresas', 'usuarios_empresas', 'clientes', 'clientes_documentos', 'eventos', 'contas',
                           'categorias', 'recorrencias', 'lancamentos', 'inscricoes_workshop', 'fechamentos_mensais'] loop
    execute format('create trigger carimbar before insert or update on public.%I for each row execute function privado.carimbar()', t);
  end loop;
end $$;

-- Mês fechado trava os lançamentos daquele mês (reabrir = marcar o fechamento como excluído).
create function privado.mes_fechado(p_empresa uuid, p_data date)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.fechamentos_mensais f
    where f.empresa_id = p_empresa and f.excluido_em is null
      and f.mes_referencia = date_trunc('month', p_data)::date
  );
$$;

create function privado.travar_mes_fechado()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op in ('UPDATE', 'DELETE')
     and privado.mes_fechado(old.empresa_id, coalesce(old.data_pagamento, old.data_vencimento)) then
    raise exception 'Este mês está fechado. Reabra o mês para alterar.' using errcode = '42501';
  end if;
  if tg_op in ('INSERT', 'UPDATE')
     and privado.mes_fechado(new.empresa_id, coalesce(new.data_pagamento, new.data_vencimento)) then
    raise exception 'Este mês está fechado. Reabra o mês para lançar nele.' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger travar_mes_fechado before insert or update or delete on public.lancamentos
  for each row execute function privado.travar_mes_fechado();

-- Registro de atividades nas tabelas sensíveis.
create function privado.registrar_atividade()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_cols text[] := '{}';
  v_reg jsonb := coalesce(v_new, v_old);
begin
  if tg_op = 'UPDATE' then
    select coalesce(array_agg(k order by k), '{}') into v_cols
    from jsonb_object_keys(v_new) k
    where k not in ('atualizado_em') and v_new -> k is distinct from v_old -> k;
    if cardinality(v_cols) = 0 then return new; end if;
  end if;
  insert into public.registros_atividades (empresa_id, tabela, registro_id, acao, colunas_alteradas, usuario_id)
  values (
    (v_reg ->> 'empresa_id')::uuid, tg_table_name,
    coalesce((v_reg ->> 'id')::uuid, (v_reg ->> 'cliente_id')::uuid),
    lower(tg_op), v_cols, auth.uid()
  );
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['clientes', 'clientes_documentos', 'eventos', 'lancamentos', 'inscricoes_workshop',
                           'fechamentos_mensais', 'usuarios_empresas', 'recorrencias', 'contas'] loop
    execute format('create trigger registrar_atividade after insert or update or delete on public.%I for each row execute function privado.registrar_atividade()', t);
  end loop;
end $$;

-- Categorias padrão em toda empresa nova (lista da entrevista com a Aline).
create function privado.criar_categorias_padrao()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.categorias (empresa_id, nome, tipo, natureza, fonte) values
    (new.id, 'Decoração', 'entrada', 'receita', 'decoracao'),
    (new.id, 'Assessoria', 'entrada', 'receita', 'assessoria'),
    (new.id, 'Workshop', 'entrada', 'receita', 'workshop'),
    (new.id, 'Outras entradas', 'entrada', 'receita', null),
    (new.id, 'Flores', 'saida', 'variavel', null),
    (new.id, 'Balões', 'saida', 'variavel', null),
    (new.id, 'Material de consumo', 'saida', 'variavel', null),
    (new.id, 'Deslocamento', 'saida', 'variavel', null),
    (new.id, 'Freelancers', 'saida', 'variavel', null),
    (new.id, 'Taxas de cartão', 'saida', 'variavel', null),
    (new.id, 'Peças perdidas ou quebradas', 'saida', 'variavel', null),
    (new.id, 'Aluguel', 'saida', 'fixo', null),
    (new.id, 'Internet e telefone', 'saida', 'fixo', null),
    (new.id, 'Impostos (DAS)', 'saida', 'fixo', null),
    (new.id, 'Ferramentas e assinaturas', 'saida', 'fixo', null),
    (new.id, 'Retirada da proprietária', 'saida', 'retirada', null);
  return new;
end;
$$;

create trigger criar_categorias_padrao after insert on public.empresas
  for each row execute function privado.criar_categorias_padrao();

-- ---------------------------------------------------------------------------
-- RLS: ligado em tudo, uma política por operação
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['empresas', 'usuarios_empresas', 'clientes', 'clientes_documentos', 'eventos', 'contas',
                           'categorias', 'recorrencias', 'lancamentos', 'inscricoes_workshop', 'fechamentos_mensais',
                           'registros_atividades'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- empresas: membros leem; só a proprietária altera. Criação e exclusão só pelo painel (service role).
create policy empresas_select on public.empresas for select to authenticated
  using (privado.eh_membro(id));
create policy empresas_update on public.empresas for update to authenticated
  using (privado.tem_papel(id, '{proprietaria}')) with check (privado.tem_papel(id, '{proprietaria}'));

-- usuarios_empresas: cada um vê o próprio vínculo; a proprietária gerencia a equipe.
create policy usuarios_empresas_select on public.usuarios_empresas for select to authenticated
  using (usuario_id = auth.uid() or privado.tem_papel(empresa_id, '{proprietaria}'));
create policy usuarios_empresas_insert on public.usuarios_empresas for insert to authenticated
  with check (privado.tem_papel(empresa_id, '{proprietaria}'));
create policy usuarios_empresas_update on public.usuarios_empresas for update to authenticated
  using (privado.tem_papel(empresa_id, '{proprietaria}')) with check (privado.tem_papel(empresa_id, '{proprietaria}'));
create policy usuarios_empresas_delete on public.usuarios_empresas for delete to authenticated
  using (privado.tem_papel(empresa_id, '{proprietaria}') and usuario_id <> auth.uid());

-- clientes, eventos e inscrições: proprietária e assistente. Freelancer não vê (v1).
do $$
declare t text;
begin
  foreach t in array array['clientes', 'eventos', 'inscricoes_workshop'] loop
    execute format('create policy %1$s_select on public.%1$I for select to authenticated using (privado.tem_papel(empresa_id, ''{proprietaria,assistente}''))', t);
    execute format('create policy %1$s_insert on public.%1$I for insert to authenticated with check (privado.tem_papel(empresa_id, ''{proprietaria,assistente}''))', t);
    execute format('create policy %1$s_update on public.%1$I for update to authenticated using (privado.tem_papel(empresa_id, ''{proprietaria,assistente}'')) with check (privado.tem_papel(empresa_id, ''{proprietaria,assistente}''))', t);
    execute format('create policy %1$s_delete on public.%1$I for delete to authenticated using (privado.tem_papel(empresa_id, ''{proprietaria}''))', t);
  end loop;
end $$;

-- CPF/CNPJ: só a proprietária, em todas as operações.
create policy clientes_documentos_select on public.clientes_documentos for select to authenticated
  using (privado.tem_papel(empresa_id, '{proprietaria}'));
create policy clientes_documentos_insert on public.clientes_documentos for insert to authenticated
  with check (privado.tem_papel(empresa_id, '{proprietaria}'));
create policy clientes_documentos_update on public.clientes_documentos for update to authenticated
  using (privado.tem_papel(empresa_id, '{proprietaria}')) with check (privado.tem_papel(empresa_id, '{proprietaria}'));
create policy clientes_documentos_delete on public.clientes_documentos for delete to authenticated
  using (privado.tem_papel(empresa_id, '{proprietaria}'));

-- Financeiro: quem vê o financeiro lê e lança; só a proprietária apaga de vez.
do $$
declare t text;
begin
  foreach t in array array['contas', 'categorias', 'recorrencias', 'lancamentos'] loop
    execute format('create policy %1$s_select on public.%1$I for select to authenticated using (privado.ve_financeiro(empresa_id))', t);
    execute format('create policy %1$s_insert on public.%1$I for insert to authenticated with check (privado.ve_financeiro(empresa_id))', t);
    execute format('create policy %1$s_update on public.%1$I for update to authenticated using (privado.ve_financeiro(empresa_id)) with check (privado.ve_financeiro(empresa_id))', t);
    execute format('create policy %1$s_delete on public.%1$I for delete to authenticated using (privado.tem_papel(empresa_id, ''{proprietaria}''))', t);
  end loop;
end $$;

-- Fechar e reabrir o mês: só a proprietária. Quem vê o financeiro consulta.
create policy fechamentos_select on public.fechamentos_mensais for select to authenticated
  using (privado.ve_financeiro(empresa_id));
create policy fechamentos_insert on public.fechamentos_mensais for insert to authenticated
  with check (privado.tem_papel(empresa_id, '{proprietaria}'));
create policy fechamentos_update on public.fechamentos_mensais for update to authenticated
  using (privado.tem_papel(empresa_id, '{proprietaria}')) with check (privado.tem_papel(empresa_id, '{proprietaria}'));

-- Registro de atividades: só leitura, só a proprietária. Escrita apenas pelo gatilho.
create policy registros_select on public.registros_atividades for select to authenticated
  using (privado.tem_papel(empresa_id, '{proprietaria}'));
revoke insert, update, delete, truncate on public.registros_atividades from authenticated;

-- ---------------------------------------------------------------------------
-- Views (respeitam a RLS de quem consulta)
-- ---------------------------------------------------------------------------
create view public.saldos_contas with (security_invoker = true) as
select c.empresa_id, c.id as conta_id, c.nome,
       c.saldo_inicial + coalesce(sum(case when l.tipo = 'entrada' then l.valor else -l.valor end)
         filter (where l.data_pagamento is not null and l.data_pagamento >= c.data_saldo_inicial and l.excluido_em is null), 0) as saldo
from public.contas c
left join public.lancamentos l on l.conta_id = c.id and l.empresa_id = c.empresa_id
where c.excluido_em is null
group by c.empresa_id, c.id, c.nome, c.saldo_inicial;

create view public.resultado_eventos with (security_invoker = true) as
select e.empresa_id, e.id as evento_id, e.titulo, e.fonte, e.data_evento, e.valor_fechado,
       coalesce(sum(l.valor) filter (where l.tipo = 'entrada' and l.data_pagamento is not null), 0) as recebido,
       coalesce(sum(l.valor) filter (where l.tipo = 'entrada' and l.data_pagamento is null), 0) as a_receber,
       coalesce(sum(l.valor) filter (where l.tipo = 'saida'), 0) as custos
from public.eventos e
left join public.lancamentos l on l.evento_id = e.id and l.empresa_id = e.empresa_id and l.excluido_em is null
where e.excluido_em is null
group by e.empresa_id, e.id, e.titulo, e.fonte, e.data_evento, e.valor_fechado;

revoke all on public.saldos_contas, public.resultado_eventos from anon;

-- Nenhuma função do schema privado fica executável por qualquer um; só o que as políticas e gatilhos precisam.
revoke all on all functions in schema privado from public;
grant execute on function privado.eh_membro(uuid), privado.tem_papel(uuid, public.papel_usuario[]),
  privado.ve_financeiro(uuid), privado.mes_fechado(uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Operações que precisam ser atômicas (rodam com a permissão de quem chama: security invoker)
-- ---------------------------------------------------------------------------
-- Cria o evento e as parcelas previstas: entrada (padrão 30%) e saldo até N dias antes (padrão 5).
create function public.criar_evento(
  p_empresa uuid, p_titulo text, p_tipo public.tipo_evento, p_fonte public.fonte_receita,
  p_cliente uuid, p_data_evento date, p_cidade text, p_valor_fechado numeric,
  p_entrada_percentual numeric, p_data_entrada date, p_conta uuid,
  p_vagas int default null, p_valor_inscricao numeric default null
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_evento uuid;
  v_categoria uuid;
  v_dias int;
  v_entrada numeric(12, 2);
begin
  insert into public.eventos (empresa_id, cliente_id, titulo, tipo, fonte, data_evento, cidade, valor_fechado, vagas, valor_inscricao)
  values (p_empresa, p_cliente, p_titulo, p_tipo, p_fonte, p_data_evento, p_cidade, coalesce(p_valor_fechado, 0), p_vagas, p_valor_inscricao)
  returning id into v_evento;

  if p_fonte <> 'workshop' and coalesce(p_valor_fechado, 0) > 0 then
    select id into v_categoria from public.categorias
    where empresa_id = p_empresa and natureza = 'receita' and fonte = p_fonte and excluido_em is null
    order by criado_em limit 1;
    if v_categoria is null then
      raise exception 'Categoria de receita não encontrada.' using errcode = '23503';
    end if;
    select dias_saldo_antes_evento into v_dias from public.empresas where id = p_empresa;
    v_entrada := round(p_valor_fechado * least(greatest(p_entrada_percentual, 0), 100) / 100, 2);

    if v_entrada > 0 then
      insert into public.lancamentos (empresa_id, tipo, valor, data_vencimento, conta_id, categoria_id, evento_id, descricao)
      values (p_empresa, 'entrada', v_entrada, p_data_entrada, p_conta, v_categoria, v_evento,
              'Entrada (' || case when p_entrada_percentual = trunc(p_entrada_percentual) then trunc(p_entrada_percentual)::int::text else replace(round(p_entrada_percentual, 1)::text, '.', ',') end || '%)');
    end if;
    if p_valor_fechado - v_entrada > 0 then
      insert into public.lancamentos (empresa_id, tipo, valor, data_vencimento, conta_id, categoria_id, evento_id, descricao)
      values (p_empresa, 'entrada', p_valor_fechado - v_entrada, p_data_evento - coalesce(v_dias, 5), p_conta, v_categoria, v_evento, 'Saldo');
    end if;
  end if;
  return v_evento;
end;
$$;

-- Marca a inscrição como paga e lança a entrada no financeiro do workshop.
create function public.pagar_inscricao(p_inscricao uuid, p_conta uuid, p_data date default current_date)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_insc public.inscricoes_workshop;
  v_categoria uuid;
  v_lanc uuid;
begin
  select * into v_insc from public.inscricoes_workshop where id = p_inscricao and excluido_em is null for update;
  if not found then
    raise exception 'Inscrição não encontrada.' using errcode = '42501';
  end if;
  if v_insc.status = 'paga' then
    return v_insc.lancamento_id;
  end if;
  select id into v_categoria from public.categorias
  where empresa_id = v_insc.empresa_id and natureza = 'receita' and fonte = 'workshop' and excluido_em is null
  order by criado_em limit 1;
  insert into public.lancamentos (empresa_id, tipo, valor, data_vencimento, data_pagamento, conta_id, categoria_id, evento_id, descricao)
  values (v_insc.empresa_id, 'entrada', v_insc.valor, p_data, p_data, p_conta, v_categoria, v_insc.evento_id, 'Inscrição no workshop')
  returning id into v_lanc;
  update public.inscricoes_workshop set status = 'paga', lancamento_id = v_lanc where id = p_inscricao;
  return v_lanc;
end;
$$;

revoke all on function public.criar_evento(uuid, text, public.tipo_evento, public.fonte_receita, uuid, date, text, numeric, numeric, date, uuid, int, numeric),
  public.pagar_inscricao(uuid, uuid, date) from public, anon;
grant execute on function public.criar_evento(uuid, text, public.tipo_evento, public.fonte_receita, uuid, date, text, numeric, numeric, date, uuid, int, numeric),
  public.pagar_inscricao(uuid, uuid, date) to authenticated;

-- ============================================================
-- 20261029090000_contratos_e_logistica.sql
-- ============================================================
-- Contratos, dados da empresa para documentos, logística do evento e geração dos custos fixos.
-- Mesmas regras de segurança da migração anterior (RLS por empresa e perfil, uma política por operação).

-- ---------------------------------------------------------------------------
-- Dados da empresa que aparecem nos contratos e recibos (editáveis em Configurações)
-- ---------------------------------------------------------------------------
alter table public.empresas
  add column razao_social text check (length(razao_social) <= 160),
  add column cnpj text check (cnpj ~ '^[0-9]{14}$'),
  add column telefones text check (length(telefones) <= 80),
  add column email_contato text check (email_contato ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column endereco text check (length(endereco) <= 200),
  add column cidade_foro text check (length(cidade_foro) <= 80),
  add column banco_nome text check (length(banco_nome) <= 60),
  add column banco_agencia text check (length(banco_agencia) <= 20),
  add column banco_conta text check (length(banco_conta) <= 30),
  add column banco_favorecido text check (length(banco_favorecido) <= 120),
  add column pix_chave text check (length(pix_chave) <= 120),
  add column responsavel_nome text check (length(responsavel_nome) <= 120);

-- ---------------------------------------------------------------------------
-- Logística do evento (aparece no contrato)
-- ---------------------------------------------------------------------------
alter table public.eventos
  add column local_nome text check (length(local_nome) <= 120),
  add column local_endereco text check (length(local_endereco) <= 200),
  add column entrega_em timestamptz,
  add column devolucao_em timestamptz,
  add constraint eventos_devolucao_depois_entrega check (devolucao_em is null or entrega_em is null or devolucao_em >= entrega_em);

-- ---------------------------------------------------------------------------
-- Contratos: cópia congelada ("dados") do que foi emitido, para valer como documento.
-- Contém CPF/CNPJ da cliente: só a proprietária acessa.
-- ---------------------------------------------------------------------------
create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  evento_id uuid not null,
  numero text not null check (numero ~ '^[0-9]{6}/[0-9]{3}$'),
  versao int not null default 1 check (versao >= 1),
  emitido_em timestamptz not null default now(),
  assinado_em date,
  cancelado_em timestamptz,
  dados jsonb not null check (jsonb_typeof(dados) = 'object'),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null default auth.uid(),
  excluido_em timestamptz,
  unique (empresa_id, numero, versao),
  foreign key (empresa_id, evento_id) references public.eventos (empresa_id, id) on delete restrict
);
create index contratos_empresa_idx on public.contratos (empresa_id, emitido_em desc);
create index contratos_evento_idx on public.contratos (evento_id);

create trigger carimbar before insert or update on public.contratos
  for each row execute function privado.carimbar();
create trigger registrar_atividade after insert or update or delete on public.contratos
  for each row execute function privado.registrar_atividade();

alter table public.contratos enable row level security;
revoke all on public.contratos from anon;

create policy contratos_select on public.contratos for select to authenticated
  using (privado.tem_papel(empresa_id, '{proprietaria}'));
create policy contratos_insert on public.contratos for insert to authenticated
  with check (privado.tem_papel(empresa_id, '{proprietaria}'));
create policy contratos_update on public.contratos for update to authenticated
  using (privado.tem_papel(empresa_id, '{proprietaria}')) with check (privado.tem_papel(empresa_id, '{proprietaria}'));
create policy contratos_delete on public.contratos for delete to authenticated
  using (privado.tem_papel(empresa_id, '{proprietaria}'));

-- Emite um contrato. Número no formato do contrato da Aline: AAMMDD da data do evento + "/" + sequência do dia.
-- Reemitir o mesmo evento mantém o número e sobe a versão (V.1, V.2...).
create function public.emitir_contrato(p_evento uuid, p_dados jsonb)
returns public.contratos language plpgsql security invoker set search_path = '' as $$
declare
  v_evento public.eventos;
  v_numero text;
  v_versao int;
  v_seq int;
  v_contrato public.contratos;
begin
  select * into v_evento from public.eventos where id = p_evento and excluido_em is null;
  if not found then
    raise exception 'Evento não encontrado.' using errcode = '42501';
  end if;
  if not privado.tem_papel(v_evento.empresa_id, '{proprietaria}') then
    raise exception 'Só a proprietária emite contratos.' using errcode = '42501';
  end if;

  -- Trava por empresa para duas emissões ao mesmo tempo não pegarem o mesmo número.
  perform pg_advisory_xact_lock(hashtext('contratos:' || v_evento.empresa_id::text));

  select numero, max(versao) + 1 into v_numero, v_versao
  from public.contratos
  where evento_id = p_evento and excluido_em is null
  group by numero
  order by numero
  limit 1;

  if v_numero is null then
    select count(distinct numero) + 1 into v_seq
    from public.contratos
    where empresa_id = v_evento.empresa_id and numero like to_char(v_evento.data_evento, 'YYMMDD') || '/%';
    v_numero := to_char(v_evento.data_evento, 'YYMMDD') || '/' || lpad(v_seq::text, 3, '0');
    v_versao := 1;
  end if;

  insert into public.contratos (empresa_id, evento_id, numero, versao, dados)
  values (v_evento.empresa_id, p_evento, v_numero, v_versao, coalesce(p_dados, '{}'::jsonb))
  returning * into v_contrato;
  return v_contrato;
end;
$$;

revoke all on function public.emitir_contrato(uuid, jsonb) from public, anon;
grant execute on function public.emitir_contrato(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Custos fixos: cria os lançamentos previstos de cada mês até p_ate (sem duplicar).
-- Dia 31 em mês curto vira o último dia do mês. Meses fechados são pulados.
-- ---------------------------------------------------------------------------
create function public.gerar_recorrencias(p_empresa uuid, p_ate date)
returns int language plpgsql security invoker set search_path = '' as $$
declare
  r public.recorrencias;
  v_mes date;
  v_venc date;
  v_criados int := 0;
begin
  if not privado.ve_financeiro(p_empresa) then
    raise exception 'Sem acesso ao financeiro desta empresa.' using errcode = '42501';
  end if;
  for r in select * from public.recorrencias where empresa_id = p_empresa and ativa and excluido_em is null loop
    v_mes := date_trunc('month', current_date)::date;
    while v_mes <= p_ate loop
      v_venc := least(v_mes + (r.dia_vencimento - 1), (v_mes + interval '1 month - 1 day')::date);
      if not privado.mes_fechado(p_empresa, v_venc)
         and not exists (
           select 1 from public.lancamentos l
           where l.recorrencia_id = r.id and l.excluido_em is null
             and date_trunc('month', l.data_vencimento) = date_trunc('month', v_venc)
         ) then
        insert into public.lancamentos (empresa_id, tipo, valor, data_vencimento, conta_id, categoria_id, recorrencia_id, descricao)
        values (p_empresa, 'saida', r.valor, v_venc, r.conta_id, r.categoria_id, r.id, r.descricao);
        v_criados := v_criados + 1;
      end if;
      v_mes := (v_mes + interval '1 month')::date;
    end loop;
  end loop;
  return v_criados;
end;
$$;

revoke all on function public.gerar_recorrencias(uuid, date) from public, anon;
grant execute on function public.gerar_recorrencias(uuid, date) to authenticated;

-- ============================================================
-- 20261029100000_permissoes_api.sql
-- ============================================================
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

-- ============================================================
-- 20261029110000_revoga_rls_auto_enable.sql
-- ============================================================
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

-- ============================================================
-- 20261030090000_parcelas_e_recorrencias.sql
-- ============================================================
-- Parcelamento e repetição mensal direto no "Lançar".
-- 1) Recorrências passam a valer também para entradas e podem começar num mês futuro.
-- 2) Clientes ganham CEP.
-- 3) Lançamentos parcelados guardam o grupo e o número da parcela (para mostrar "2 de 5" e excluir as seguintes).

alter table public.recorrencias
  add column tipo public.tipo_lancamento not null default 'saida',
  add column inicio date;

alter table public.clientes
  add column cep text check (cep ~ '^[0-9]{8}$');

alter table public.lancamentos
  add column parcela_grupo uuid,
  add column parcela_num smallint,
  add column parcela_total smallint,
  add constraint lancamentos_parcela_ck check (
    (parcela_grupo is null and parcela_num is null and parcela_total is null)
    or (parcela_grupo is not null and parcela_total between 2 and 60 and parcela_num between 1 and parcela_total)
  );
create index lancamentos_parcela_grupo_idx on public.lancamentos (parcela_grupo) where parcela_grupo is not null;

create or replace function public.gerar_recorrencias(p_empresa uuid, p_ate date)
returns int language plpgsql security invoker set search_path = '' as $$
declare
  r public.recorrencias;
  v_mes date;
  v_venc date;
  v_criados int := 0;
begin
  if not privado.ve_financeiro(p_empresa) then
    raise exception 'Sem acesso ao financeiro desta empresa.' using errcode = '42501';
  end if;
  for r in select * from public.recorrencias where empresa_id = p_empresa and ativa and excluido_em is null loop
    v_mes := greatest(date_trunc('month', current_date)::date, date_trunc('month', coalesce(r.inicio, current_date))::date);
    while v_mes <= p_ate loop
      v_venc := least(v_mes + (r.dia_vencimento - 1), (v_mes + interval '1 month - 1 day')::date);
      if not privado.mes_fechado(p_empresa, v_venc)
         and not exists (
           select 1 from public.lancamentos l
           where l.recorrencia_id = r.id and l.excluido_em is null
             and date_trunc('month', l.data_vencimento) = date_trunc('month', v_venc)
         ) then
        insert into public.lancamentos (empresa_id, tipo, valor, data_vencimento, conta_id, categoria_id, recorrencia_id, descricao)
        values (p_empresa, r.tipo, r.valor, v_venc, r.conta_id, r.categoria_id, r.id, r.descricao);
        v_criados := v_criados + 1;
      end if;
      v_mes := (v_mes + interval '1 month')::date;
    end loop;
  end loop;
  return v_criados;
end;
$$;

revoke all on function public.gerar_recorrencias(uuid, date) from public, anon;
grant execute on function public.gerar_recorrencias(uuid, date) to authenticated;

-- ============================================================
-- 20261031090000_agenda_e_google.sql
-- ============================================================
-- Agenda: compromissos criados no sistema (reunião, visita, compra) e ligação com o Google Agenda.
-- Os eventos (festa, entrega e devolução) continuam vindo da tabela eventos; aqui entram os outros compromissos.
-- A ligação com o Google fica em google_contas e google_vinculos: RLS ligada, sem nenhuma política e sem
-- permissão para anon e authenticated. Só a Edge Function google-agenda, com a chave de serviço, lê e escreve.

create table public.compromissos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  titulo text not null check (length(trim(titulo)) between 2 and 120),
  inicio timestamptz not null,
  fim timestamptz not null,
  dia_inteiro boolean not null default false,
  local text check (length(local) <= 200),
  notas text check (length(notas) <= 500),
  evento_id uuid,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null default auth.uid(),
  excluido_em timestamptz,
  unique (empresa_id, id),
  check (fim >= inicio),
  foreign key (empresa_id, evento_id) references public.eventos (empresa_id, id) on delete set null (evento_id)
);
create index compromissos_empresa_inicio_idx on public.compromissos (empresa_id, inicio);

alter table public.compromissos enable row level security;
revoke all on public.compromissos from anon;
create policy compromissos_select on public.compromissos for select to authenticated
  using (privado.tem_papel(empresa_id, '{proprietaria,assistente}'));
create policy compromissos_insert on public.compromissos for insert to authenticated
  with check (privado.tem_papel(empresa_id, '{proprietaria,assistente}'));
create policy compromissos_update on public.compromissos for update to authenticated
  using (privado.tem_papel(empresa_id, '{proprietaria,assistente}')) with check (privado.tem_papel(empresa_id, '{proprietaria,assistente}'));
create policy compromissos_delete on public.compromissos for delete to authenticated
  using (privado.tem_papel(empresa_id, '{proprietaria}'));
grant select, insert, update, delete on public.compromissos to authenticated;
grant all on public.compromissos to service_role;

create trigger carimbar before insert or update on public.compromissos for each row execute function privado.carimbar();
create trigger registrar_atividade after insert or update or delete on public.compromissos for each row execute function privado.registrar_atividade();

-- Conta Google ligada (uma por empresa). O token de renovação fica cifrado pela Edge Function (AES-GCM).
create table public.google_contas (
  empresa_id uuid primary key references public.empresas (id) on delete cascade,
  usuario_id uuid references auth.users (id) on delete set null,
  email text,
  token_cifrado text not null,
  calendario_id text,
  conectado_em timestamptz not null default now(),
  ultimo_erro text,
  ultimo_erro_em timestamptz
);

-- Qual evento do Google corresponde a cada item do sistema.
create table public.google_vinculos (
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  origem text not null check (origem in ('compromisso', 'evento', 'entrega', 'devolucao')),
  origem_id uuid not null,
  google_evento_id text not null,
  atualizado_em timestamptz not null default now(),
  primary key (empresa_id, origem, origem_id)
);

alter table public.google_contas enable row level security;
alter table public.google_vinculos enable row level security;
revoke all on public.google_contas, public.google_vinculos from public, anon, authenticated;
grant select, insert, update, delete on public.google_contas, public.google_vinculos to service_role;
