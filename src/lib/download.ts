// Entrega um arquivo gerado no navegador. Dentro da página de teste do claude.ai o download
// direto é bloqueado, então usa a permissão "downloads" de lá; fora dela, baixa normalmente.
interface ClaudeDownloads {
  save: (req: { filename: string; data: Blob }) => Promise<{ status: string }>
}
declare global {
  interface Window {
    claude?: { use: (name: 'downloads') => Promise<ClaudeDownloads | null> }
  }
}

export async function salvarArquivo(filename: string, data: Blob) {
  const downloads = window.claude ? await window.claude.use('downloads') : null
  if (downloads) {
    await downloads.save({ filename, data })
    return
  }
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
