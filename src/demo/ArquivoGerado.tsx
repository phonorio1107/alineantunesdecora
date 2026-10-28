// PRÉVIA: mostra na tela o arquivo que acabou de ser gerado (PDF, CSV ou Excel).
import { useEffect, useState } from 'react'
import { Folha } from '../components/ui'

interface Arquivo { nome: string; url: string; tipo: 'pdf' | 'csv' | 'xlsx'; tamanho: number; texto?: string }

export default function ArquivoGerado() {
  const [arq, setArq] = useState<Arquivo | null>(null)
  useEffect(() => {
    const ouvir = async (e: Event) => {
      const { blob, nome } = (e as CustomEvent<{ blob: Blob; nome: string }>).detail
      const tipo = nome.endsWith('.pdf') ? 'pdf' : nome.endsWith('.csv') ? 'csv' : 'xlsx'
      const texto = tipo === 'csv' ? (await blob.text()).replace(/^﻿/, '') : undefined
      setArq((a) => {
        if (a) URL.revokeObjectURL(a.url)
        return { nome, url: URL.createObjectURL(blob), tipo, tamanho: blob.size, texto }
      })
    }
    window.addEventListener('demo-arquivo', ouvir)
    return () => window.removeEventListener('demo-arquivo', ouvir)
  }, [])
  if (!arq) return null
  const linhas = arq.texto?.split('\r\n').slice(0, 12).map((l) => l.split(';')) ?? []
  return (
    <Folha titulo="Arquivo gerado" aoFechar={() => setArq(null)} larga>
      <p className="muted"><b style={{ color: 'var(--ink)' }}>{arq.nome}</b> · {(arq.tamanho / 1024).toFixed(0)} KB. No sistema de verdade, ele vai direto para a pasta de downloads.</p>
      {arq.tipo === 'pdf' ? (
        <object data={arq.url} type="application/pdf" style={{ width: '100%', height: '70dvh', border: '1px solid var(--line)', borderRadius: 12 }}>
          <p className="muted">O navegador desta página não mostra PDF aqui dentro. Use o botão abaixo para salvar.</p>
        </object>
      ) : arq.tipo === 'csv' ? (
        <div className="rolagem"><table className="tabela"><tbody>{linhas.map((l, i) => <tr key={i}>{l.map((c, j) => i === 0 ? <th key={j}>{c}</th> : <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
      ) : (
        <p>Planilha do Excel gerada, com cabeçalho da marca, R$ e datas no formato brasileiro, totais e filtros.</p>
      )}
      <div className="acoes">
        <a className="btn btn-p" href={arq.url} download={arq.nome}>Salvar arquivo</a>
      </div>
    </Folha>
  )
}
