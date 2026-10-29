import { useState, type FormEvent } from 'react'
import { Check, Plus, Wallet } from 'lucide-react'
import { useAvisar, useEmpresa } from '../app/contexto'
import { useFinanceiro } from '../app/dados'
import { useSessao } from '../auth/Sessao'
import {
  useAtualizarAcesso, useAtualizarEmpresa, useContas, useCriarCategoria, useCriarConta, useCriarRecorrencia, useDesativarRecorrencia, useEquipe,
} from '../data/consultas'
import { cnpjValido, valorEmReais } from '../data/esquemas'
import type { Empresa, NaturezaCategoria } from '../data/tipos'
import { Campo, Carregando, Confirmar } from '../components/ui'
import { DuasEtapas, TrocarSenha } from '../auth/Seguranca'
import { formatBRL, formatDoc, hoje, soDigitos } from '../lib/format'
import { formatarValorDigitado, mascaraCNPJ } from '../lib/mascaras'
import { mensagemErro } from '../lib/erros'

export default function Configuracoes() {
  const { veFinanceiro, ehProprietaria } = useEmpresa()
  return (
    <>
      <div className="cabecalho"><div><h1>Configurações</h1><p className="muted">Dados da empresa, contas, custos fixos e as metas que alimentam o painel.</p></div></div>
      {ehProprietaria ? <DadosEmpresa /> : null}
      <div className="grade2">
        {ehProprietaria ? <Metas /> : null}
        {veFinanceiro ? <Contas /> : null}
        {veFinanceiro ? <CustosFixos /> : null}
        {veFinanceiro ? <Categorias /> : null}
        {ehProprietaria ? <Equipe /> : null}
        <Aparencia />
        <MinhaConta />
        <DuasEtapas />
      </div>
    </>
  )
}

type CamposEmpresa = Pick<Empresa, 'nome' | 'razao_social' | 'cnpj' | 'responsavel_nome' | 'telefones' | 'email_contato' | 'endereco' | 'cidade_foro' | 'banco_nome' | 'banco_agencia' | 'banco_conta' | 'banco_favorecido' | 'pix_chave'>

