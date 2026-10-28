// Junta as consultas do financeiro e calcula os números do painel e dos relatórios.
import { useMemo } from 'react'
import { useCategorias, useContas, useLancamentos, useRecorrencias, useSaldos } from '../data/consultas'
import { custoFixoMensal, fluxoDeCaixa, folego, podeRetirar, primeiroMesNegativo, resumoMes } from '../lib/calculos'
import { addMes, fimMes, hoje, inicioMes, mesDe } from '../lib/format'
import { useEmpresa } from './contexto'

export const MESES_ANTES = 6
export const MESES_DEPOIS = 6

export function periodoCarregado() {
  const m = mesDe(hoje())
  return { de: inicioMes(addMes(m, -MESES_ANTES)), ate: fimMes(addMes(m, MESES_DEPOIS)) }
}

export function useFinanceiro() {
  const { empresaId, empresa, veFinanceiro } = useEmpresa()
  const { de, ate } = periodoCarregado()
  const saldos = useSaldos(empresaId)
  const categorias = useCategorias(empresaId)
  const lancamentos = useLancamentos(empresaId, de, ate)
  const recorrencias = useRecorrencias(empresaId)
  const contas = useContas(empresaId)
  const consultas = [saldos, categorias, lancamentos, recorrencias, contas]

  return useMemo(() => {
    const dia = hoje()
    const mes = mesDe(dia)
    const lista = lancamentos.data ?? []
    const cats = categorias.data ?? []
    const nomes = new Map(cats.map((c) => [c.id, c.nome]))
    const saldoHoje = (saldos.data ?? []).reduce((t, s) => t + Number(s.saldo), 0)
    const fixos = custoFixoMensal(recorrencias.data ?? [])
    const retiradaMinima = Number(empresa.retirada_minima)
    const reserva = Number(empresa.reserva_meses) * fixos
    const resumo = resumoMes(lista, cats, mes)
    const inicioContas = new Map((contas.data ?? []).map((c) => [c.id, c.data_saldo_inicial]))
    const fluxo = fluxoDeCaixa({ lancamentos: lista, saldoHoje, hoje: dia, mesesAntes: MESES_ANTES - 1, mesesDepois: MESES_DEPOIS, retiradaMinima, inicioContas })
    return {
      habilitado: veFinanceiro,
      carregando: consultas.some((c) => c.isPending),
      erro: consultas.find((c) => c.isError)?.error ?? null,
      recarregar: () => consultas.forEach((c) => c.refetch()),
      hoje: dia,
      mes,
      lancamentos: lista,
      categorias: cats,
      nomeCategoria: (id: string) => nomes.get(id) ?? 'Sem categoria',
      saldos: saldos.data ?? [],
      recorrencias: recorrencias.data ?? [],
      saldoHoje,
      fixos,
      reserva,
      retiradaMinima,
      resumo,
      resumoDe: (ym: string) => resumoMes(lista, cats, ym),
      fluxo,
      negativoEm: primeiroMesNegativo(fluxo),
      folego: folego(saldoHoje, fixos, retiradaMinima),
      podeRetirar: podeRetirar(resumo.lucro, resumo.retiradas, saldoHoje, reserva),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saldos.data, categorias.data, lancamentos.data, recorrencias.data, contas.data, empresa, veFinanceiro, ...consultas.map((c) => c.status)])
}

export type Financeiro = ReturnType<typeof useFinanceiro>
