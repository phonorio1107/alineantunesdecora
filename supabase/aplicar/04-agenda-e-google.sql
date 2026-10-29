-- =============================================================================
-- Aline Antunes Decora · atualização de 31/10/2026: Agenda e ligação com o Google Agenda
-- Cole tudo no SQL Editor do Supabase e clique em Run. Roda uma vez só.
-- Se aparecer o aviso sobre RLS, escolha "Run and enable RLS".
-- =============================================================================

begin;

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

insert into controle.migracoes (nome, como) values ('20261031090000_agenda_e_google.sql', 'sql editor')
on conflict (nome) do nothing;

commit;
