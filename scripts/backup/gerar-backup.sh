#!/usr/bin/env bash
# Gera o backup do banco em $SAIDA: esquema public completo, usuários de login (melhor esforço) e contagens por tabela.
# Uso: DATABASE_URL=... SAIDA=./saida bash scripts/backup/gerar-backup.sh
set -euo pipefail
: "${DATABASE_URL:?defina DATABASE_URL}"
: "${SAIDA:?defina SAIDA}"
mkdir -p "$SAIDA"

# Contagem por tabela feita antes do dump: é com ela que a restauração é conferida.
psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 -c "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1" > "$SAIDA/tabelas.txt"
: > "$SAIDA/contagens.txt"
while read -r t; do
  n=$(psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 -c "select count(*) from public.\"$t\"")
  echo "$t $n" >> "$SAIDA/contagens.txt"
done < "$SAIDA/tabelas.txt"

pg_dump "$DATABASE_URL" --schema=public --schema=privado --no-owner --no-privileges --format=custom --file="$SAIDA/public.dump"

# Usuários de login: só id e e-mail, para a restauração de teste e para recriar convites. Senhas não saem do Supabase.
psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 -c "\copy (select id, email from auth.users order by id) to '$SAIDA/usuarios.csv' with csv"

echo "Backup gerado em $SAIDA:"
cat "$SAIDA/contagens.txt"
