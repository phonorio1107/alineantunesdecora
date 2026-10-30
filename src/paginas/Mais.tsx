import { Link } from 'react-router-dom'
import { Boxes, ChartColumn, ChevronRight, List, SlidersHorizontal, Users } from 'lucide-react'
import { useEmpresa } from '../app/contexto'

export default function Mais() {
  const { veFinanceiro } = useEmpresa()
  const itens = [
    ...(veFinanceiro ? [{ para: '/relatorios', nome: 'Relatórios', Icone: ChartColumn }, { para: '/lancamentos', nome: 'Lançamentos', Icone: List }] : []),
    { para: '/clientes', nome: 'Clientes', Icone: Users },
    { para: '/estoque', nome: 'Estoque', Icone: Boxes },
    { para: '/configuracoes', nome: 'Configurações', Icone: SlidersHorizontal },
  ]
  return (
    <>
      <div className="cabecalho"><div><h1>Mais</h1></div></div>
      <section className="cartao">
        <nav className="links">
          {itens.map(({ para, nome, Icone }) => (
            <Link key={para} to={para}><Icone size={20} className="ic" aria-hidden="true" />{nome}<ChevronRight size={20} className="ic" aria-hidden="true" /></Link>
          ))}
        </nav>
      </section>
    </>
  )
}
