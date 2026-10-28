import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { modoDemo, supabase } from '../lib/supabase'
import { registrarErro } from '../lib/erros'
import logo from '../assets/logo.png'

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
  const { register, handleSubmit, getValues, formState } = useForm<Campos>({ resolver: zodResolver(esquema) })

  const entrar = handleSubmit(async ({ email, senha }) => {
    setErro(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      registrarErro('entrar', error)
      // Mesma mensagem para e-mail inexistente e senha errada: não revela quem tem conta.
      setErro('E-mail ou senha incorretos.')
    }
  })

  const recuperar = async () => {
    const email = getValues('email')
    if (!z.string().email().safeParse(email).success) {
      setErro('Informe o e-mail para receber o link.')
      return
    }
    setErro(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/nova-senha` })
    if (error) registrarErro('recuperar senha', error)
    // Mesma resposta sempre, exista ou não a conta.
    setAviso('Se este e-mail tiver acesso, você vai receber um link para criar uma nova senha.')
  }

  return (
    <main className="conteudo" style={{ minHeight: '100dvh', justifyContent: 'center', alignItems: 'center' }}>
      <div className="cartao" style={{ width: '100%', maxWidth: 380 }}>
        <img src={logo} alt="Aline Antunes Decora" style={{ height: 56, alignSelf: 'center' }} />
        <form onSubmit={entrar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} noValidate>
          <label className="campo">
            E-mail
            <input type="email" autoComplete="email" aria-invalid={!!formState.errors.email} {...register('email')} />
            {formState.errors.email && <span className="erro">{formState.errors.email.message}</span>}
          </label>
          {modo === 'entrar' && (
            <label className="campo">
              Senha
              <input type="password" autoComplete="current-password" aria-invalid={!!formState.errors.senha} {...register('senha')} />
              {formState.errors.senha && <span className="erro">{formState.errors.senha.message}</span>}
            </label>
          )}
          {erro && <p className="erro-caixa" role="alert">{erro}</p>}
          {aviso && <p className="previa" role="status">{aviso}</p>}
          {modo === 'entrar' ? (
            <>
              <button className="btn btn-p" disabled={formState.isSubmitting}>Entrar</button>
              <button type="button" className="btn btn-g" onClick={() => { setModo('recuperar'); setErro(null) }}>Esqueci a senha</button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-p" onClick={recuperar}>Enviar link</button>
              <button type="button" className="btn btn-g" onClick={() => { setModo('entrar'); setAviso(null) }}>Voltar</button>
            </>
          )}
        </form>
        {modoDemo ? (
          <div className="previa">
            <b>Prévia com dados fictícios</b>
            <span>Entre com qualquer e-mail e senha. Use <b>aline@demo.com</b> para ver tudo, ou <b>assistente@demo.com</b> para ver como a assistente enxerga (sem o financeiro e sem CPF).</span>
          </div>
        ) : (
          <p className="muted" style={{ textAlign: 'center', fontSize: 14 }}>O acesso é por convite. Fale com a Aline.</p>
        )}
      </div>
    </main>
  )
}
