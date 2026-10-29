#!/usr/bin/env bash
# Restaura public.dump num banco de teste (Postgres comum com o ambiente simulado do Supabase) e confere as contagens.
# Uso: RESTAURAR_URL=postgresql://usuario:senha@host:porta SAIDA=./saida bash scripts/backup/testar-restauracao.sh
set -euo pipefail
: "${RESTAURAR_URL:?defina RESTAURAR_URL (servidor de teste, nunca o Supabase)}"
: "${SAIDA:?defina SAIDA}"
base="${RESTAURAR_URL%/}"
raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

case "$base" in *supabase*) echo "RESTAURAR_URL aponta para o Supabase: recusado."; exit 2;; esac

psql "$base/postgres" -v ON_ERROR_STOP=1 -q -c "drop database if exists restauracao_teste" -c "create database restauracao_teste"
alvo="$base/restauracao_teste"
psql "$alvo" -v ON_ERROR_STOP=1 -q -f "$raiz/supabase/tests/supabase_local_stub.sql"
psql "$alvo" -v ON_ERROR_STOP=1 -q -c "\copy auth.users (id, email) from '$SAIDA/usuarios.csv' with csv"
# O schema public já existe no banco de teste: tira da lista a criação dele (e o comentário) e restaura o resto.
pg_restore --list "$SAIDA/public.dump" | grep -v -E ' SCHEMA - public | COMMENT - SCHEMA public ' > "$SAIDA/lista.txt"
pg_restore --no-owner --no-privileges --exit-on-error --use-list="$SAIDA/lista.txt" --dbname="$alvo" "$SAIDA/public.dump"

falhou=0
echo "tabela | origem | restaurado"
while read -r t n_origem; do
  if ! n_rest=$(psql "$alvo" -At -v ON_ERROR_STOP=1 -c "select count(*) from public.\"$t\"" 2>/dev/null); then
    echo "$t | $n_origem | AUSENTE"; falhou=1; continue
  fi
  status=""
  if [ "$n_rest" -lt "$n_origem" ]; then status="  <-- FALTAM LINHAS"; falhou=1; fi
  echo "$t | $n_origem | $n_rest$status"
done < "$SAIDA/contagens.txt"

psql "$base/postgres" -q -c "drop database if exists restauracao_teste"
if [ "$falhou" -ne 0 ]; then echo "RESTAURAÇÃO COM PROBLEMA"; exit 1; fi
echo "RESTAURAÇÃO OK"