function DadosEmpresa() {
  const { empresa, empresaId } = useEmpresa()
  const avisar = useAvisar()
  const atualizar = useAtualizarEmpresa(empresaId)
  const inicial = (k: keyof CamposEmpresa) => (k === 'cnpj' ? formatDoc(empresa.cnpj) : (empresa[k] ?? ''))
  const chaves: (keyof CamposEmpresa)[] = ['nome', 'razao_social', 'cnpj', 'responsavel_nome', 'telefones', 'email_contato', 'endereco', 'cidade_foro', 'banco_nome', 'banco_agencia', 'banco_conta', 'banco_favorecido', 'pix_chave']
  const [v, setV] = useState<Record<string, string>>(Object.fromEntries(chaves.map((k) => [k, inicial(k)])))
  const [erro, setErro] = useState<string | null>(null)
  const campo = (k: keyof CamposEmpresa, rotulo: string, dica?: string, extra: Record<string, unknown> = {}, mascara?: (t: string) => string) => (
    <Campo id={`emp-${k}`} rotulo={rotulo} dica={dica}>
      <input id={`emp-${k}`} value={v[k]} onChange={(e) => setV({ ...v, [k]: mascara ? mascara(e.target.value) : e.target.value })} {...extra} />
    </Campo>
  )
  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null)
    const cnpj = soDigitos(v.cnpj)
    if (cnpj && !cnpjValido(cnpj)) return setErro('Confira o CNPJ.')
    if (v.email_contato && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email_contato)) return setErro('Confira o e-mail.')
    if (v.nome.trim().length < 2) return setErro('Informe o nome da empresa.')
    const dados = Object.fromEntries(chaves.map((k) => [k, k === 'cnpj' ? cnpj || null : v[k].trim() || null])) as Partial<Empresa>
    dados.nome = v.nome.trim()
    await atualizar.mutateAsync(dados)
    avisar('Dados da empresa salvos')
  }
  return (
    <form className="cartao" onSubmit={salvar} noValidate aria-labelledby="t-emp">
      <div className="cartao-h"><h2 id="t-emp">Dados da empresa</h2><span className="muted">Aparecem nos contratos e recibos</span></div>
      <div className="duas">
        {campo('nome', 'Nome fantasia')}
        {campo('razao_social', 'Razão social', 'Como está no CNPJ.')}
        {campo('cnpj', 'CNPJ', undefined, { inputMode: 'numeric', placeholder: '00.000.000/0000-00', maxLength: 18 }, mascaraCNPJ)}
        {campo('responsavel_nome', 'Responsável', 'Atendente nos contratos e quem assina os recibos.')}
        {campo('telefones', 'Telefones')}
        {campo('email_contato', 'E-mail de contato', undefined, { type: 'email' })}
      </div>
      {campo('endereco', 'Endereço completo')}
      {campo('cidade_foro', 'Cidade do foro', 'Ex.: Louveira/SP. Vai na cláusula 8 do contrato.')}
      <h3>Dados bancários (cláusula 3 do contrato)</h3>
      <div className="duas">
        {campo('banco_nome', 'Banco')}
        {campo('banco_favorecido', 'Favorecido')}
        {campo('banco_agencia', 'Agência')}
        {campo('banco_conta', 'Conta')}
      </div>
      {campo('pix_chave', 'Chave PIX')}
      {erro || atualizar.isError ? <p className="erro-caixa" role="alert">{erro ?? mensagemErro(atualizar.error)}</p> : null}
      <div className="acoes" style={{ justifyContent: 'flex-end' }}><button type="submit" className="btn btn-p" disabled={atualizar.isPending}><Check size={18} aria-hidden="true" />Salvar dados da empresa</button></div>
    </form>
  )
}

