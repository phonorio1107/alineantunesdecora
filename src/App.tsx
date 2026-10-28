import { useSessao } from './auth/Sessao'
import Entrar from './auth/Entrar'
import { supabaseConfigurado } from './lib/supabase'
import { useSaldos, useVinculo } from './data/consultas'
import { mensagemErro } from './lib/erros'
import { formatBRL } from './lib/format'

// Casca da v1: login e um início mínimo para provar a ligação com o banco.
// As telas do protótipo entram aqui na Fase 6 (Início, Lançar, Lançamentos, Eventos, Clientes, Relatórios, Configurações).
export default function App() {
  const { sessao, carregando } = useSessao()
  if (!supabaseConfigurado) return <Aviso titulo="Sistema não configurado" texto="Faltam as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Veja o .env.example." />
  if (carregando) return <Aviso titulo="Carregando…" />
  if (!sessao) return <Entrar />
  return <Inicio />
}

function Inicio() {
  const { sair } = useSessao()
  const vinculo = useVinculo()
  const empresa = vinculo.data?.empresa_id ?? ''
  const saldos = useSaldos(empresa)

  if (vinculo.isPending) return <Aviso titulo="Carregando…" />
  if (vinculo.isError) return <Aviso titulo="Não foi possível abrir" texto={mensagemErro(vinculo.error)} />
  if (!vinculo.data) return <Aviso titulo="Sem acesso a nenhuma empresa" texto="Peça para a proprietária enviar um convite." />

  const total = (saldos.data ?? []).reduce((t, s) => t + Number(s.saldo), 0)
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold">Olá!</h1>
        <button className="btn-ghost min-h-11" onClick={() => sair()}>Sair</button>
      </header>
      <section className="card p-5">
        <p className="text-sm text-ink-500">Saldo hoje</p>
        {saldos.isError ? (
          <p className="text-sm text-red-800">{mensagemErro(saldos.error)}</p>
        ) : (
          <p className="text-3xl font-semibold tabular-nums">{saldos.isPending ? '…' : formatBRL(total)}</p>
        )}
      </section>
    </main>
  )
}

function Aviso({ titulo, texto }: { titulo: string; texto?: string }) {
  return (
    <main className="min-h-dvh grid place-items-center px-4">
      <div className="card max-w-sm p-6 text-center flex flex-col gap-2">
        <h1 className="font-display text-xl font-semibold">{titulo}</h1>
        {texto && <p className="text-sm text-ink-700">{texto}</p>}
      </div>
    </main>
  )
}
