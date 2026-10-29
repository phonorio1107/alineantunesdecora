#!/usr/bin/env bash
# Junta o backup num arquivo e criptografa com a chave PÚBLICA (age). A chave privada fica só com o Pedro, fora do GitHub.
# Uso: AGE_PUBLICA=age1... SAIDA=./saida ARQUIVO=./backup.tar.age bash scripts/backup/criptografar.sh
set -euo pipefail
: "${AGE_PUBLICA:?defina AGE_PUBLICA}"
: "${SAIDA:?defina SAIDA}"
: "${ARQUIVO:?defina ARQUIVO}"
tar -C "$SAIDA" -cz public.dump usuarios.csv contagens.txt | age -r "$AGE_PUBLICA" -o "$ARQUIVO"
echo "Arquivo criptografado: $ARQUIVO ($(du -h "$ARQUIVO" | cut -f1))"