function Metas() {
  const { empresa, empresaId } = useEmpresa()
  const avisar = useAvisar()
  const atualizar = useAtualizarEmpresa(empresaId)
  const f = useFinanceiro()
  const [v, setV] = useState({
    reserva: String(empresa.reserva_meses), retirada: String(empresa.retirada_minima).replace('.', ','), entrada: String(empresa.entrada_percentual),
    dias: String(empresa.dias_saldo_antes_evento), pctEmpresa: empresa.percentual_lucro_empresa?.toString() ?? '', pctProp: empresa.percentual_lucro_proprietaria?.toString() ?? '',
  })
  const [erro, setErro] = useState<string | null>(null)
  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null)
    const reserva = Number(v.reserva), entrada = Number(v.entrada), dias = Number(v.dias)
    const ret = valorEmReais.safeParse(v.retirada || '0')
    const pe = v.pctEmpresa === '' ? null : Number(v.pctEmpresa)
    const pp = v.pctProp === '' ? null : Number(v.pctProp)
    if (!(reserva >= 0 && reserva <= 24)) return setErro('A reserva vai de 0 a 24 meses.')
    if (!ret.success || ret.data < 0) return setErro('Informe a retirada mínima em reais.')
    if (!(entrada >= 0 && entrada <= 100)) return setErro('A entrada vai de 0% a 100%.')
    if (!(dias >= 0 && dias <= 60)) return setErro('O prazo do saldo vai de 0 a 60 dias.')
    if ((pe ?? 0) + (pp ?? 0) > 100) return setErro('A divisão do lucro passa de 100%.')
    await atualizar.mutateAsync({ reserva_meses: reserva, retirada_minima: ret.data, entrada_percentual: entrada, dias_saldo_antes_evento: dias, percentual_lucro_empresa: pe, percentual_lucro_proprietaria: pp })
    avisar('Metas salvas')
  }
  return (
    <form className="cartao" onSubmit={salvar} noValidate aria-labelledby="t-metas">
      <h2 id="t-metas">Metas e regras</h2>
      <div className="duas">
        <Campo id="m-res" rotulo="Reserva (meses de custo fixo)" dica={`Hoje equivale a ${formatBRL(Number(v.reserva || 0) * f.fixos)}.`}><input id="m-res" type="number" min={0} max={24} step={0.5} value={v.reserva} onChange={(e) => setV({ ...v, reserva: e.target.value })} /></Campo>
        <Campo id="m-ret" rotulo="Retirada mínima por mês" dica="Usada no fôlego e na previsão."><input id="m-ret" inputMode="decimal" placeholder="R$ 0,00" value={v.retirada} onChange={(e) => setV({ ...v, retirada: e.target.value })} onBlur={(e) => setV({ ...v, retirada: formatarValorDigitado(e.target.value) })} /></Campo>
        <Campo id="m-ent" rotulo="Entrada padrão (%)"><input id="m-ent" type="number" min={0} max={100} value={v.entrada} onChange={(e) => setV({ ...v, entrada: e.target.value })} /></Campo>
        <Campo id="m-dias" rotulo="Saldo até (dias antes)"><input id="m-dias" type="number" min={0} max={60} value={v.dias} onChange={(e) => setV({ ...v, dias: e.target.value })} /></Campo>
        <Campo id="m-pe" rotulo="Lucro que fica na empresa (%)"><input id="m-pe" type="number" min={0} max={100} value={v.pctEmpresa} placeholder="a definir" onChange={(e) => setV({ ...v, pctEmpresa: e.target.value })} /></Campo>
        <Campo id="m-pp" rotulo="Lucro para a proprietária (%)"><input id="m-pp" type="number" min={0} max={100} value={v.pctProp} placeholder="a definir" onChange={(e) => setV({ ...v, pctProp: e.target.value })} /></Campo>
      </div>
      {erro || atualizar.isError ? <p className="erro-caixa" role="alert">{erro ?? mensagemErro(atualizar.error)}</p> : null}
      <div className="acoes" style={{ justifyContent: 'flex-end' }}><button type="submit" className="btn btn-p" disabled={atualizar.isPending}>Salvar metas</button></div>
    </form>
  )
}

function Contas() {
  const { empresaId } = useEmpresa()
  const f = useFinanceiro()
  const avisar = useAvisar()
  const criar = useCriarConta(empresaId)
  const contas = useContas(empresaId)
  const [nova, setNova] = useState<{ nome: string; saldo: string } | null>(null)
  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    const s = valorEmReais.safeParse(nova?.saldo || '0')
    if (!nova || nova.nome.trim().length < 2 || !s.success) return
    await criar.mutateAsync({ nome: nova.nome.trim(), saldo_inicial: s.data, data_saldo_inicial: hoje() })
    setNova(null)
    avisar('Conta criada')
  }
  return (
    <section className="cartao" aria-labelledby="t-contas">
      <div className="cartao-h"><h2 id="t-contas">Contas</h2>{!nova ? <button type="button" className="btn btn-g btn-sm" onClick={() => setNova({ nome: '', saldo: '' })}><Plus size={18} aria-hidden="true" />Nova conta</button> : null}</div>
      {contas.isPending ? <Carregando /> : (
        <div className="linhas">
          {f.saldos.map((s) => <div key={s.conta_id} className="linha"><span className="bolinha saida" aria-hidden="true"><Wallet size={18} /></span><span className="cresce"><span className="t">{s.nome}</span></span><span className="v">{formatBRL(Number(s.saldo))}</span></div>)}
          {!f.saldos.length ? <p className="muted">Cadastre onde o dinheiro fica: banco, dinheiro, Pix.</p> : null}
        </div>
      )}
      {nova ? (
        <form className="duas" onSubmit={salvar} noValidate>
          <Campo id="ct-nome" rotulo="Nome"><input id="ct-nome" placeholder="Ex.: Nubank" value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} autoFocus /></Campo>
          <Campo id="ct-saldo" rotulo="Saldo de hoje"><input id="ct-saldo" inputMode="decimal" placeholder="R$ 0,00" value={nova.saldo} onChange={(e) => setNova({ ...nova, saldo: e.target.value })} onBlur={(e) => setNova({ ...nova, saldo: formatarValorDigitado(e.target.value) })} /></Campo>
          {criar.isError ? <p className="erro-caixa" style={{ gridColumn: '1/-1' }}>{mensagemErro(criar.error)}</p> : null}
          <div className="acoes" style={{ gridColumn: '1/-1', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-s" onClick={() => setNova(null)}>Cancelar</button>
            <button type="submit" className="btn btn-p" disabled={criar.isPending}>Salvar conta</button>
          </div>
        </form>
      ) : null}
    </section>
  )
}

