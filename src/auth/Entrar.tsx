import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
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
    <main className="min-h-dvh grid place-items-center px-4 py-12">
      <div className="card w-full max-w-sm p-6 flex flex-col gap-6">
        <img src={logo} alt="Aline Antunes Decora" className="h-14 w-auto self-center" />
        <form onSubmit={entrar} className="flex flex-col gap-4" noValidate>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            E-mail
            <input type="email" autoComplete="email" className="input" aria-invalid={!!formState.errors.email} {...register('email')} />
            {formState.errors.email && <span className="text-sm font-medium text-red-700">{formState.errors.email.message}</span>}
          </label>
          {modo === 'entrar' && (
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Senha
              <input type="password" autoComplete="current-password" className="input" aria-invalid={!!formState.errors.senha} {...register('senha')} />
              {formState.errors.senha && <span className="text-sm font-medium text-red-700">{formState.errors.senha.message}</span>}
            </label>
          )}
          {erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">{erro}</p>}
          {aviso && <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm" role="status">{aviso}</p>}
          {modo === 'entrar' ? (
            <>
              <button className="btn-primary min-h-11" disabled={formState.isSubmitting}>Entrar</button>
              <button type="button" className="btn-ghost min-h-11" onClick={() => { setModo('recuperar'); setErro(null) }}>Esqueci a senha</button>
            </>
          ) : (
            <>
              <button type="button" className="btn-primary min-h-11" onClick={recuperar}>Enviar link</button>
              <button type="button" className="btn-ghost min-h-11" onClick={() => { setModo('entrar'); setAviso(null) }}>Voltar</button>
            </>
          )}
        </form>
        <p className="text-center text-sm text-ink-500">O acesso é por convite. Fale com a Aline.</p>
      </div>
    </main>
  )
}
