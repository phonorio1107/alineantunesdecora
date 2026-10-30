// Validação de toda entrada de dados (Zod). As mesmas regras existem no banco; aqui a pessoa vê o erro junto ao campo.
import { z } from 'zod'

const soDigitos = (v: string) => v.replace(/\D/g, '')

/** Aceita "1.250,50", "1250,5" ou "1250.50". */
export const valorEmReais = z
  .union([z.number(), z.string()])
  .transform((v, ctx) => {
    if (typeof v === 'number') return Math.round(v * 100) / 100
    const limpo = v.replace(/[R$\s]/g, '')
    // "1.250,50" e "3.100" usam ponto como separador de milhar (padrão brasileiro); "1250.50" usa ponto decimal.
    const milharComPonto = /^\d{1,3}(\.\d{3})+$/.test(limpo)
    const normalizado = limpo.includes(',')
      ? limpo.replace(/\./g, '').replace(',', '.')
      : milharComPonto
        ? limpo.replace(/\./g, '')
        : limpo
    const n = Number(normalizado)
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: 'custom', message: 'Informe um valor em reais.' })
      return z.NEVER
    }
    return Math.round(n * 100) / 100
  })

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data.')

export const telefone = z
  .string()
  .transform(soDigitos)
  .refine((v) => v === '' || v.length === 10 || v.length === 11, 'Informe o telefone com DDD.')
  .transform((v) => v || null)

