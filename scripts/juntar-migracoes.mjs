// Junta todas as migrações num único arquivo, para colar no SQL Editor do Supabase (projeto de testes).
// Em produção a ideia é aplicar por migração, com a CLI do Supabase; este arquivo é só um atalho para o primeiro uso.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'supabase/migrations'
const arquivos = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
const corpo = arquivos.map((f) => `-- ============================================================\n-- ${f}\n-- ============================================================\n${readFileSync(join(dir, f), 'utf8').trim()}\n`).join('\n')
const topo = `-- GERADO por "npm run sql:juntar". Não edite: mude as migrações em supabase/migrations.\n-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em Run. Rode UMA vez, num projeto novo e vazio.\n-- Migrações incluídas: ${arquivos.join(', ')}\n\n`
writeFileSync('supabase/aplicar/01-estrutura-completa.sql', topo + corpo)
console.log(`supabase/aplicar/01-estrutura-completa.sql (${arquivos.length} migrações)`)
