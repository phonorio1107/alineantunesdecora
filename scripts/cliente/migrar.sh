#!/usr/bin/env bash
# Aplica no banco de um cliente só as migrações que ainda não rodaram (cada uma numa transação) e anota em controle.migracoes.
# Uso:
#   DATABASE_URL=... bash scripts/cliente/migrar.sh            aplica as pendentes
#   DATABASE_URL=... VER=1 bash scripts/cliente/migrar.sh      só lista as pendentes
#   DATABASE_URL=... MARCAR_ATE=20261029110000 bash ...         banco que já recebeu migrações à mão: marca até essa data sem rodar
# DATABASE_URL é a string do Session pooler do Supabase (tem a senha: só no terminal ou em segredo do GitHub, nunca em arquivo).
set -euo pipefail
: "${DATABASE_URL:?defina DATABASE_URL}"
raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
set client_min_messages = warning;
create schema if not exists controle;
create table if not exists controle.migracoes (nome text primary key, aplicada_em timestamptz not null default now(), como text not null default 'script');
revoke all on schema controle from public;
alter table controle.migracoes enable row level security;
SQL

feitas="$(psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 -c 'select nome from controle.migracoes')"
pendentes=0
for f in "$raiz"/supabase/migrations/*.sql; do
  nome="$(basename "$f")"
  if grep -qxF "$nome" <<<"$feitas"; then continue; fi
  pendentes=$((pendentes + 1))
  data="${nome%%_*}"
  if [ -n "${MARCAR_ATE:-}" ] && [[ "$data" < "$MARCAR_ATE" || "$data" == "$MARCAR_ATE" ]]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "insert into controle.migracoes (nome, como) values ('$nome', 'marcada')"
    echo "marcada (já estava aplicada): $nome"
  elif [ -n "${VER:-}" ]; then
    echo "pendente: $nome"
  else
    echo "aplicando: $nome"
    psql "$DATABASE_URL" -1 -v ON_ERROR_STOP=1 -q -f "$f" -c "insert into controle.migracoes (nome) values ('$nome')"
  fi
done
[ "$pendentes" -eq 0 ] && echo "Banco em dia: nenhuma migração pendente." || true
