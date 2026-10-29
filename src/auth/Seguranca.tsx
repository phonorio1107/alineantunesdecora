// Verificação em duas etapas (app autenticador, TOTP) e troca de senha. Tudo pelo Supabase Auth.
import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { registrarErro } from '../lib/erros'
import Capa from './Capa'
import { Campo, Confirmar, Girando, Senha } from '../components/ui'
import { useSessao } from './Sessao'

/** Regra de senha do sistema: 10 caracteres ou mais, com letras e números. Devolve o erro ou null. */
export const erroDeSenha = (s: string) =>
  s.length < 10 ? 'Use pelo menos 10 caracteres.' : !/[A-Za-z]/.test(s) || !/\d/.test(s) ? 'Misture letras e números.' : null

const so6 = (v: string) => v.replace(/\D/g, '').slice(0, 6)

export function useNivel(ativo: boolean) {
  return useQuery({
    queryKey: ['mfa', 'nivel'],
    enabled: ativo,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (error) throw error
      return data
    },
  })
}

function useFatores() {
  return useQuery({
    queryKey: ['mfa', 'fatores'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error
      return data.totp ?? []
    },
  })
}

/** Tela de código: aparece depois da senha quando a pessoa ligou a verificação em duas etapas. */
export function PedirCodigo({ fator }: { fator: string }) {
  const { sair } = useSessao()
  const qc = useQueryClient()
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const verificar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: fator, code: codigo })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mfa'] }),
    onError: (e) => { registrarErro('verificar código', e); setErro('Código incorreto ou vencido. Use o que está no app agora.'); setCodigo('') },
  })
  const enviar = (e: FormEvent) => { e.preventDefault(); setErro(null); if (codigo.length === 6) verificar.mutate() }
  return (
    <Capa titulo="Código de segurança" texto="Abra o app autenticador no celular e digite os 6 números da Aline Antunes Decora." tremer={erro ? 1 : 0}>
      <form className="capa-campos" onSubmit={enviar} noValidate>
        <Campo id="mfa-cod" rotulo="Código" erro={erro ?? undefined}>
          <input id="mfa-cod" className="dinheiro codigo" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} placeholder="000000" value={codigo} aria-invalid={!!erro}
            onChange={(e) => { setCodigo(so6(e.target.value)); if (so6(e.target.value).length === 6 && !verificar.isPending) setTimeout(() => (document.getElementById('mfa-enviar') as HTMLButtonElement | null)?.click(), 0) }} />
        </Campo>
        <button id="mfa-enviar" className="btn btn-p btn-grande" disabled={verificar.isPending || codigo.length !== 6}>{verificar.isPending ? <><Girando tamanho={20} />Conferindo…</> : 'Entrar'}</button>
        <button type="button" className="btn btn-g" onClick={() => sair()}>Usar outra conta</button>
      </form>
    </Capa>
  )
}

