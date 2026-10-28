import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Plus, Search } from 'lucide-react'
import { useAvisar, useEmpresa, useFolhas } from '../app/contexto'
import { useAtualizarCliente, useClientes, useDocumentos, useEventos, useSalvarDocumento } from '../data/consultas'
import { cpfCnpj } from '../data/esquemas'
import type { Cliente } from '../data/tipos'
import { Campo, Carregando, ErroCaixa, Exportar, Folha, Vazio } from '../components/ui'
import { abaClientes, baixarCSV, baixarExcel } from '../export/acoes'
import { dataBR, formatDoc, formatTelefone, mascararDoc } from '../lib/format'
import { mensagemErro } from '../lib/erros'

const ORIGEM = { instagram: 'Instagram', indicacao: 'Indicação', whatsapp: 'WhatsApp', site: 'Site', outra: 'Outra' }

export default function Clientes() {
  const { empresaId, empresa, ehProprietaria } = useEmpresa()
  const { abrir } = useFolhas()
  const clientes = useClientes(empresaId)
  const docs = useDocumentos(empresaId, ehProprietaria)
  const [busca, setBusca] = useState('')
  const [aberta, setAberta] = useState<Cliente | null>(null)
  const mapaDocs = useMemo(() => new Map((docs.data ?? []).map((d) => [d.cliente_id, d.cpf_cnpj])), [docs.data])
  const q = busca.trim().toLowerCase()
  const lista = (clientes.data ?? []).filter((c) => !q || `${c.nome} ${c.cidade ?? ''} ${c.telefone ?? ''}`.toLowerCase().includes(q))
  const aba = () => abaClientes(lista, mapaDocs)
  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Clientes</h1>
          <p className="muted">{ehProprietaria ? 'O CPF e o CNPJ aparecem mascarados aqui. O número completo só aparece no cadastro.' : 'O CPF e o CNPJ só aparecem para a proprietária.'}</p>
        </div>
        <div className="acoes">
          <Exportar opcoes={[
            { rotulo: 'Planilha Excel', formato: 'xlsx', gerar: () => baixarExcel([aba()], empresa, 'clientes') },
            { rotulo: 'CSV', formato: 'csv', gerar: async () => baixarCSV(aba(), 'clientes') },
          ]} />
          <button type="button" className="btn btn-p" onClick={() => abrir({ tipo: 'novo-cliente' })}><Plus size={20} aria-hidden="true" />Nova cliente</button>
        </div>
      </div>
      <label className="busca" style={{ flex: 'none' }}>
        <Search size={18} aria-hidden="true" />
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, cidade ou telefone" aria-label="Buscar clientes" />
      </label>
      <section className="cartao">
        {clientes.isPending ? <Carregando /> : clientes.isError ? <ErroCaixa erro={clientes.error} aoTentar={() => clientes.refetch()} /> : (
          <div className="linhas">
            {lista.length ? lista.map((c) => (
              <button key={c.id} type="button" className="linha" onClick={() => setAberta(c)}>
                <span className="bolinha saida" aria-hidden="true">{c.nome.charAt(0)}</span>
                <span className="cresce">
                  <span className="t">{c.nome}</span>
                  <span className="s">{[formatTelefone(c.telefone), c.cidade, mapaDocs.get(c.id) ? `${mapaDocs.get(c.id)!.length === 14 ? 'CNPJ' : 'CPF'} ${mascararDoc(mapaDocs.get(c.id))}` : null].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="pill neutro">{ORIGEM[c.origem]}</span>
              </button>
            )) : <Vazio titulo={q ? 'Nenhuma cliente com essa busca.' : 'Nenhuma cliente cadastrada.'} texto="Toque em “Nova cliente” para cadastrar." />}
          </div>
        )}
      </section>
      {aberta ? <ClienteFolha cliente={aberta} doc={mapaDocs.get(aberta.id) ?? null} aoFechar={() => setAberta(null)} /> : null}
    </>
  )
}

