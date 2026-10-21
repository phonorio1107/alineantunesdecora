-- Estrutura inicial do sistema Aline Antunes Decora.
-- Espelha os tipos de src/data/types.ts.

create extension if not exists "pgcrypto";

create type tipo_evento as enum ('infantil', 'casamento', 'quinze_anos', 'cha', 'batizado', 'corporativo', 'outro');
create type status_evento as enum ('confirmado', 'pendente', 'realizado', 'cancelado');
create type pacote as enum ('especial', 'excepcional', 'extraordinario', 'exclusivo');
create type status_orcamento as enum ('rascunho', 'enviado', 'aprovado', 'recusado');
create type status_os as enum ('a_preparar', 'separado', 'em_montagem', 'concluida');
create type categoria_item as enum ('paineis', 'mobiliario', 'boleiras', 'bandejas', 'arranjos', 'tecidos', 'iluminacao', 'consumo');
create type conservacao as enum ('otimo', 'bom', 'reparo');
create type origem_cliente as enum ('instagram', 'whatsapp', 'indicacao', 'site', 'outro');

create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  email text,
  cidade text,
  origem origem_cliente not null default 'outro',
  observacoes text,
  criado_em timestamptz not null default now()
);

create table eventos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete restrict,
  titulo text not null,
  tipo tipo_evento not null,
  tema text,
  data date not null,
  hora_montagem time,
  hora_inicio time,
  local text,
  convidados int,
  status status_evento not null default 'pendente',
  criado_em timestamptz not null default now()
);
create index eventos_data_idx on eventos (data);

create sequence orcamento_numero_seq start 1000;

create table orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero int not null unique default nextval('orcamento_numero_seq'),
  cliente_id uuid not null references clientes(id) on delete restrict,
  evento_id uuid references eventos(id) on delete set null,
  pacote pacote not null default 'exclusivo',
  descricao text,
  tipo tipo_evento not null,
  data_evento date,
  valor numeric(12, 2) not null default 0,
  sinal numeric(12, 2) not null default 0,
  status status_orcamento not null default 'rascunho',
  validade date,
  criado_em timestamptz not null default now()
);

create table orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references orcamentos(id) on delete cascade,
  descricao text not null,
  quantidade int not null default 1,
  valor_unitario numeric(12, 2) not null default 0
);

create sequence os_numero_seq start 300;

create table ordens_servico (
  id uuid primary key default gen_random_uuid(),
  numero int not null unique default nextval('os_numero_seq'),
  evento_id uuid not null references eventos(id) on delete cascade,
  status status_os not null default 'a_preparar',
  equipe text[] not null default '{}',
  observacoes text,
  criado_em timestamptz not null default now()
);

create table os_checklist (
  id uuid primary key default gen_random_uuid(),
  ordem_id uuid not null references ordens_servico(id) on delete cascade,
  item text not null,
  feito boolean not null default false,
  ordem int not null default 0
);

-- Acervo: itens próprios usados nas festas (não são alugados ao cliente).
create table itens_estoque (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria categoria_item not null,
  quantidade int not null default 0 check (quantidade >= 0),
  valor_unitario numeric(12, 2) not null default 0,
  volume_litros numeric(10, 2) not null default 0,
  cor text,
  neutra boolean not null default true,
  local text,
  conservacao conservacao not null default 'otimo',
  foto_url text,
  criado_em timestamptz not null default now()
);

-- Quais itens do acervo vão para cada evento (base para checar disponibilidade em festas no mesmo dia).
create table evento_itens (
  evento_id uuid not null references eventos(id) on delete cascade,
  item_id uuid not null references itens_estoque(id) on delete restrict,
  quantidade int not null check (quantidade > 0),
  devolvido int not null default 0,
  primary key (evento_id, item_id)
);

-- Acesso: apenas usuários autenticados (a equipe da Aline).
do $$
declare t text;
begin
  foreach t in array array['clientes', 'eventos', 'orcamentos', 'orcamento_itens', 'ordens_servico', 'os_checklist', 'itens_estoque', 'evento_itens'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "equipe autenticada" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
