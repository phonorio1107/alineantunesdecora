-- Vendas e estoque (pedidos da Aline depois de usar o sistema, 30/10/2026).
-- 1) Inscrição estadual da cliente com CNPJ (junto do CPF/CNPJ: só a proprietária vê).
-- 2) Vendas em etapas: o evento nasce como "orcamento" e vira contrato (confirmado) ao fechar.
-- 3) Um evento pode ter várias áreas (decoração, assessoria, workshop), com o valor de cada uma.
-- 4) Itens da venda separados em peças e serviços. A peça do estoque pode ganhar outro nome só naquela venda.
-- 5) Estoque: peças de acervo (saem e voltam) e de consumo (saem de vez), com o custo de cada uma.
--    A quantidade é a soma dos movimentos. Quando a venda fecha, o banco dá baixa sozinho no que é consumo;
--    no acervo, só o que não voltou da festa (conferência da devolução).

-- ---------------------------------------------------------------------------
-- 1) Inscrição estadual
-- ---------------------------------------------------------------------------
alter table public.clientes_documentos
  add column inscricao_estadual text check (inscricao_estadual ~ '^([0-9]{2,14}|ISENTO)$'),
  add constraint clientes_documentos_ie_so_cnpj check (inscricao_estadual is null or length(cpf_cnpj) = 14);

-- ---------------------------------------------------------------------------
-- 2) e 3) Orçamento como etapa do evento e áreas com valor
-- ---------------------------------------------------------------------------
-- O valor novo só pode ser usado depois que a transação termina; por isso o código abaixo compara status::text.
alter type public.status_evento add value if not exists 'orcamento' before 'confirmado';

alter table public.eventos
  add column areas jsonb not null default '{}'::jsonb,
  add column conferido_em timestamptz,
  -- Quando o orçamento virou venda. Cancelado sem esta data = orçamento que não fechou.
  add column fechado_em timestamptz,
  add column observacoes text check (length(observacoes) <= 2000),
  add constraint eventos_areas_ck check (
    jsonb_typeof(areas) = 'object'
    and (areas - array['decoracao', 'assessoria', 'workshop']) = '{}'::jsonb
    and not jsonb_path_exists(areas, '$.* ? (@.type() != "number" || @ < 0)')
  );

-- Eventos que já existiam: uma área só, com o valor fechado inteiro. Sem poluir o registro de atividades.
alter table public.eventos disable trigger registrar_atividade;
update public.eventos set areas = jsonb_build_object(fonte::text, valor_fechado), fechado_em = criado_em;
alter table public.eventos enable trigger registrar_atividade;

-- ---------------------------------------------------------------------------
-- 5) Estoque
-- ---------------------------------------------------------------------------
create table public.pecas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  codigo text not null check (length(trim(codigo)) between 1 and 20),
  nome text not null check (length(trim(nome)) between 2 and 120),
  categoria text check (length(categoria) <= 60),
  tipo text not null default 'acervo' check (tipo in ('acervo', 'consumo')),
  custo_unitario numeric(12, 2) not null default 0 check (custo_unitario >= 0),
  observacoes text check (length(observacoes) <= 300),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null default auth.uid(),
  excluido_em timestamptz,
  unique (empresa_id, id)
);
create unique index pecas_codigo_idx on public.pecas (empresa_id, lower(trim(codigo))) where excluido_em is null;
create index pecas_empresa_nome_idx on public.pecas (empresa_id, nome);

-- Livro de movimentos: só entra linha, nunca se altera. "ajuste" é a pessoa (cadastro, compra, contagem);
-- "evento" é o banco, ao fechar ou mudar uma venda.
create table public.estoque_movimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  peca_id uuid not null,
  evento_id uuid,
  quantidade int not null check (quantidade <> 0),
  motivo text not null check (motivo in ('ajuste', 'evento')),
  observacao text check (length(observacao) <= 200),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null default auth.uid(),
  foreign key (empresa_id, peca_id) references public.pecas (empresa_id, id) on delete cascade,
  foreign key (empresa_id, evento_id) references public.eventos (empresa_id, id) on delete set null (evento_id),
  check (motivo = 'ajuste' or evento_id is not null)
);
create index estoque_movimentos_peca_idx on public.estoque_movimentos (peca_id);
create index estoque_movimentos_evento_idx on public.estoque_movimentos (evento_id) where evento_id is not null;

