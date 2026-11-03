-- =============================================================================
-- Aline Antunes Decora · LIMPEZA dos dados de teste (apaga tudo que foi lançado no sistema)
-- NÃO DÁ PARA DESFAZER. Cole no SQL Editor do Supabase e clique em Run.
--
-- APAGA:  clientes (e CPF/CNPJ/IE), vendas (orçamentos, contratos, eventos e itens), contratos em PDF,
--         estoque (peças e movimentos), lançamentos, recorrências, inscrições de workshop, compromissos,
--         vínculos com o Google Agenda, fechamentos de mês e o histórico de atividades.
-- MANTÉM: a empresa, as pessoas com acesso (e as senhas), as categorias, as contas (com saldo inicial
--         zerado), a ligação com o Google (se houver) e as configurações.
--
-- Para liberar, troque 'NAO' por 'APAGAR TUDO' na linha marcada abaixo.
-- =============================================================================

do $$
declare
  v_confirmo constant text := 'NAO';   -- <<< troque por: APAGAR TUDO
begin
  if v_confirmo <> 'APAGAR TUDO' then
    raise exception 'Nada foi apagado. Para confirmar, troque ''NAO'' por ''APAGAR TUDO'' na linha marcada e rode de novo.';
  end if;
  raise notice 'Vai apagar: % clientes, % vendas, % lançamentos, % peças, % compromissos.',
    (select count(*) from public.clientes), (select count(*) from public.eventos),
    (select count(*) from public.lancamentos), (select count(*) from public.pecas),
    (select count(*) from public.compromissos);
end $$;

begin;

-- TRUNCATE não dispara os gatilhos (mês fechado, histórico, estoque), então apaga de verdade e de uma vez.
truncate table
  public.google_vinculos,
  public.estoque_movimentos,
  public.eventos_itens,
  public.pecas,
  public.contratos,
  public.inscricoes_workshop,
  public.lancamentos,
  public.recorrencias,
  public.fechamentos_mensais,
  public.compromissos,
  public.eventos,
  public.clientes_documentos,
  public.clientes,
  public.registros_atividades;

update public.contas set saldo_inicial = 0, data_saldo_inicial = current_date;

commit;

select 'Pronto: o sistema está vazio.' as resultado,
       (select count(*) from public.clientes) as clientes,
       (select count(*) from public.eventos) as vendas,
       (select count(*) from public.lancamentos) as lancamentos,
       (select count(*) from public.pecas) as pecas,
       (select count(*) from public.usuarios_empresas where excluido_em is null) as pessoas_com_acesso;
