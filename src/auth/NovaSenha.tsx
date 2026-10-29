import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { registrarErro } from '../lib/erros'
import logo from '../assets/logo.png'
import { Girando, Senha } from '../components/ui'
import { erroDeSenha } from './Seguranca'

// Página aberta pelo link de "Esqueci a senha" (e pelo convite): define a senha nova.
export default function NovaSenha() {
  const navegar = useNavigate()
  const [senha, setSenha] = useState('')
  const [repetir, setRepetir] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null)
    const regra = erroDeSenha(senha)
    if (regra) return setErro(regra)
    if (senha !== repetir) return setErro('As duas senhas não são iguais.')
    setSalvando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setSalvando(false)
    if (error) {
      registrarErro('nova senha', error)
      return setErro('O link expirou ou já foi usado. Peça um novo em “Esqueci a senha”.')
    }
    navegar('/', { replace: true })
  }
  return (
    <main className="conteudo" style={{ minHeight: '100dvh', justifyContent: 'center', alignItems: 'center' }}>
      <form className="cartao" style={{ width: '100%', maxWidth: 380 }} onSubmit={salvar} noValidate>
        <img src={logo} alt="Aline Antunes Decora" style={{ height: 56, alignSelf: 'center' }} />
        <h1 style={{ fontSize: 24 }}>Criar nova senha</h1>
        <div className="campo"><label htmlFor="ns-1">Nova senha</label><Senha id="ns-1" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus /><span className="dica">Pelo menos 10 caracteres, com letras e números.</span></div>
        <div className="campo"><label htmlFor="ns-2">Repita a senha</label><Senha id="ns-2" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} /></div>
        {erro ? <p className="erro-caixa" role="alert">{erro}</p> : null}
        <button className="btn btn-p" disabled={salvando}>{salvando ? <><Girando tamanho={20} />Salvando…</> : 'Salvar senha'}</button>
      </form>
    </main>
  )
}
