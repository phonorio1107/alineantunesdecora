// Mensagem clara para a pessoa; detalhe técnico só no console, sem dados pessoais.

interface ErroBanco {
  code?: string
  message?: string
}

const MENSAGENS: Record<string, string> = {
  '42501': 'Você não tem permissão para fazer isso.',
  '23503': 'Este registro está ligado a outro que não existe ou não pode ser apagado.',
  '23505': 'Já existe um registro igual.',
  '23514': 'Algum valor está fora do permitido. Confira os campos.',
  PGRST301: 'Sua sessão expirou. Entre de novo.',
}

export function mensagemErro(erro: unknown): string {
  const e = (erro ?? {}) as ErroBanco
  // Mensagens que o próprio banco escreve em português (ex.: mês fechado) podem ir direto para a tela.
  if (e.code === '42501' && e.message?.startsWith('Este mês está fechado')) return e.message
  if (e.code && MENSAGENS[e.code]) return MENSAGENS[e.code]
  if (erro instanceof TypeError) return 'Sem conexão. Confira a internet e tente de novo.'
  return 'Algo deu errado. Tente de novo em instantes.'
}

export function registrarErro(contexto: string, erro: unknown) {
  const e = (erro ?? {}) as ErroBanco
  // Só código e contexto: a mensagem do banco pode repetir valores digitados.
  console.error(`[${contexto}]`, e.code ?? (erro instanceof Error ? erro.name : 'erro'))
}

/** Lança o erro do Supabase (se houver) depois de registrá-lo. */
export function verificar<T>(contexto: string, resposta: { data: T; error: unknown }): T {
  if (resposta.error) {
    registrarErro(contexto, resposta.error)
    throw resposta.error
  }
  return resposta.data
}
