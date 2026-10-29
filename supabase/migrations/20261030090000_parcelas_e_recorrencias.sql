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
