import { NavLink, Outlet } from 'react-router-dom'
import logo from '../assets/logo.png'
import { CalendarHeart, CheckCircle2, ClipboardList, FileText, Home, Package, Plus, Users } from 'lucide-react'
import { useStore } from '../data/store'
import NovaOS from './NovaOS'

const nav = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/agenda', label: 'Agenda', icon: CalendarHeart },
  { to: '/orcamentos', label: 'Orçamentos', icon: FileText },
  { to: '/ordens', label: 'Ordens', icon: ClipboardList },
  { to: '/estoque', label: 'Acervo', icon: Package },
  { to: '/clientes', label: 'Clientes', icon: Users },
]

// No celular a barra inferior tem o botão "+" no meio; Orçamentos e Clientes ficam no topo.
const mobileEsquerda = [nav[0], nav[1]]
const mobileDireita = [nav[3], nav[4]]
const mobileTopo = [nav[2], nav[5]]

function ItemMobile({ to, label, icon: Icon }: (typeof nav)[number]) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${isActive ? 'text-brand-600' : 'text-ink-400'}`}
    >
      {({ isActive }) => (
        <>
          <span className={`rounded-full px-4 py-1 transition ${isActive ? 'bg-brand-100' : ''}`}>
            <Icon className="size-5" strokeWidth={isActive ? 2.2 : 1.8} />
          </span>
          {label}
        </>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const { abrirNovaOS, aviso } = useStore()
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-brand-100 lg:bg-white/70 lg:backdrop-blur">
        <div className="px-6 pt-8 pb-6">
          <img src={logo} alt="Aline Antunes Decora" className="h-auto w-44" />
        </div>
        <div className="px-3 pb-4">
          <button onClick={abrirNovaOS} className="btn-primary w-full">
            <Plus className="size-4" /> Nova OS
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-700 hover:bg-brand-50'
                }`
              }
            >
              <Icon className="size-[18px]" strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="m-4 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 p-4">
          <p className="font-display text-base text-brand-800">Mais de 10 anos</p>
          <p className="mt-1 text-xs text-ink-500">transformando festas em memórias.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-brand-100 bg-white/85 px-4 py-3 backdrop-blur lg:hidden">
          <img src={logo} alt="Aline Antunes Decora" className="h-9 w-auto" />
          <div className="flex items-center gap-1">
            {mobileTopo.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                aria-label={label}
                className={({ isActive }) => `grid size-10 place-items-center rounded-xl transition ${isActive ? 'bg-brand-100 text-brand-700' : 'text-ink-700 hover:bg-brand-50'}`}
              >
                <Icon className="size-5" strokeWidth={1.8} />
              </NavLink>
            ))}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
          <Outlet />
        </main>
      </div>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-brand-100 bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end">
          {mobileEsquerda.map((item) => <ItemMobile key={item.to} {...item} />)}
          <div className="flex justify-center">
            <button
              onClick={abrirNovaOS}
              aria-label="Nova ordem de serviço"
              className="-mt-6 mb-2 grid size-14 place-items-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-300/60 ring-4 ring-white transition hover:bg-brand-600 active:scale-95"
            >
              <Plus className="size-7" strokeWidth={2.4} />
            </button>
          </div>
          {mobileDireita.map((item) => <ItemMobile key={item.to} {...item} />)}
        </div>
      </nav>

      <NovaOS />

      {aviso && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 lg:bottom-8">
          <p className="flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg" role="status">
            <CheckCircle2 className="size-4 text-emerald-400" /> {aviso}
          </p>
        </div>
      )}
    </div>
  )
}
