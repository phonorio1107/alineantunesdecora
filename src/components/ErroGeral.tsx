import { Component, type ReactNode } from 'react'
import logo from '../assets/logo.png'

// Se alguma tela quebrar, mostra uma página com a marca em vez de uma tela branca. O detalhe vai só para o console (sem dados pessoais).
export default class ErroGeral extends Component<{ children: ReactNode }, { quebrou: boolean }> {
  state = { quebrou: false }

  static getDerivedStateFromError() {
    return { quebrou: true }
  }

  componentDidCatch(erro: unknown) {
    console.error('erro na tela', erro instanceof Error ? erro.name : 'desconhecido')
  }

  render() {
    if (!this.state.quebrou) return this.props.children
    return (
      <main className="conteudo" style={{ minHeight: '100dvh', justifyContent: 'center', alignItems: 'center' }}>
        <div className="cartao" style={{ maxWidth: 380, textAlign: 'center', alignItems: 'center' }}>
          <img src={logo} alt="Aline Antunes Decora" style={{ height: 56 }} />
          <h1 style={{ fontSize: 22 }}>Algo deu errado nesta tela</h1>
          <p className="muted">Nada do que já estava salvo foi perdido. Recarregue a página; se continuar, avise o Pedro.</p>
          <button type="button" className="btn btn-p" onClick={() => window.location.assign('/')}>Recarregar</button>
        </div>
      </main>
    )
  }
}
