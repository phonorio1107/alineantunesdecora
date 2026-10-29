import { useEffect, useMemo } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useSessao } from './auth/Sessao'
import Entrar from './auth/Entrar'
import NovaSenha from './auth/NovaSenha'
import { supabaseConfigurado } from './lib/supabase'
import { useVinculo } from './data/consultas'
import { mensagemErro } from './lib/erros'
import logo from './assets/logo.png'
import { Girando } from './components/ui'
import { AvisoProvider, EmpresaProvider, FolhasProvider } from './app/contexto'
import Layout from './components/Layout'
import Inicio from './paginas/Inicio'
import Lancamentos from './paginas/Lancamentos'
import Eventos, { EventoDetalhe } from './paginas/Eventos'
import Clientes from './paginas/Clientes'
import Contratos from './paginas/Contratos'
import Relatorios from './paginas/Relatorios'
import Configuracoes from './paginas/Configuracoes'
import Mais from './paginas/Mais'
import Agenda from './paginas/Agenda'

export default function App() {
  const { sessao, carregando } = useSessao()
  const { pathname } = useLocation()
  const navegar = useNavigate()
  // Ao sair, a próxima pessoa que entrar começa pelo Início (e não na última tela de quem saiu).
  useEffect(() => {
    if (!carregando && !sessao && pathname !== '/' && pathname !== '/nova-senha') navegar('/', { replace: true })
  }, [carregando, sessao, pathname, navegar])
  if (!supabaseConfigurado) return <Aviso titulo="Sistema não configurado" texto="Faltam as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Veja o .env.example." />
  if (carregando) return <Abrindo />
  if (pathname === '/nova-senha') return <NovaSenha />
  if (!sessao) return <Entrar />
  return <ComEmpresa usuarioId={sessao.user.id} />
}

function ComEmpresa({ usuarioId }: { usuarioId: string }) {
  const vinculo = useVinculo(usuarioId)
  const v = vinculo.data
  const valor = useMemo(() => v && {
    empresa: v.empresas,
    empresaId: v.empresa_id,
    papel: v.papel,
    ehProprietaria: v.papel === 'proprietaria',
    veFinanceiro: v.papel === 'proprietaria' || (v.papel === 'assistente' && v.financeiro_liberado),
  }, [v])
  if (vinculo.isPending) return <Abrindo />
  if (vinculo.isError) return <Aviso titulo="Não foi possível abrir" texto={mensagemErro(vinculo.error)} />
  if (!valor) return <Aviso titulo="Sem acesso a nenhuma empresa" texto="Peça para a proprietária enviar um convite." />
  const fin = valor.veFinanceiro
  return (
    <EmpresaProvider valor={valor}>
      <AvisoProvider>
        <FolhasProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Inicio />} />
              <Route path="lancamentos" element={fin ? <Lancamentos /> : <Navigate to="/" replace />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="eventos" element={<Eventos />} />
              <Route path="eventos/:id" element={<EventoDetalhe />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="contratos" element={<Contratos />} />
              <Route path="relatorios" element={fin ? <Relatorios /> : <Navigate to="/" replace />} />
              <Route path="configuracoes" element={<Configuracoes />} />
              <Route path="mais" element={<Mais />} />
              <Route path="*" element={<NaoEncontrada />} />
            </Route>
          </Routes>
        </FolhasProvider>
      </AvisoProvider>
    </EmpresaProvider>
  )
}

function NaoEncontrada() {
  return (
    <div className="vazio">
      <b>Página não encontrada.</b>
      O endereço pode ter mudado.
      <a className="btn btn-s" href="/">Voltar para o início</a>
    </div>
  )
}

/** Depois de entrar, enquanto o sistema busca a empresa e o perfil: logo e o círculo girando. */
function Abrindo() {
  return (
    <main className="conteudo abrindo" aria-busy="true">
      <img src={logo} alt="Aline Antunes Decora" />
      <Girando tamanho={40} />
      <p className="muted">Abrindo o sistema…</p>
    </main>
  )
}

function Aviso({ titulo, texto }: { titulo: string; texto?: string }) {
  return (
    <main className="conteudo" style={{ minHeight: '100dvh', justifyContent: 'center', alignItems: 'center' }}>
      <div className="cartao" style={{ maxWidth: 380, textAlign: 'center', alignItems: 'center' }}>
        <img src={logo} alt="Aline Antunes Decora" style={{ height: 56 }} />
        <h1 style={{ fontSize: 22 }}>{titulo}</h1>
        {texto ? <p className="muted">{texto}</p> : null}
      </div>
    </main>
  )
}