-- ---------------------------------------------------------------------------
-- 4) Itens da venda
-- ---------------------------------------------------------------------------
create table public.eventos_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  evento_id uuid not null,
  tipo text not null check (tipo in ('peca', 'servico')),
  peca_id uuid,
  -- Nome que aparece no contrato. Pode ser diferente do nome da peça no estoque.
  descricao text not null check (length(trim(descricao)) between 1 and 160),
  quantidade int not null default 1 check (quantidade between 1 and 100000),
  valor_unitario numeric(12, 2) not null default 0 check (valor_unitario >= 0),
  -- Peças de acervo que não voltaram da festa (perdidas ou quebradas).
  perdidas int not null default 0 check (perdidas >= 0 and perdidas <= quantidade),
  ordem int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null default auth.uid(),
  unique (empresa_id, id),
  foreign key (empresa_id, evento_id) references public.eventos (empresa_id, id) on delete cascade,
  foreign key (empresa_id, peca_id) references public.pecas (empresa_id, id) on delete restrict,
  check (peca_id is null or tipo = 'peca')
);
create index eventos_itens_evento_idx on public.eventos_itens (evento_id, ordem);
create index eventos_itens_peca_idx on public.eventos_itens (peca_id) where peca_id is not null;

-- ---------------------------------------------------------------------------
-- Gatilhos, RLS e permissões das tabelas novas
-- ---------------------------------------------------------------------------
create trigger carimbar before insert or update on public.pecas for each row execute function privado.carimbar();
create trigger carimbar before insert or update on public.estoque_movimentos for each row execute function privado.carimbar();
create trigger carimbar before insert or update on public.eventos_itens for each row execute function privado.carimbar();
create trigger registrar_atividade after insert or update or delete on public.pecas for each row execute function privado.registrar_atividade();
create trigger registrar_atividade after insert or update or delete on public.eventos_itens for each row execute function privado.registrar_atividade();

alter table public.pecas enable row level security;
alter table public.estoque_movimentos enable row level security;
alter table public.eventos_itens enable row level security;
revoke all on public.pecas, public.estoque_movimentos, public.eventos_itens from anon;

-- Peças e itens: proprietária e assistente (como clientes e eventos). Só a proprietária apaga.
do $$
declare t text;
begin
  foreach t in array array['pecas', 'eventos_itens'] loop
    execute format('create policy %1$s_select on public.%1$I for select to authenticated using (privado.tem_papel(empresa_id, ''{proprietaria,assistente}''))', t);
    execute format('create policy %1$s_insert on public.%1$I for insert to authenticated with check (privado.tem_papel(empresa_id, ''{proprietaria,assistente}''))', t);
    execute format('create policy %1$s_update on public.%1$I for update to authenticated using (privado.tem_papel(empresa_id, ''{proprietaria,assistente}'')) with check (privado.tem_papel(empresa_id, ''{proprietaria,assistente}''))', t);
  end loop;
end $$;
create policy pecas_delete on public.pecas for delete to authenticated
  using (privado.tem_papel(empresa_id, '{proprietaria}'));
-- Item de venda sai da lista com delete (é rascunho do orçamento); a baixa no estoque se desfaz sozinha.
create policy eventos_itens_delete on public.eventos_itens for delete to authenticated
  using (privado.tem_papel(empresa_id, '{proprietaria,assistente}'));

-- Movimentos: quem cuida do estoque lê e faz ajustes. Movimento de evento só o banco cria. Ninguém altera nem apaga.
create policy estoque_movimentos_select on public.estoque_movimentos for select to authenticated
  using (privado.tem_papel(empresa_id, '{proprietaria,assistente}'));
