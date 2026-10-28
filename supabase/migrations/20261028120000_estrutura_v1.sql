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
