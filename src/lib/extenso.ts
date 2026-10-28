// Valor por extenso em reais, para recibos: 1250.5 → "mil, duzentos e cinquenta reais e cinquenta centavos".

const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

function ate999(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'cem'
  const c = Math.floor(n / 100)
  const resto = n % 100
  const partes: string[] = []
  if (c) partes.push(CENTENAS[c])
  if (resto < 20) {
    if (resto) partes.push(UNIDADES[resto])
  } else {
    const d = Math.floor(resto / 10)
    const u = resto % 10
    partes.push(u ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d])
  }
  return partes.join(' e ')
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return 'zero'
  const grupos: [number, string, string][] = [
    [1_000_000_000, 'bilhão', 'bilhões'],
    [1_000_000, 'milhão', 'milhões'],
    [1_000, 'mil', 'mil'],
  ]
  const partes: { texto: string; valor: number }[] = []
  let resto = n
  for (const [div, sing, plur] of grupos) {
    const q = Math.floor(resto / div)
    if (q) {
      const nome = q === 1 ? sing : plur
      partes.push({ texto: div === 1000 && q === 1 ? 'mil' : `${ate999(q)} ${nome}`, valor: q * div })
      resto %= div
    }
  }
  if (resto) partes.push({ texto: ate999(resto), valor: resto })
  // "e" antes do último grupo quando ele é menor que 100 ou centena redonda: "mil e cem", "mil e vinte".
  return partes
    .map((p, i) => {
      if (i === 0) return p.texto
      const usaE = i === partes.length - 1 && (p.valor < 100 || p.valor % 100 === 0)
      return (usaE ? ' e ' : ', ') + p.texto
    })
    .join('')
}

export function reaisPorExtenso(valor: number): string {
  const centavosTotal = Math.round(Math.abs(valor) * 100)
  const reais = Math.floor(centavosTotal / 100)
  const centavos = centavosTotal % 100
  const partes: string[] = []
  if (reais) {
    const milhaoRedondo = reais >= 1_000_000 && reais % 1_000_000 === 0
    partes.push(`${inteiroPorExtenso(reais)}${milhaoRedondo ? ' de' : ''} ${reais === 1 ? 'real' : 'reais'}`)
  }
  if (centavos) partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`)
  if (!partes.length) return 'zero reais'
  return partes.join(' e ')
}
