-- =============================================================================
-- Aline Antunes Decora · atualização de 26/11/2026: pagamento no cartão de crédito com juros da operadora
-- Cole tudo no SQL Editor do Supabase e clique em Run. Roda uma vez só.
-- Se aparecer o aviso sobre RLS, escolha "Run and enable RLS".
-- Não apaga nem muda nenhum dado: só acrescenta campos às parcelas e a opção de cartão ao fechar a venda.
-- =============================================================================

begin;

-- Forma de pagamento por parcela e cartão de crédito com juros da operadora (pedido da Aline, 26/11/2026).
-- No cartão o dinheiro cai de uma vez (antecipado); a Aline digita o total que a maquininha mostra.
-- A parcela guarda o valor do serviço (o que conta no lucro); os juros ficam à parte, só para o cliente e o contrato.

alter table public.lancamentos
  add column forma_pagamento text
    check (forma_pagamento in ('pix', 'transferencia', 'dinheiro', 'cartao_credito', 'cartao_debito', 'boleto')),
  add column cartao_vezes smallint check (cartao_vezes between 1 and 12),
  add column cartao_juros numeric(12, 2) check (cartao_juros >= 0),
  add constraint lancamentos_cartao_so_no_credito
    check ((cartao_vezes is null and cartao_juros is null) or forma_pagamento = 'cartao_credito');

comment on column public.lancamentos.forma_pagamento is 'Como o cliente paga esta parcela (aparece no contrato).';
comment on column public.lancamentos.cartao_vezes is 'Cartão de crédito: em quantas vezes o cliente parcelou.';
comment on column public.lancamentos.cartao_juros is 'Cartão de crédito: juros da operadora repassados ao cliente (fora do lucro).';

-- Fechar venda ganha a forma do saldo. Sem os parâmetros novos, funciona como antes.
drop function public.fechar_orcamento(uuid, numeric, jsonb, numeric, date, uuid);
create function public.fechar_orcamento(
  p_evento uuid, p_valor numeric, p_areas jsonb, p_entrada_percentual numeric, p_data_entrada date, p_conta uuid,
  p_forma_saldo text default null, p_cartao_vezes int default null, p_cartao_juros numeric default null, p_data_saldo date default null
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_ev public.eventos;
  v_areas jsonb;
  v_fonte public.fonte_receita;
  v_categoria uuid;
  v_dias int;
  v_entrada numeric(12, 2);
  v_valor numeric(12, 2) := round(coalesce(p_valor, 0), 2);
  v_cartao boolean := p_forma_saldo = 'cartao_credito';
begin
  select * into v_ev from public.eventos where id = p_evento and excluido_em is null for update;
  if not found then
    raise exception 'Orçamento não encontrado.' using errcode = '42501';
  end if;
  if v_ev.status::text <> 'orcamento' then
    raise exception 'Este orçamento já foi fechado.' using errcode = '22023';
  end if;
  if v_cartao and (p_cartao_vezes is null or p_cartao_vezes not between 1 and 12) then
    raise exception 'Informe em quantas vezes no cartão (de 1 a 12).' using errcode = '22023';
  end if;
  if coalesce(p_cartao_juros, 0) < 0 then
    raise exception 'O total no cartão não pode ser menor que o saldo.' using errcode = '22023';
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
      insert into public.lancamentos (empresa_id, tipo, valor, data_vencimento, conta_id, categoria_id, evento_id, descricao,
                                      forma_pagamento, cartao_vezes, cartao_juros)
      values (v_ev.empresa_id, 'entrada', v_valor - v_entrada,
              case when v_cartao then coalesce(p_data_saldo, p_data_entrada) else coalesce(p_data_saldo, v_ev.data_evento - coalesce(v_dias, 5)) end,
              p_conta, v_categoria, p_evento,
              case when v_cartao then 'Saldo no cartão (' || p_cartao_vezes || 'x)' else 'Saldo' end,
              p_forma_saldo,
              case when v_cartao then p_cartao_vezes end,
              case when v_cartao then round(coalesce(p_cartao_juros, 0), 2) end);
    end if;
  end if;
end;
$$;

revoke all on function public.fechar_orcamento(uuid, numeric, jsonb, numeric, date, uuid, text, int, numeric, date) from public, anon;
grant execute on function public.fechar_orcamento(uuid, numeric, jsonb, numeric, date, uuid, text, int, numeric, date) to authenticated;

insert into controle.migracoes (nome, como) values ('20261126090000_pagamento_cartao.sql', 'sql editor')
on conflict (nome) do nothing;

commit;
