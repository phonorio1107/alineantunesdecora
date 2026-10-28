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