/** Cartão em Configurações: ligar ou desligar a verificação em duas etapas. */
export function DuasEtapas() {
  const qc = useQueryClient()
  const fatores = useFatores()
  const [novo, setNovo] = useState<{ id: string; qr: string; chave: string } | null>(null)
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [desligando, setDesligando] = useState(false)
  const ativo = (fatores.data ?? []).find((f) => f.status === 'verified')

  const comecar = useMutation({
    mutationFn: async () => {
      // Se sobrou um cadastro incompleto de uma tentativa anterior, tira antes de criar outro.
      for (const f of (fatores.data ?? []).filter((x) => x.status !== 'verified')) await supabase.auth.mfa.unenroll({ factorId: f.id })
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Celular ${new Date().toLocaleDateString('pt-BR')}` })
      if (error) throw error
      // O supabase-js entrega o SVG sem codificar; um "#" de cor cortaria o endereço da imagem. Codificamos aqui.
      const prefixo = 'data:image/svg+xml;utf-8,'
      const bruto = data.totp.qr_code
      const qr = bruto.startsWith(prefixo) ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(bruto.slice(prefixo.length))}` : bruto
      return { id: data.id, qr, chave: data.totp.secret }
    },
    onSuccess: (d) => { setNovo(d); setErro(null) },
    onError: (e) => { registrarErro('ligar duas etapas', e); setErro('Não foi possível começar. Confira se a verificação em duas etapas está ligada no Supabase (Authentication → Multi-Factor).') },
  })
  const confirmar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: novo!.id, code: codigo })
      if (error) throw error
    },
    onSuccess: () => { setNovo(null); setCodigo(''); void qc.invalidateQueries({ queryKey: ['mfa'] }) },
    onError: (e) => { registrarErro('confirmar duas etapas', e); setErro('Código incorreto. Digite o que aparece agora no app.'); setCodigo('') },
  })
  const desligar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: ativo!.id })
      if (error) throw error
    },
    onSuccess: () => { setDesligando(false); void qc.invalidateQueries({ queryKey: ['mfa'] }) },
    onError: (e) => { registrarErro('desligar duas etapas', e); setErro('Não foi possível desligar agora.') },
  })

  return (
    <section className="cartao" aria-labelledby="t-2fa">
      <h2 id="t-2fa">Verificação em duas etapas</h2>
      {fatores.isPending ? <p className="muted">Carregando…</p> : novo ? (
        <>
          <p className="muted">1. Abra um app autenticador (Google Authenticator, Microsoft Authenticator ou Authy) e escaneie o código. 2. Digite aqui os 6 números que o app mostrar.</p>
          <img className="qr" src={novo.qr} alt="Código QR para o app autenticador" width={192} height={192} />
          <details className="chave-manual"><summary>Não consigo escanear</summary><p className="muted">Digite esta chave no app: <code>{novo.chave}</code></p></details>
          <Campo id="dp-cod" rotulo="Código do app" erro={erro ?? undefined}>
            <input id="dp-cod" className="dinheiro" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={codigo} onChange={(e) => setCodigo(so6(e.target.value))} />
          </Campo>
          <div className="acoes">
            <button type="button" className="btn btn-s" onClick={() => { setNovo(null); setCodigo(''); setErro(null) }}>Cancelar</button>
            <button type="button" className="btn btn-p" disabled={codigo.length !== 6 || confirmar.isPending} onClick={() => confirmar.mutate()}><Check size={18} aria-hidden="true" />{confirmar.isPending ? 'Conferindo…' : 'Ligar'}</button>
          </div>
        </>
      ) : ativo ? (
        <>
          <p className="ligado-2fa"><ShieldCheck size={20} aria-hidden="true" />Ligada. Ao entrar, o sistema pede o código do app.</p>
          {erro ? <p className="erro-caixa" role="alert">{erro}</p> : null}
          {desligando ? (
            <Confirmar titulo="Desligar a verificação em duas etapas?" texto="A conta fica protegida só pela senha." rotulo="Desligar" ocupado={desligar.isPending} aoCancelar={() => setDesligando(false)} aoConfirmar={() => desligar.mutate()} />
          ) : (
            <div className="acoes"><button type="button" className="btn btn-g" onClick={() => setDesligando(true)}>Desligar</button></div>
          )}
        </>
      ) : (
        <>
          <p className="muted">Além da senha, o sistema pede um código de 6 números do celular. Se a senha vazar, ninguém entra sem o aparelho. Recomendado para quem vê o financeiro.</p>
          {erro ? <p className="erro-caixa" role="alert">{erro}</p> : null}
          <div className="acoes"><button type="button" className="btn btn-s" disabled={comecar.isPending} onClick={() => comecar.mutate()}>{comecar.isPending ? 'Preparando…' : 'Ligar a verificação em duas etapas'}</button></div>
        </>
      )}
    </section>
  )
}

/** Cartão em Configurações: trocar a senha estando logada. */
export function TrocarSenha() {
  const [aberto, setAberto] = useState(false)
  const [nova, setNova] = useState('')
  const [repetir, setRepetir] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const trocar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({ password: nova })
      if (error) throw error
    },
    onSuccess: () => { setAberto(false); setNova(''); setRepetir(''); setOk(true) },
    onError: (e) => { registrarErro('trocar senha', e); setErro('Não foi possível trocar agora. Se o erro continuar, saia e entre de novo.') },
  })
  const enviar = (e: FormEvent) => {
    e.preventDefault(); setOk(false)
    const r = erroDeSenha(nova)
    if (r) return setErro(r)
    if (nova !== repetir) return setErro('As duas senhas não são iguais.')
    setErro(null); trocar.mutate()
  }
  if (!aberto) {
    return (
      <>
        {ok ? <p className="ligado-2fa"><Check size={18} aria-hidden="true" />Senha trocada.</p> : null}
        <button type="button" className="btn btn-s" onClick={() => setAberto(true)}>Trocar a senha</button>
      </>
    )
  }
  return (
    <form onSubmit={enviar} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Campo id="ts-1" rotulo="Nova senha" dica="Pelo menos 10 caracteres, com letras e números."><Senha id="ts-1" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} autoFocus /></Campo>
      <Campo id="ts-2" rotulo="Repita a nova senha"><Senha id="ts-2" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} /></Campo>
      {erro ? <p className="erro-caixa" role="alert">{erro}</p> : null}
      <div className="acoes"><button type="button" className="btn btn-s" onClick={() => { setAberto(false); setErro(null) }}>Cancelar</button><button className="btn btn-p" disabled={trocar.isPending}>{trocar.isPending ? 'Salvando…' : 'Salvar senha'}</button></div>
    </form>
  )
}