function ClienteFolha({ cliente: c, doc, aoFechar }: { cliente: Cliente; doc: string | null; aoFechar: () => void }) {
  const { empresaId, ehProprietaria } = useEmpresa()
  const avisar = useAvisar()
  const eventos = useEventos(empresaId)
  const atualizar = useAtualizarCliente()
  const salvarDoc = useSalvarDocumento(empresaId)
  const [ver, setVer] = useState(false)
  const [editando, setEditando] = useState(false)
  const [v, setV] = useState({ nome: c.nome, telefone: formatTelefone(c.telefone), email: c.email ?? '', endereco: c.endereco ?? '', cidade: c.cidade ?? '', doc: doc ? formatDoc(doc) : '' })
  const [erro, setErro] = useState<string | null>(null)
  const dela = (eventos.data ?? []).filter((e) => e.cliente_id === c.id)
  const salvar = async () => {
    setErro(null)
    const tel = v.telefone.replace(/\D/g, '')
    if (v.nome.trim().length < 3) return setErro('Informe o nome completo.')
    if (tel && tel.length !== 10 && tel.length !== 11) return setErro('Informe o telefone com DDD.')
    const d = cpfCnpj.safeParse(v.doc)
    if (!d.success) return setErro('Confira o CPF ou o CNPJ.')
    await atualizar.mutateAsync({ id: c.id, nome: v.nome.trim(), telefone: tel || null, email: v.email.trim() || null, endereco: v.endereco.trim() || null, cidade: v.cidade.trim() || null })
    if (ehProprietaria && d.data && d.data !== doc) await salvarDoc.mutateAsync({ cliente: c.id, cpf_cnpj: d.data })
    setEditando(false)
    avisar('Cliente atualizada')
  }
  return (
    <Folha titulo={c.nome} aoFechar={aoFechar}>
      {editando ? (
        <>
          <Campo id="ce-nome" rotulo="Nome completo"><input id="ce-nome" value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} /></Campo>
          <div className="duas">
            <Campo id="ce-tel" rotulo="Telefone"><input id="ce-tel" inputMode="tel" value={v.telefone} onChange={(e) => setV({ ...v, telefone: e.target.value })} /></Campo>
            <Campo id="ce-email" rotulo="E-mail"><input id="ce-email" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></Campo>
          </div>
          <Campo id="ce-end" rotulo="Endereço"><input id="ce-end" value={v.endereco} onChange={(e) => setV({ ...v, endereco: e.target.value })} /></Campo>
          <div className="duas">
            <Campo id="ce-cid" rotulo="Cidade"><input id="ce-cid" value={v.cidade} onChange={(e) => setV({ ...v, cidade: e.target.value })} /></Campo>
            {ehProprietaria ? <Campo id="ce-doc" rotulo="CPF ou CNPJ"><input id="ce-doc" inputMode="numeric" value={v.doc} onChange={(e) => setV({ ...v, doc: e.target.value })} /></Campo> : null}
          </div>
          {erro || atualizar.isError || salvarDoc.isError ? <p className="erro-caixa" role="alert">{erro ?? mensagemErro(atualizar.error ?? salvarDoc.error)}</p> : null}
          <div className="acoes">
            <button type="button" className="btn btn-s" onClick={() => setEditando(false)}>Cancelar</button>
            <button type="button" className="btn btn-p" onClick={salvar} disabled={atualizar.isPending || salvarDoc.isPending}>Salvar cliente</button>
          </div>
        </>
      ) : (
        <>
          <div className="dre">
            <div className="l"><span className="muted">Telefone</span><span>{formatTelefone(c.telefone) || '—'}</span></div>
            <div className="l"><span className="muted">E-mail</span><span>{c.email ?? '—'}</span></div>
            <div className="l"><span className="muted">Endereço</span><span>{[c.endereco, c.cidade].filter(Boolean).join(', ') || '—'}</span></div>
            <div className="l"><span className="muted">Como chegou</span><span>{ORIGEM[c.origem]}</span></div>
            {ehProprietaria ? (
              <div className="l">
                <span className="muted">CPF/CNPJ</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {doc ? (ver ? formatDoc(doc) : mascararDoc(doc)) : '—'}
                  {doc ? <button type="button" className="icone-btn" onClick={() => setVer(!ver)} aria-label={ver ? 'Esconder documento' : 'Mostrar documento completo'}>{ver ? <EyeOff size={18} /> : <Eye size={18} />}</button> : null}
                </span>
              </div>
            ) : null}
          </div>
          <div>
            <h3 style={{ marginBottom: 8 }}>Eventos</h3>
            {dela.length ? <div className="linhas">{dela.map((e) => <Link key={e.id} className="linha" to={`/eventos/${e.id}`} onClick={aoFechar} style={{ color: 'inherit', textDecoration: 'none' }}><span className="cresce"><span className="t">{e.titulo}</span><span className="s">{dataBR(e.data_evento)}</span></span></Link>)}</div> : <p className="muted">Nenhum evento ainda.</p>}
          </div>
          <div className="acoes"><button type="button" className="btn btn-s" onClick={() => setEditando(true)}>Editar cadastro</button></div>
        </>
      )}
    </Folha>
  )
}