export function cpfValido(cpf: string) {
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  const dv = (n: number) => {
    let s = 0
    for (let i = 0; i < n; i++) s += Number(cpf[i]) * (n + 1 - i)
    const r = (s * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(9) === Number(cpf[9]) && dv(10) === Number(cpf[10])
}

export function cnpjValido(cnpj: string) {
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false
  const calc = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const s = pesos.reduce((t, p, i) => t + p * Number(base[i]), 0)
    const r = s % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(cnpj.slice(0, 12)) === Number(cnpj[12]) && calc(cnpj.slice(0, 13)) === Number(cnpj[13])
}

export const cpfCnpj = z
  .string()
  .transform(soDigitos)
  .refine((v) => v === '' || cpfValido(v) || cnpjValido(v), 'Confira o CPF ou o CNPJ.')
  .transform((v) => v || null)

/** Inscrição estadual (só para CNPJ): só os números, ou "ISENTO". */
export const inscricaoEstadual = z
  .string()
  .optional()
  .transform((v) => {
    const t = (v ?? '').trim().toUpperCase()
    return /^ISENT[OA]$/.test(t) ? 'ISENTO' : soDigitos(t)
  })
  .refine((v) => v === '' || v === 'ISENTO' || (v.length >= 2 && v.length <= 14), 'Confira a inscrição estadual (só números, ou ISENTO).')
  .transform((v) => v || null)

export const esquemaLancamento = z.object({
  tipo: z.enum(['entrada', 'saida']),
  valor: valorEmReais.refine((v) => v > 0, 'Informe um valor maior que zero.'),
  categoria_id: z.uuid('Escolha uma categoria.'),
  conta_id: z.uuid('Escolha a conta.'),
  evento_id: z.uuid().nullable().optional(),
  data: data,
  pago: z.boolean(),
  descricao: z.string().trim().max(120, 'Use até 120 caracteres.').optional(),
  /** "parcelado": divide o valor em N meses; "mensal": repete todo mês até ser parado. */
  repetir: z.enum(['nao', 'parcelado', 'mensal']).default('nao'),
  parcelas: z.coerce.number<string | number>().int('Use um número inteiro.').min(2, 'Mínimo de 2 parcelas.').max(60, 'Máximo de 60 parcelas.').optional(),
}).refine((l) => l.repetir !== 'parcelado' || l.parcelas !== undefined, { message: 'Informe em quantas vezes.', path: ['parcelas'] })
export type NovoLancamento = z.input<typeof esquemaLancamento>
export type LancamentoValido = z.output<typeof esquemaLancamento>

export const esquemaCliente = z.object({
  nome: z.string().trim().min(3, 'Informe o nome completo.').max(120),
  telefone,
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Confira o e-mail.')
    .transform((v) => v || null),
  cep: z
    .string()
    .optional()
    .transform((v) => soDigitos(v ?? ''))
    .refine((v) => v === '' || v.length === 8, 'O CEP tem 8 números.')
    .transform((v) => v || null),
  endereco: z.string().trim().max(200).transform((v) => v || null),
  cidade: z.string().trim().max(80).transform((v) => v || null),
  origem: z.enum(['instagram', 'indicacao', 'whatsapp', 'site', 'outra']),
  cpf_cnpj: cpfCnpj,
  inscricao_estadual: inscricaoEstadual,
}).transform((c) => ({ ...c, inscricao_estadual: c.cpf_cnpj?.length === 14 ? c.inscricao_estadual : null }))
export type NovoCliente = z.input<typeof esquemaCliente>
export type ClienteValido = z.output<typeof esquemaCliente>

const AREAS = ['decoracao', 'assessoria', 'workshop'] as const
const valorOpcional = valorEmReais.refine((v) => v >= 0, 'O valor não pode ser negativo.')

/**
 * Nova venda. Nasce como orçamento (sem parcelas) ou já fechada (contrato, com entrada e saldo).
 * Workshop sozinho é a turma aberta: vai direto para os eventos, sem cliente e sem contrato.
 */
export const esquemaEvento = z
  .object({
    titulo: z.string().trim().min(3, 'Dê um nome ao evento.').max(120),
    tipo: z.enum(['infantil', 'casamento', 'quinze_anos', 'cha', 'batizado', 'corporativo', 'workshop', 'outro']),
    areas: z.array(z.enum(AREAS)).min(1, 'Escolha ao menos uma área.'),
    fechado: z.boolean(),
    cliente_id: z.uuid().nullable(),
    data_evento: data,
    cidade: z.string().trim().max(80).transform((v) => v || null),
    valor_fechado: valorOpcional,
    /** Valor de cada área quando a venda tem mais de uma (texto digitado, como os outros valores). */
    valores: z.object({ decoracao: valorOpcional.optional(), assessoria: valorOpcional.optional(), workshop: valorOpcional.optional() }),
    entrada_percentual: z.number().min(0).max(100),
    data_entrada: data,
    conta_id: z.string().transform((v) => v || null),
    vagas: z.number().int().positive().nullable(),
    valor_inscricao: valorEmReais.nullable(),
    observacoes: z.string().trim().max(2000).optional().transform((v) => v || null),
    local_nome: z.string().trim().max(120).optional().transform((v) => v || null),
    local_endereco: z.string().trim().max(200).optional().transform((v) => v || null),
    entrega_em: z.string().optional().transform((v) => (v ? new Date(v).toISOString() : null)),
    devolucao_em: z.string().optional().transform((v) => (v ? new Date(v).toISOString() : null)),
  })
  .transform((e) => {
    const turma = e.areas.length === 1 && e.areas[0] === 'workshop'
    const areasValores: Partial<Record<(typeof AREAS)[number], number>> = {}
    for (const a of e.areas) areasValores[a] = turma ? 0 : e.areas.length === 1 ? e.valor_fechado : e.fechado ? (e.valores[a] ?? 0) : 0
    const principal = e.areas.filter((a) => a !== 'workshop').sort((a, b) => (areasValores[b] ?? 0) - (areasValores[a] ?? 0))[0] ?? 'workshop'
    return { ...e, turma, fechado: turma || e.fechado, areasValores, fonte: principal }
  })
  .refine((e) => e.turma || e.cliente_id, { message: 'Escolha o cliente.', path: ['cliente_id'] })
  .refine((e) => !e.turma || (e.valor_inscricao ?? 0) > 0, { message: 'Informe o valor da inscrição.', path: ['valor_inscricao'] })
  .refine((e) => e.turma || !e.fechado || e.valor_fechado > 0, { message: 'Informe o valor fechado.', path: ['valor_fechado'] })
  .refine((e) => e.turma || !e.fechado || e.areas.length === 1 || Math.round(Object.values(e.areasValores).reduce((t, v) => t + (v ?? 0), 0) * 100) === Math.round(e.valor_fechado * 100), {
    message: 'A soma das áreas precisa dar o valor fechado.',
    path: ['valores'],
  })
export type NovoEvento = z.input<typeof esquemaEvento>
export type EventoValido = z.output<typeof esquemaEvento>

export const esquemaInscricao = z.object({
  nome: z.string().trim().min(3, 'Informe o nome da aluna.').max(120),
  telefone: telefone.refine((v) => v !== null, 'Informe o telefone com DDD.'),
})
export type NovaInscricao = z.input<typeof esquemaInscricao>
export type InscricaoValida = z.output<typeof esquemaInscricao>

export const esquemaPeca = z.object({
  codigo: z.string().trim().min(1, 'Informe o código.').max(20, 'Use até 20 caracteres.'),
  nome: z.string().trim().min(2, 'Descreva a peça.').max(120),
  categoria: z.string().trim().max(60).optional().transform((v) => v || null),
  tipo: z.enum(['acervo', 'consumo']),
  custo_unitario: valorOpcional,
  quantidade: z.coerce.number<string | number>().int('Use um número inteiro.').min(0, 'A quantidade não pode ser negativa.').max(100000),
  observacoes: z.string().trim().max(300).optional().transform((v) => v || null),
})
export type NovaPeca = z.input<typeof esquemaPeca>
export type PecaValida = z.output<typeof esquemaPeca>