function CustosFixos() {
  const { empresaId } = useEmpresa()
  const f = useFinanceiro()
  const avisar = useAvisar()
  const contas = useContas(empresaId)
  const criar = useCriarRecorrencia(empresaId)
  const desativar = useDesativarRecorrencia()
  const [novo, setNovo] = useState<{ descricao: string; valor: string; dia: string; categoria: string; conta: string } | null>(null)
  const [removendo, setRemovendo] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const fixas = f.categorias.filter((c) => c.natureza === 'fixo')
  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null)
    if (!novo) return
    const valor = valorEmReais.safeParse(novo.valor)
    const dia = Number(novo.dia)
    if (novo.descricao.trim().length < 2) return setErro('Dê um nome ao custo.')
    if (!valor.success || valor.data <= 0) return setErro('Informe o valor.')
    if (!(dia >= 1 && dia <= 31)) return setErro('O dia vai de 1 a 31.')
    if (!novo.categoria || !novo.conta) return setErro('Escolha a categoria e a conta.')
    await criar.mutateAsync({ descricao: novo.descricao.trim(), valor: valor.data, dia_vencimento: dia, categoria_id: novo.categoria, conta_id: novo.conta })
    setNovo(null)
    avisar('Custo fixo criado; os próximos meses já aparecem previstos')
  }
  return (
    <section className="cartao" aria-labelledby="t-fixos">
      <div className="cartao-h">
        <h2 id="t-fixos">Todo mês</h2>
        {!novo ? <button type="button" className="btn btn-g btn-sm" onClick={() => setNovo({ descricao: '', valor: '', dia: '5', categoria: fixas[0]?.id ?? '', conta: contas.data?.[0]?.id ?? '' })}><Plus size={18} aria-hidden="true" />Novo custo fixo</button> : null}
      </div>
      <div className="linhas">
        {f.recorrencias.map((r) => removendo === r.id ? (
          <Confirmar key={r.id} titulo={`Parar de lançar “${r.descricao}”?`} texto="Os meses previstos a partir de amanhã saem do caixa. Os já pagos continuam." rotulo="Parar" ocupado={desativar.isPending}
            aoCancelar={() => setRemovendo(null)} aoConfirmar={async () => { await desativar.mutateAsync({ id: r.id, depoisDe: hoje() }); setRemovendo(null); avisar('Custo fixo desativado') }} />
        ) : (
          <div key={r.id} className="linha">
            <span className="cresce"><span className="t">{r.descricao}</span><span className="s">{r.tipo === 'entrada' ? 'Entrada' : 'Saída'} todo dia {r.dia_vencimento} · {f.nomeCategoria(r.categoria_id)}</span></span>
            <span className={`v ${r.tipo ?? 'saida'}`}>{r.tipo === 'entrada' ? '+' : '−'} {formatBRL(Number(r.valor))}</span>
            <button type="button" className="btn btn-g btn-sm" onClick={() => setRemovendo(r.id)}>Parar</button>
          </div>
        ))}
        <div className="linha"><span className="cresce"><b>Custos fixos por mês</b></span><span className="v">{formatBRL(f.fixos)}</span></div>
      </div>
      {novo ? (
        <form onSubmit={salvar} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Campo id="cf-desc" rotulo="Descrição"><input id="cf-desc" placeholder="Ex.: Aluguel do ateliê" value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} autoFocus /></Campo>
          <div className="duas">
            <Campo id="cf-valor" rotulo="Valor"><input id="cf-valor" inputMode="decimal" placeholder="R$ 0,00" value={novo.valor} onChange={(e) => setNovo({ ...novo, valor: e.target.value })} onBlur={(e) => setNovo({ ...novo, valor: formatarValorDigitado(e.target.value) })} /></Campo>
            <Campo id="cf-dia" rotulo="Dia do vencimento"><input id="cf-dia" type="number" min={1} max={31} value={novo.dia} onChange={(e) => setNovo({ ...novo, dia: e.target.value })} /></Campo>
            <Campo id="cf-cat" rotulo="Categoria"><select id="cf-cat" value={novo.categoria} onChange={(e) => setNovo({ ...novo, categoria: e.target.value })}>{fixas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
            <Campo id="cf-conta" rotulo="Conta"><select id="cf-conta" value={novo.conta} onChange={(e) => setNovo({ ...novo, conta: e.target.value })}>{(contas.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
          </div>
          {erro || criar.isError ? <p className="erro-caixa" role="alert">{erro ?? mensagemErro(criar.error)}</p> : null}
          <div className="acoes" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-s" onClick={() => setNovo(null)}>Cancelar</button>
            <button type="submit" className="btn btn-p" disabled={criar.isPending}>Salvar custo fixo</button>
          </div>
        </form>
      ) : null}
    </section>
  )
}

function Categorias() {
  const { empresaId } = useEmpresa()
  const f = useFinanceiro()
  const avisar = useAvisar()
  const criar = useCriarCategoria(empresaId)
  const [nova, setNova] = useState<{ nome: string; natureza: NaturezaCategoria } | null>(null)
  const grupos: [string, NaturezaCategoria][] = [['Entradas', 'receita'], ['Custos de eventos', 'variavel'], ['Custos fixos', 'fixo'], ['Retirada', 'retirada']]
  return (
    <section className="cartao" aria-labelledby="t-cats">
      <div className="cartao-h"><h2 id="t-cats">Categorias</h2>{!nova ? <button type="button" className="btn btn-g btn-sm" onClick={() => setNova({ nome: '', natureza: 'variavel' })}><Plus size={18} aria-hidden="true" />Nova categoria</button> : null}</div>
      {grupos.map(([t, n]) => (
        <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3>{t}</h3>
          <div className="chips">{f.categorias.filter((c) => c.natureza === n).map((c) => <span key={c.id} className="pill neutro">{c.nome}</span>)}</div>
        </div>
      ))}
      {nova ? (
        <form className="duas" noValidate onSubmit={async (e) => {
          e.preventDefault()
          if (nova.nome.trim().length < 2) return
          await criar.mutateAsync({ nome: nova.nome.trim(), natureza: nova.natureza, tipo: nova.natureza === 'receita' ? 'entrada' : 'saida' })
          setNova(null)
          avisar('Categoria criada')
        }}>
          <Campo id="cat-nome" rotulo="Nome"><input id="cat-nome" value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} autoFocus maxLength={60} /></Campo>
          <Campo id="cat-tipo" rotulo="Grupo"><select id="cat-tipo" value={nova.natureza} onChange={(e) => setNova({ ...nova, natureza: e.target.value as NaturezaCategoria })}>{grupos.map(([t, n]) => <option key={n} value={n}>{t}</option>)}</select></Campo>
          {criar.isError ? <p className="erro-caixa" style={{ gridColumn: '1/-1' }}>{mensagemErro(criar.error)}</p> : null}
          <div className="acoes" style={{ gridColumn: '1/-1', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-s" onClick={() => setNova(null)}>Cancelar</button>
            <button type="submit" className="btn btn-p" disabled={criar.isPending}>Salvar categoria</button>
          </div>
        </form>
      ) : null}
    </section>
  )
}

function Equipe() {
  const { empresaId } = useEmpresa()
  const { sessao } = useSessao()
  const avisar = useAvisar()
  const equipe = useEquipe(empresaId, true)
  const atualizar = useAtualizarAcesso()
  const PAPEL = { proprietaria: 'Proprietária', assistente: 'Assistente', freelancer: 'Freelancer' }
  return (
    <section className="cartao" aria-labelledby="t-equipe">
      <h2 id="t-equipe">Pessoas com acesso</h2>
      {equipe.isPending ? <Carregando /> : (
        <div className="linhas">
          {(equipe.data ?? []).map((m) => (
            <div key={m.id} className="linha">
              <span className="cresce"><span className="t">{m.usuario_id === sessao?.user.id ? 'Você' : PAPEL[m.papel]}</span><span className="s">{PAPEL[m.papel]}{m.papel === 'assistente' ? (m.financeiro_liberado ? ' · vê o financeiro' : ' · sem acesso ao financeiro') : ''}</span></span>
              {m.papel === 'assistente' ? (
                <button type="button" className="btn btn-s btn-sm" disabled={atualizar.isPending}
                  onClick={async () => { await atualizar.mutateAsync({ id: m.id, financeiro_liberado: !m.financeiro_liberado }); avisar(m.financeiro_liberado ? 'Financeiro bloqueado para a assistente' : 'Financeiro liberado para a assistente') }}>
                  {m.financeiro_liberado ? 'Bloquear financeiro' : 'Liberar financeiro'}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
      <p className="muted">Por enquanto, novas pessoas são convidadas pelo Pedro, no painel do Supabase. O convite direto pelo sistema chega na etapa de login.</p>
    </section>
  )
}

function Aparencia() {
  const [tema, setTema] = useState(() => (document.documentElement.classList.contains('escuro') ? 'escuro' : 'claro'))
  const mudar = (t: 'claro' | 'escuro') => {
    setTema(t)
    document.documentElement.classList.toggle('escuro', t === 'escuro')
    try { localStorage.setItem('tema', t) } catch { /* sem armazenamento: vale só nesta aba */ }
  }
  return (
    <section className="cartao" aria-labelledby="t-apar">
      <h2 id="t-apar">Aparência</h2>
      <div className="seg" role="group" aria-label="Tema">
        <button type="button" aria-pressed={tema === 'claro'} onClick={() => mudar('claro')}>Claro</button>
        <button type="button" aria-pressed={tema === 'escuro'} onClick={() => mudar('escuro')}>Escuro</button>
      </div>
      <span className="muted">O claro é o padrão. O escuro fica disponível para quem preferir.</span>
    </section>
  )
}

function MinhaConta() {
  const { sessao, sair } = useSessao()
  const [confirmando, setConfirmando] = useState(false)
  return (
    <section className="cartao" aria-labelledby="t-conta">
      <h2 id="t-conta">Minha conta</h2>
      <p className="muted">{sessao?.user.email}</p>
      <TrocarSenha />
      {confirmando ? (
        <Confirmar titulo="Sair de todos os aparelhos?" texto="Você vai precisar entrar de novo em todos os celulares e computadores." rotulo="Sair de todos" aoCancelar={() => setConfirmando(false)} aoConfirmar={() => sair(true)} />
      ) : (
        <div className="acoes">
          <button type="button" className="btn btn-s" onClick={() => sair()}>Sair</button>
          <button type="button" className="btn btn-g" onClick={() => setConfirmando(true)}>Sair de todos os aparelhos</button>
        </div>
      )}
    </section>
  )
}
