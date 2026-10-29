// Máscaras enquanto a pessoa digita. O valor gravado continua só com números (os esquemas Zod tiram a formatação).
import type { ChangeEvent, FocusEvent } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

const digitos = (v: string) => v.replace(/\D/g, '')

/** (11) 98765-4321 ou (11) 3456-7890 */
export function mascaraTelefone(v: string) {
  const d = digitos(v).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** CPF 123.456.789-09 até 11 dígitos; CNPJ 12.345.678/0001-90 a partir do 12º. */
export function mascaraDoc(v: string) {
  const d = digitos(v).slice(0, 14)
  if (d.length <= 11) {
    return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
  }
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

/** Só CNPJ: 12.345.678/0001-90 */
export function mascaraCNPJ(v: string) {
  const d = digitos(v).slice(0, 14)
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

/** 00000-000 */
export function mascaraCEP(v: string) {
  const d = digitos(v).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

/** Ao sair do campo, mostra o valor no padrão brasileiro: "1250,5" vira "1.250,50". */
export function formatarValorDigitado(v: string) {
  const limpo = v.replace(/[R$\s]/g, '')
  if (!limpo) return ''
  const milharComPonto = /^\d{1,3}(\.\d{3})+$/.test(limpo)
  const n = Number(limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : milharComPonto ? limpo.replace(/\./g, '') : limpo)
  if (!Number.isFinite(n)) return v
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Liga uma máscara a um campo do React Hook Form. */
export function comMascara(campo: UseFormRegisterReturn, mascara: (v: string) => string) {
  return {
    ...campo,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      e.target.value = mascara(e.target.value)
      return campo.onChange(e)
    },
  }
}

/** Valor em reais: formata ao sair do campo. */
export function comValor(campo: UseFormRegisterReturn) {
  return {
    ...campo,
    onBlur: (e: FocusEvent<HTMLInputElement>) => {
      e.target.value = formatarValorDigitado(e.target.value)
      void campo.onChange(e)
      return campo.onBlur(e)
    },
  }
}

/** Primeira letra de cada palavra em maiúscula ao sair do campo (nomes e cidades), sem mexer em "de", "da", "dos". */
export function capitalizarNome(v: string) {
  const menores = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])
  return v
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((p, i) => (i > 0 && menores.has(p.toLowerCase()) ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')
}

export function comNome(campo: UseFormRegisterReturn) {
  return {
    ...campo,
    onBlur: (e: FocusEvent<HTMLInputElement>) => {
      e.target.value = capitalizarNome(e.target.value)
      void campo.onChange(e)
      return campo.onBlur(e)
    },
  }
}
