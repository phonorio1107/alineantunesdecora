import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { modoDemo, supabase } from '../lib/supabase'
import { registrarErro } from '../lib/erros'
import { Girando, Senha } from '../components/ui'
import Capa from './Capa'

const esquema = z.object({
  email: z.string().trim().email('Confira o e-mail.'),
  senha: z.string().min(1, 'Informe a senha.'),
})
type Campos = z.infer<typeof esquema>

// Entrada só por convite: não existe "criar conta" aqui.
export default function Entrar() {
  const [modo, setModo] = useState<'entrar' | 'recuperar'>('entrar')
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [tremer, setTremer] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const { register, handleSubmit, getValues, formState } = useForm<Campos>({ resolver: zodResolver(esquema) })

  const entrar = handleSubmit(async ({ email, senha }) => {
    setErro(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      registrarErro('entrar', error)
      // Mesma mensagem para e-mail inexistente e senha errada: não revela quem tem conta.
      setErro('E-mail ou senha incorretos.')
      setTremer((n) => n + 1)
    }
  }, () => setTremer((n) => n + 1))

  const recuperar = async () => {
    const email = getValues('email')
    if (!z.string().email().safeParse(email?.trim()).success) {
      setErro('Informe o e-mail para receber o link.')
      setTremer((n) => n + 1)
      return
    }
    setErro(null)
    setEnviando(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/nova-senha` })
    setEnviando(false)
    if (error) registrarErro('recuperar senha', error)
    // Mesma resposta sempre, exista ou não a conta.
    setAviso('Se este e-mail tiver acesso, chega em instantes um link para criar uma nova senha. Confira também a caixa de spam.')
  }

  const trocar = (m: 'entrar' | 'recuperar') => { setModo(m); setErro(null); setAviso(null) }

  return (
    <Capa
      titulo={modo === 'entrar' ? 'Entrar' : 'Criar nova senha'}
      texto={modo === 'entrar' ? 'Use o e-mail e a senha do seu acesso.' : 'Informe o seu e-mail. Mandamos um link para você escolher uma senha nova.'}
      tremer={tremer}
      rodape={modoDemo ? (
        <div className="previa">
          <b>Prévia com dados fictícios</b>
          <span>Entre com qualquer e-mail e senha. Use <b>aline@demo.com</b> para ver tudo, ou <b>assistente@demo.com</b> para ver como a assistente enxerga (sem o financeiro e sem CPF).</span>
        </div>
      ) : <p className="capa-convite">O acesso é por convite. Para entrar na equipe, fale com a Aline.</p>}
    >
      <form className="capa-campos" onSubmit={entrar} noValidate>
        <div className="campo">
          <label htmlFor="en-email">E-mail</label>
          <input id="en-email" type="email" inputMode="email" autoCapitalize="off" autoComplete="email" placeholder="nome@exemplo.com" aria-invalid={!!formState.errors.email} {...register('email')} />
          {formState.errors.email && <span className="erro">{formState.errors.email.message}</span>}
        </div>
        {modo === 'entrar' && (
          <div className="campo">
            <div className="rotulo-linha">
              <label htmlFor="en-senha">Senha</label>
              <button type="button" className="link-discreto" onClick={() => trocar('recuperar')}>Esqueci a senha</button>
            </div>
            <Senha id="en-senha" autoComplete="current-password" aria-invalid={!!formState.errors.senha} {...register('senha')} />
            {formState.errors.senha && <span className="erro">{formState.errors.senha.message}</span>}
          </div>
        )}
        {erro && <p className="erro-caixa" role="alert">{erro}</p>}
        {aviso && <p className="aviso-ok" role="status">{aviso}</p>}
        {modo === 'entrar' ? (
          <button className="btn btn-p btn-grande" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? <><Girando tamanho={20} />Entrando…</> : 'Entrar'}
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-p btn-grande" onClick={recuperar} disabled={enviando}>{enviando ? <><Girando tamanho={20} />Enviando…</> : 'Enviar o link'}</button>
            <button type="button" className="btn btn-g" onClick={() => trocar('entrar')}>Voltar para entrar</button>
          </>
        )}
      </form>
    </Capa>
  )
}
