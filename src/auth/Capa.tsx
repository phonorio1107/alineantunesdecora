// "Capa do caderno": moldura das telas de entrada (entrar, nova senha, código de segurança).
// À esquerda (no celular, em cima) o papel rosado com a borda recortada, como o convite do Início.
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import logo from '../assets/logo.png'
import { Credito } from '../components/ui'

export default function Capa({ titulo, texto, tremer, children, rodape }: { titulo: string; texto?: ReactNode; tremer?: number; children: ReactNode; rodape?: ReactNode }) {
  const form = useRef<HTMLDivElement>(null)
  // Erro ao entrar: o formulário dá uma tremida curta (reinicia a animação a cada nova tentativa).
  useEffect(() => {
    const el = form.current
    if (!el || !tremer) return
    el.classList.remove('treme')
    void el.offsetWidth
    el.classList.add('treme')
  }, [tremer])
  const confetes = useMemo(() => {
    let r = 23
    const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280
    return Array.from({ length: 14 }, (_, k) => ({ tam: 7 + Math.round(rnd() * 10), cor: ['--dot1', '--dot2', '--dot3'][k % 3], esq: 70 + rnd() * 26, topo: 4 + rnd() * 88, atraso: rnd() * 0.6 }))
  }, [])
  return (
    <main className="capa">
      <section className="capa-papel" aria-label="Aline Antunes Decora">
        <div className="capa-confete" aria-hidden="true">
          {confetes.map((c, i) => <i key={i} style={{ width: c.tam, height: c.tam, left: `${c.esq}%`, top: `${c.topo}%`, background: `var(${c.cor})`, ['--atraso' as string]: `${c.atraso}s` }} />)}
        </div>
        <img className="capa-logo" src={logo} alt="Aline Antunes Decora" />
        <p className="capa-frase">Festas lindas, contas em dia.</p>
        <p className="capa-sub">O sistema de gestão da Aline Antunes Decora.</p>
      </section>
      <section className="capa-lado">
        <div className="capa-form" key={titulo} ref={form}>
          <h1>{titulo}</h1>
          {texto ? <p className="capa-texto">{texto}</p> : null}
          {children}
        </div>
        <div className="capa-rodape">{rodape}<Credito /></div>
      </section>
    </main>
  )
}
