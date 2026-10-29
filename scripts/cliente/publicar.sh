#!/usr/bin/env bash
# Gera o build com as variáveis de um cliente e publica no Cloudflare dele (Workers com arquivos estáticos).
# Uso: CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... bash scripts/cliente/publicar.sh clientes/<cliente>.env
#      SECO=1 bash scripts/cliente/publicar.sh clientes/<cliente>.env    (só gera e confere, sem publicar)
# Clientes publicados pela integração do Cloudflare com o GitHub (como a Aline hoje) não precisam deste script.
set -euo pipefail
arquivo="${1:?informe o arquivo do cliente, ex.: clientes/aline-antunes-decora.env}"
set -a; source "$arquivo"; set +a
: "${WORKER_NOME:?WORKER_NOME faltando em $arquivo}"
: "${VITE_SUPABASE_URL:?VITE_SUPABASE_URL faltando em $arquivo}"
: "${VITE_SUPABASE_ANON_KEY:?VITE_SUPABASE_ANON_KEY faltando em $arquivo}"

# Trava: só a chave pública pode ir para o front-end. Recusa a chave secreta ou a service_role (formato antigo, JWT).
node -e '
const k = process.env.VITE_SUPABASE_ANON_KEY
let papel = ""
if (k.split(".").length === 3) { try { papel = JSON.parse(Buffer.from(k.split(".")[1], "base64url")).role } catch {} }
if (k.startsWith("sb_secret_") || papel === "service_role") { console.error("RECUSADO: essa é a chave secreta do Supabase. Use a publishable (sb_publishable_...)."); process.exit(2) }
'

npm run build
if [ -n "${SECO:-}" ]; then
  npx --yes wrangler@4 deploy --name "$WORKER_NOME" --dry-run
  echo "Conferido sem publicar: $WORKER_NOME"
else
  : "${CLOUDFLARE_API_TOKEN:?defina CLOUDFLARE_API_TOKEN (token da conta Cloudflare do cliente)}"
  : "${CLOUDFLARE_ACCOUNT_ID:?defina CLOUDFLARE_ACCOUNT_ID}"
  npx --yes wrangler@4 deploy --name "$WORKER_NOME"
fi
