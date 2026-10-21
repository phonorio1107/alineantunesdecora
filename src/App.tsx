import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Agenda from './pages/Agenda'
import Orcamentos from './pages/Orcamentos'
import OrdensServico from './pages/OrdensServico'
import Clientes from './pages/Clientes'
import Estoque from './pages/Estoque'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="orcamentos" element={<Orcamentos />} />
        <Route path="ordens" element={<OrdensServico />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="estoque" element={<Estoque />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
