import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import type { Empresa, Papel, TipoLancamento } from '../data/tipos'

// ---------------------------------------------------------------------------
// Empresa e perfil de quem está logado. Mostrar/esconder botões é só conforto:
// quem decide o acesso de verdade é a RLS no banco.
// ---------------------------------------------------------------------------
export interface ContextoEmpresa {
  empresa: Empresa
  empresaId: string
  papel: Papel
  ehProprietaria: boolean
  veFinanceiro: boolean
}

const EmpresaCtx = createContext<ContextoEmpresa | null>(null)

export function EmpresaProvider({ valor, children }: { valor: ContextoEmpresa; children: ReactNode }) {
  return <EmpresaCtx.Provider value={valor}>{children}</EmpresaCtx.Provider>
}

export function useEmpresa() {
  const c = useContext(EmpresaCtx)
  if (!c) throw new Error('useEmpresa precisa estar dentro de <EmpresaProvider>')
  return c
}

// ---------------------------------------------------------------------------
// Folhas (janelas de formulário) abertas de qualquer tela
// ---------------------------------------------------------------------------
export type Folha =
  | { tipo: 'lancar'; lancamentoTipo?: TipoLancamento; eventoId?: string }
  | { tipo: 'lancamento'; id: string }
  | { tipo: 'novo-evento' }
  | { tipo: 'novo-cliente' }
  | null

interface ContextoFolhas {
  folha: Folha
  abrir: (f: Exclude<Folha, null>) => void
  fechar: () => void
}

const FolhasCtx = createContext<ContextoFolhas | null>(null)

export function FolhasProvider({ children }: { children: ReactNode }) {
  const [folha, setFolha] = useState<Folha>(null)
  const valor = useMemo(() => ({ folha, abrir: setFolha, fechar: () => setFolha(null) }), [folha])
  return <FolhasCtx.Provider value={valor}>{children}</FolhasCtx.Provider>
}

export function useFolhas() {
  const c = useContext(FolhasCtx)
  if (!c) throw new Error('useFolhas precisa estar dentro de <FolhasProvider>')
  return c
}

// ---------------------------------------------------------------------------
// Aviso curto de sucesso
// ---------------------------------------------------------------------------
const AvisoCtx = createContext<(texto: string) => void>(() => {})

export function AvisoProvider({ children }: { children: ReactNode }) {
  const [texto, setTexto] = useState<string | null>(null)
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  const avisar = useCallback((novo: string) => {
    setTexto(novo)
    clearTimeout(t.current)
    t.current = setTimeout(() => setTexto(null), 2800)
  }, [])
  useEffect(() => () => clearTimeout(t.current), [])
  return (
    <AvisoCtx.Provider value={avisar}>
      {children}
      <div role="status" aria-live="polite">
        {texto ? (
          <div className="aviso-toast">
            <Check size={18} aria-hidden="true" />
            {texto}
          </div>
        ) : null}
      </div>
    </AvisoCtx.Provider>
  )
}

export const useAvisar = () => useContext(AvisoCtx)