create policy estoque_movimentos_insert on public.estoque_movimentos for insert to authenticated
  with check (privado.tem_papel(empresa_id, '{proprietaria,assistente}') and motivo = 'ajuste' and evento_id is null);

grant select, insert, update, delete on public.pecas, public.eventos_itens to authenticated;
grant select, insert on public.estoque_movimentos to authenticated;
grant all on public.pecas, public.estoque_movimentos, public.eventos_itens to service_role;

-- Estoque com a quantidade atual de cada peça (respeita a RLS de quem consulta).
create view public.estoque_pecas with (security_invoker = true) as
select p.id, p.empresa_id, p.codigo, p.nome, p.categoria, p.tipo, p.custo_unitario, p.observacoes, p.criado_em, p.atualizado_em,
       coalesce(sum(m.quantidade), 0)::int as quantidade
from public.pecas p
left join public.estoque_movimentos m on m.peca_id = p.id and m.empresa_id = p.empresa_id
where p.excluido_em is null
group by p.id;
revoke all on public.estoque_pecas from anon;
grant select on public.estoque_pecas to authenticated;
grant select on public.estoque_pecas to service_role;

-- ---------------------------------------------------------------------------
-- Baixa automática: deixa os movimentos "evento" de uma venda iguais ao que ela pede.
-- Venda fechada (confirmado ou realizado): consumo sai inteiro; acervo sai só o que não voltou.
-- Orçamento, cancelado ou excluído: nada sai (o que já tinha saído volta).
-- ---------------------------------------------------------------------------
create function privado.sincronizar_estoque(p_evento uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_ev public.eventos;
  v_ativa boolean;
  r record;
begin
  select * into v_ev from public.eventos where id = p_evento;
  if not found then return; end if;
  v_ativa := v_ev.excluido_em is null and v_ev.status::text in ('confirmado', 'realizado');
  for r in
    with desejado as (
      select i.peca_id, sum(case when p.tipo = 'consumo' then i.quantidade else i.perdidas end) as qtd
      from public.eventos_itens i
      join public.pecas p on p.id = i.peca_id
      where i.evento_id = p_evento and v_ativa
      group by i.peca_id
    ), atual as (
      select m.peca_id, -sum(m.quantidade) as qtd
      from public.estoque_movimentos m
      where m.evento_id = p_evento and m.motivo = 'evento'
      group by m.peca_id
    )
    select coalesce(d.peca_id, a.peca_id) as peca_id, coalesce(d.qtd, 0) - coalesce(a.qtd, 0) as dif
    from desejado d full join atual a on a.peca_id = d.peca_id
  loop
    if r.dif <> 0 then
      insert into public.estoque_movimentos (empresa_id, peca_id, evento_id, quantidade, motivo, observacao)
      values (v_ev.empresa_id, r.peca_id, p_evento, -r.dif, 'evento', left(v_ev.titulo, 200));
    end if;
  end loop;
end;
$$;

create function privado.estoque_por_item()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op <> 'INSERT' then perform privado.sincronizar_estoque(old.evento_id); end if;
  if tg_op <> 'DELETE' and (tg_op = 'INSERT' or new.evento_id is distinct from old.evento_id) then
    perform privado.sincronizar_estoque(new.evento_id);
  end if;
  return null;
end;
$$;

create function privado.estoque_por_evento()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform privado.sincronizar_estoque(new.id);
  return null;
end;
$$;

create trigger estoque after insert or update or delete on public.eventos_itens
  for each row execute function privado.estoque_por_item();
create trigger estoque after update of status, excluido_em on public.eventos
  for each row when (old.status is distinct from new.status or old.excluido_em is distinct from new.excluido_em)
  execute function privado.estoque_por_evento();

revoke all on function privado.sincronizar_estoque(uuid), privado.estoque_por_item(), privado.estoque_por_evento() from public;

-- ---------------------------------------------------------------------------
-- Funções de venda
-- ---------------------------------------------------------------------------
-- Área principal: a de maior valor entre decoração e assessoria; workshop só quando é a única.
create function privado.area_principal(p_areas jsonb, p_padrao public.fonte_receita)
returns public.fonte_receita language sql stable set search_path = '' as $$
  select coalesce(
    (select key::public.fonte_receita from jsonb_each(p_areas) where key <> 'workshop' order by value::numeric desc, key limit 1),
    case when p_areas ? 'workshop' then 'workshop'::public.fonte_receita end,
    p_padrao
  );
$$;
revoke all on function privado.area_principal(jsonb, public.fonte_receita) from public;
grant execute on function privado.area_principal(jsonb, public.fonte_receita) to authenticated;

-- Fecha o orçamento: vira contrato (confirmado), guarda o valor de cada área e cria a entrada e o saldo.
-- Sem acesso ao financeiro, fecha sem criar parcelas (a proprietária cadastra depois).
create function public.fechar_orcamento(
  p_evento uuid, p_valor numeric, p_areas jsonb, p_entrada_percentual numeric, p_data_entrada date, p_conta uuid
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_ev public.eventos;
  v_areas jsonb;
  v_fonte public.fonte_receita;
  v_categoria uuid;
  v_dias int;
  v_entrada numeric(12, 2);
  v_valor numeric(12, 2) := round(coalesce(p_valor, 0), 2);
begin
  select * into v_ev from public.eventos where id = p_evento and excluido_em is null for update;
  if not found then
    raise exception 'Orçamento não encontrado.' using errcode = '42501';
  end if;
  if v_ev.status::text <> 'orcamento' then
    raise exception 'Este orçamento já foi fechado.' using errcode = '22023';
  end if;
  v_areas := coalesce(p_areas, v_ev.areas);
  if v_areas = '{}'::jsonb then
    v_areas := jsonb_build_object(v_ev.fonte::text, v_valor);
  end if;
  if (select count(*) from jsonb_object_keys(v_areas)) = 1 then
    v_areas := jsonb_build_object((select k from jsonb_object_keys(v_areas) k), v_valor);
  elsif (select round(coalesce(sum(value::numeric), 0), 2) from jsonb_each_text(v_areas)) <> v_valor then
    raise exception 'A soma das áreas precisa dar o valor fechado.' using errcode = '22023';
  end if;
  v_fonte := privado.area_principal(v_areas, v_ev.fonte);

  update public.eventos
  set status = 'confirmado'::text::public.status_evento, valor_fechado = v_valor, areas = v_areas, fonte = v_fonte, fechado_em = now()
  where id = p_evento;

  if v_fonte <> 'workshop' and v_valor > 0 and privado.ve_financeiro(v_ev.empresa_id) then
    select id into v_categoria from public.categorias
    where empresa_id = v_ev.empresa_id and natureza = 'receita' and fonte = v_fonte and excluido_em is null
    order by criado_em limit 1;
    if v_categoria is null then
      raise exception 'Categoria de receita não encontrada.' using errcode = '23503';
    end if;
    select dias_saldo_antes_evento into v_dias from public.empresas where id = v_ev.empresa_id;
    v_entrada := round(v_valor * least(greatest(coalesce(p_entrada_percentual, 0), 0), 100) / 100, 2);
    if v_entrada > 0 then
      insert into public.lancamentos (empresa_id, tipo, valor, data_vencimento, conta_id, categoria_id, evento_id, descricao)
      values (v_ev.empresa_id, 'entrada', v_entrada, p_data_entrada, p_conta, v_categoria, p_evento,
              'Entrada (' || case when p_entrada_percentual = trunc(p_entrada_percentual) then trunc(p_entrada_percentual)::int::text else replace(round(p_entrada_percentual, 1)::text, '.', ',') end || '%)');
    end if;
    if v_valor - v_entrada > 0 then
      insert into public.lancamentos (empresa_id, tipo, valor, data_vencimento, conta_id, categoria_id, evento_id, descricao)
      values (v_ev.empresa_id, 'entrada', v_valor - v_entrada, v_ev.data_evento - coalesce(v_dias, 5), p_conta, v_categoria, p_evento, 'Saldo');
    end if;
  end if;
end;
$$;

-- criar_evento ganha as áreas e a opção de nascer como orçamento. Os parâmetros antigos continuam iguais.
drop function public.criar_evento(uuid, text, public.tipo_evento, public.fonte_receita, uuid, date, text, numeric, numeric, date, uuid, int, numeric);
create function public.criar_evento(
  p_empresa uuid, p_titulo text, p_tipo public.tipo_evento, p_fonte public.fonte_receita,
  p_cliente uuid, p_data_evento date, p_cidade text, p_valor_fechado numeric,
  p_entrada_percentual numeric, p_data_entrada date, p_conta uuid,
  p_vagas int default null, p_valor_inscricao numeric default null,
  p_areas jsonb default null, p_orcamento boolean default false
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_evento uuid;
  v_areas jsonb := coalesce(p_areas, jsonb_build_object(p_fonte::text, coalesce(p_valor_fechado, 0)));
begin
  insert into public.eventos (empresa_id, cliente_id, titulo, tipo, fonte, data_evento, cidade, valor_fechado, vagas, valor_inscricao, areas, status)
  values (p_empresa, p_cliente, p_titulo, p_tipo, privado.area_principal(v_areas, p_fonte), p_data_evento, p_cidade, coalesce(p_valor_fechado, 0),
          p_vagas, p_valor_inscricao, v_areas, 'orcamento'::text::public.status_evento)
  returning id into v_evento;
  if not coalesce(p_orcamento, false) then
    perform public.fechar_orcamento(v_evento, coalesce(p_valor_fechado, 0), v_areas, p_entrada_percentual, p_data_entrada, p_conta);
  end if;
  return v_evento;
end;
$$;

-- Contrato só sai de venda fechada.
create or replace function public.emitir_contrato(p_evento uuid, p_dados jsonb)
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
  if v_evento.status::text = 'orcamento' then
    raise exception 'Feche o orçamento antes de gerar o contrato.' using errcode = '22023';
  end if;

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

revoke all on function public.fechar_orcamento(uuid, numeric, jsonb, numeric, date, uuid),
  public.criar_evento(uuid, text, public.tipo_evento, public.fonte_receita, uuid, date, text, numeric, numeric, date, uuid, int, numeric, jsonb, boolean)
  from public, anon;
grant execute on function public.fechar_orcamento(uuid, numeric, jsonb, numeric, date, uuid),
  public.criar_evento(uuid, text, public.tipo_evento, public.fonte_receita, uuid, date, text, numeric, numeric, date, uuid, int, numeric, jsonb, boolean)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Resultado por evento: orçamento ainda não é venda, fica de fora. Ganha as áreas (relatório por área).
-- ---------------------------------------------------------------------------
create or replace view public.resultado_eventos with (security_invoker = true) as
select e.empresa_id, e.id as evento_id, e.titulo, e.fonte, e.data_evento, e.valor_fechado,
       coalesce(sum(l.valor) filter (where l.tipo = 'entrada' and l.data_pagamento is not null), 0) as recebido,
       coalesce(sum(l.valor) filter (where l.tipo = 'entrada' and l.data_pagamento is null), 0) as a_receber,
       coalesce(sum(l.valor) filter (where l.tipo = 'saida'), 0) as custos,
       e.areas
from public.eventos e
left join public.lancamentos l on l.evento_id = e.id and l.empresa_id = e.empresa_id and l.excluido_em is null
where e.excluido_em is null and e.status::text <> 'orcamento'
group by e.empresa_id, e.id, e.titulo, e.fonte, e.data_evento, e.valor_fechado, e.areas;
