import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { Download, Eye, EyeOff, FileSpreadsheet, FileText, TriangleAlert, X } from 'lucide-react'
import { mensagemErro } from '../lib/erros'
import { useAvisar } from '../app/contexto'

export function Folha({ titulo, aoFechar, children, larga }: { titulo: string; aoFechar: () => void; children: ReactNode; larga?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    const primeiro = ref.current?.querySelector<HTMLElement>('[autofocus], input, select, textarea, button:not([data-fechar])')
    primeiro?.focus()
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    document.addEventListener('keydown', tecla)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = ''
      anterior?.focus?.()
    }
  }, [aoFechar])
  return (
    <div className="folha-fundo">
      <div className="scrim" onClick={aoFechar} />
      <div ref={ref} className={`folha${larga ? ' larga' : ''}`} role="dialog" aria-modal="true" aria-labelledby={id}>
        <div className="folha-h">
          <h2 id={id}>{titulo}</h2>
          <button type="button" className="icone-btn" onClick={aoFechar} aria-label="Fechar" data-fechar>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Campo({ rotulo, erro, dica, children, id }: { rotulo: string; erro?: string; dica?: string; children: ReactNode; id: string }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      {children}
      {dica ? <span className="dica">{dica}</span> : null}
      {erro ? <span className="erro" role="alert">{erro}</span> : null}
    </div>
  )
}

export function Vazio({ titulo, texto, children }: { titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <div className="vazio">
      <b>{titulo}</b>
      {texto}
      {children}
    </div>
  )
}

/** Círculo girando. Quem usa decide o texto ao lado; o leitor de tela ouve "Carregando". */
export function Girando({ tamanho = 28 }: { tamanho?: number }) {
  return <span className="girando" style={{ width: tamanho, height: tamanho }} role="status" aria-label="Carregando" />
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return <div className="vazio" aria-busy="true"><Girando />{texto}</div>
}

/** Campo de senha com o olho para mostrar ou esconder o que foi digitado. */
export function Senha({ ref, ...props }: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  const [ver, setVer] = useState(false)
  return (
    <span className="senha">
      <input {...props} ref={ref} type={ver ? 'text' : 'password'} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      <button type="button" className="olho" onClick={() => setVer(!ver)} aria-label={ver ? 'Esconder a senha' : 'Mostrar a senha'} aria-pressed={ver}>
        {ver ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
      </button>
    </span>
  )
}

export function ErroCaixa({ erro, aoTentar }: { erro: unknown; aoTentar?: () => void }) {
  return (
    <div className="erro-caixa" role="alert">
      {mensagemErro(erro)}{' '}
      {aoTentar ? <button type="button" className="btn btn-g btn-sm" onClick={aoTentar}>Tentar de novo</button> : null}
    </div>
  )
}

export function Alerta({ children }: { children: ReactNode }) {
  return (
    <div className="alerta" role="note">
      <TriangleAlert size={20} className="ic" aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}

/** Confirmação dentro da tela para ações que não dá para desfazer facilmente. */
export function Confirmar({ titulo, texto, rotulo, aoConfirmar, aoCancelar, perigo = true, ocupado }: {
  titulo: string; texto: string; rotulo: string; aoConfirmar: () => void; aoCancelar: () => void; perigo?: boolean; ocupado?: boolean
}) {
  return (
    <div className="confirmar" role="alertdialog" aria-label={titulo}>
      <b>{titulo}</b>
      <span>{texto}</span>
      <div className="acoes" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-s" onClick={aoCancelar}>Cancelar</button>
        <button type="button" className={`btn ${perigo ? 'btn-d' : 'btn-p'}`} onClick={aoConfirmar} disabled={ocupado} autoFocus>{rotulo}</button>
      </div>
    </div>
  )
}

export interface OpcaoExportar {
  rotulo: string
  formato: 'pdf' | 'xlsx' | 'csv'
  gerar: () => Promise<void>
}

/** Botão "Exportar" com as opções de PDF, Excel e CSV. */
export function Exportar({ opcoes, rotulo = 'Exportar' }: { opcoes: OpcaoExportar[]; rotulo?: string }) {
  const [aberto, setAberto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<unknown>(null)
  const avisar = useAvisar()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberto(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])
  const executar = async (o: OpcaoExportar) => {
    setAberto(false)
    setOcupado(true)
    setErro(null)
    try {
      await o.gerar()
      avisar('Arquivo pronto')
    } catch (e) {
      console.error('[exportar]', e instanceof Error ? e.name : 'erro')
      setErro(e)
    } finally {
      setOcupado(false)
    }
  }
  const Icone = { pdf: FileText, xlsx: FileSpreadsheet, csv: Download }
  return (
    <div className="menu-pop" ref={ref}>
      <button type="button" className="btn btn-s" onClick={() => setAberto((a) => !a)} aria-expanded={aberto} aria-haspopup="menu" disabled={ocupado}>
        <Download size={18} aria-hidden="true" />
        {ocupado ? 'Gerando…' : rotulo}
      </button>
      {aberto ? (
        <div className="lista" role="menu">
          {opcoes.map((o) => {
            const I = Icone[o.formato]
            return (
              <button key={o.rotulo} type="button" role="menuitem" onClick={() => executar(o)}>
                <I size={18} aria-hidden="true" />
                {o.rotulo}
              </button>
            )
          })}
        </div>
      ) : null}
      {erro ? <p className="erro-caixa" style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', width: 260 }}>Não foi possível gerar o arquivo. Tente de novo.</p> : null}
    </div>
  )
}

export function Simbolo({ tamanho = 12 }: { tamanho?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={tamanho} height={tamanho} aria-hidden="true" style={{ flex: 'none' }}>
      <rect x="5" y="18" width="11" height="24" rx="2" fill="currentColor" />
      <rect x="32" y="6" width="11" height="36" rx="2" fill="currentColor" />
      <rect x="14" y="25" width="20" height="9" fill="currentColor" />
    </svg>
  )
}

export function Credito() {
  return (
    <div className="credito">
      <Simbolo />
      feito por Pedro Hoffman
    </div>
  )
}
