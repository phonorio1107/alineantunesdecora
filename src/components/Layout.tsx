import { NavLink, Outlet } from 'react-router-dom'
import logo from '../assets/logo.png'
import { CalendarHeart, ClipboardList, FileText, Home, Package, Users } from 'lucide-react'

const nav = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/agenda', label: 'Agenda', icon: CalendarHeart },
  { to: '/orcamentos', label: 'Orçamentos', icon: FileText },
  { to: '/ordens', label: 'Ordens', icon: ClipboardList },
  { to: '/estoque', label: 'Acervo', icon: Package },
  { to: '/clientes', label: 'Clientes', icon: Users },
]

// No celular a barra inferior mostra os 5 primeiros; Clientes fica no topo.
const mobileNav = nav.slice(0, 5)

export default function Layout() {
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-brand-100 lg:bg-white/70 lg:backdrop-blur">
        <div className="px-6 pt-8 pb-6">
          <img src={logo} alt="Aline Antunes Decora" className="h-auto w-44" />
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
          <NavLink to="/clientes" className="btn-ghost" aria-label="Clientes">
            <Users className="size-5" strokeWidth={1.8} />
          </NavLink>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
          <Outlet />
        </main>
      </div>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-brand-100 bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {mobileNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
                  isActive ? 'text-brand-600' : 'text-ink-400'
                }`
              }
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
          ))}
        </div>
      </nav>
    </div>
  )
}
