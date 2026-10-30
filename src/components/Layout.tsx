import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Boxes, CalendarHeart, ChartColumn, Handshake, House, List, Menu, Plus, SlidersHorizontal, Users } from 'lucide-react'
import logo from '../assets/logo.png'
import { useEmpresa, useFolhas } from '../app/contexto'
import { periodoCarregado } from '../app/dados'
import { useGerarRecorrencias } from '../data/consultas'
import { Credito } from './ui'
import Folhas from './Folhas'
import { modoDemo } from '../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

// Só existe na prévia: carregado sob demanda para não entrar no build de produção.
const ArquivoGerado = modoDemo ? lazy(() => import('../demo/ArquivoGerado')) : () => null

// Confetes do site da Aline: poucos, só no alto da página, em rosa, amarelo e azul. Caem uma vez por sessão.
function Confete() {
  const [cai] = useState(() => {
    try {
      if (sessionStorage.getItem('confete-caiu')) return false
      sessionStorage.setItem('confete-caiu', '1')
    } catch { /* sem armazenamento: fica parado */ return false }
    return true
  })
  const pontos = useMemo(() => {
    let r = 11
    const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280
    return Array.from({ length: 18 }, (_, k) => ({
      tam: 7 + Math.round(rnd() * 9),
      cor: ['--dot1', '--dot2', '--dot3'][k % 3],
      esq: 52 + rnd() * 46,
      topo: rnd() * 120,
      atraso: rnd() * 0.5,
    }))
  }, [])
  return (
    <div className={`confete${cai ? ' cai' : ''}`} aria-hidden="true">
      <i style={{ width: 300, height: 300, left: -150, top: '24%', background: 'var(--blob1)' }} />
      <i style={{ width: 170, height: 170, right: '5%', top: -60, background: 'var(--blob2)' }} />
      {pontos.map((p, i) => (
        <i key={i} style={{ width: p.tam, height: p.tam, left: `${p.esq}%`, top: p.topo, background: `var(${p.cor})`, ['--atraso' as string]: `${p.atraso}s` }} />
      ))}
    </div>
  )
}

export default function Layout() {
  const { empresaId, veFinanceiro } = useEmpresa()
  const { abrir } = useFolhas()
  const qc = useQueryClient()
  const { pathname } = useLocation()
  const gerar = useGerarRecorrencias(empresaId)
  const { mutate } = gerar

  // Custos fixos: garante os lançamentos previstos dos próximos meses ao abrir o sistema.
  useEffect(() => {
    if (veFinanceiro) mutate(periodoCarregado().ate)
  }, [veFinanceiro, mutate])

  const nav = [
    { para: '/', nome: 'Início', Icone: House, fim: true },
    { para: '/agenda', nome: 'Agenda', Icone: CalendarHeart },
    { para: '/vendas', nome: 'Vendas', Icone: Handshake },
    ...(veFinanceiro ? [{ para: '/lancamentos', nome: 'Lançamentos', Icone: List }] : []),
    { para: '/clientes', nome: 'Clientes', Icone: Users },
    { para: '/estoque', nome: 'Estoque', Icone: Boxes },
    ...(veFinanceiro ? [{ para: '/relatorios', nome: 'Relatórios', Icone: ChartColumn }] : []),
    { para: '/configuracoes', nome: 'Configurações', Icone: SlidersHorizontal },
  ]

  return (
    <>
      <Confete />
      <div className="app">
        <aside className="lateral" aria-label="Menu principal">
          <img className="logo" src={logo} alt="Aline Antunes Decora" />
          <nav className="nav">
            {nav.map(({ para, nome, Icone, fim }) => (
              <NavLink key={para} to={para} end={fim}>
                <Icone size={20} aria-hidden="true" />
                {nome}
              </NavLink>
            ))}
          </nav>
          {veFinanceiro ? (
            <button className="btn btn-p" type="button" onClick={() => abrir({ tipo: 'lancar' })}>
              <Plus size={20} aria-hidden="true" />
              Lançar
            </button>
          ) : null}
          <div className="espaco" />
          {modoDemo ? <SeloDemo aoRecomecar={async () => { (await import('../demo/banco')).recomecar(); qc.invalidateQueries(); mutate(periodoCarregado().ate) }} /> : null}
          <Credito />
        </aside>
        <div className="principal">
          <header className="topo">
            <img className="logo" src={logo} alt="Aline Antunes Decora" />
            {modoDemo ? <span className="pill atencao">Prévia</span> : null}
          </header>
          <main className="conteudo" id="conteudo">
            <div key={pathname.split('/')[1]} className="troca-tela"><Outlet /></div>
          </main>
          <Credito />
        </div>
        <nav className="abas-celular" aria-label="Menu">
          <NavLink to="/" end><House size={22} aria-hidden="true" /><span>Início</span></NavLink>
          <NavLink to="/agenda"><CalendarHeart size={22} aria-hidden="true" /><span>Agenda</span></NavLink>
          {veFinanceiro ? (
            <button className="fab" type="button" onClick={() => abrir({ tipo: 'lancar' })}>
              <span className="circulo"><Plus size={24} aria-hidden="true" /></span>
              <span>Lançar</span>
            </button>
          ) : (
            <NavLink to="/clientes"><Users size={22} aria-hidden="true" /><span>Clientes</span></NavLink>
          )}
          <NavLink to="/vendas"><Handshake size={22} aria-hidden="true" /><span>Vendas</span></NavLink>
          <NavLink to="/mais"><Menu size={22} aria-hidden="true" /><span>Mais</span></NavLink>
        </nav>
      </div>
      <Folhas />
      {modoDemo ? <Suspense fallback={null}><ArquivoGerado /></Suspense> : null}
    </>
  )
}

function SeloDemo({ aoRecomecar }: { aoRecomecar: () => void }) {
  return (
    <div className="previa">
      <b>Prévia · dados fictícios</b>
      <span>Nada é salvo: ao recarregar a página, tudo volta ao início.</span>
      <button type="button" className="btn btn-g btn-sm" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={aoRecomecar}>Recomeçar do zero</button>
    </div>
  )
}
