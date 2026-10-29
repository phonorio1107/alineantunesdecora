# Backup diário do banco

Todo dia às 03:17 (Brasília) o GitHub roda `.github/workflows/backup.yml`:

1. conecta ao banco do Supabase e gera o backup (schemas `public` e `privado`, mais id e e-mail dos usuários de login);
2. **restaura o backup num banco de teste** e confere se todas as tabelas voltaram com todas as linhas (se não voltarem, falha e o GitHub avisa por e-mail);
3. criptografa com a chave **pública** (a privada fica só com o Pedro);
4. envia para o Cloudflare R2: pasta `diario/` todo dia e `semanal/` aos domingos.

Senhas de login não saem do Supabase. Se for preciso recuperar, os usuários são convidados de novo.

## Configuração (uma vez)

### 1. Chave de criptografia (no seu computador)
Instale o `age` (Windows: `winget install FiloSottile.age`; Mac: `brew install age`) e rode:

```bash
age-keygen -o chave-backup.txt
```

- A linha `# public key: age1...` é a **chave pública**: vai para o GitHub.
- O arquivo `chave-backup.txt` inteiro é a **chave privada**: guarde em dois lugares fora do GitHub (gerenciador de senhas e um pen drive, por exemplo). **Sem ela, nenhum backup abre.** Nunca envie ao repositório nem ao chat.

### 2. Bucket no Cloudflare R2
1. Cloudflare → **R2 Object Storage** → criar bucket `aline-backups` (privado, nunca público).
2. No bucket → **Settings → Object lifecycle rules**: regra 1, prefixo `diario/`, apagar depois de **8 dias**; regra 2, prefixo `semanal/`, apagar depois de **35 dias**.
3. **R2 → Manage API tokens → Create API token**: permissão **Object Read & Write**, só para o bucket `aline-backups`. Anote *Access Key ID*, *Secret Access Key* e o *Account ID*.

### 3. String de conexão do Supabase
Supabase → **Connect** → aba **Session pooler** → copie a URL e troque `[YOUR-PASSWORD]` pela senha do banco. Essa URL tem a senha: ela só vai para o GitHub (passo 4).

### 4. Segredos no GitHub
Repositório → **Settings → Secrets and variables → Actions → New repository secret**. Crie os seis:

| Nome | Valor |
|---|---|
| `SUPABASE_DB_URL` | URL do Session pooler, com a senha |
| `BACKUP_AGE_PUBLIC_KEY` | chave pública `age1...` |
| `R2_ACCOUNT_ID` | Account ID do Cloudflare |
| `R2_BUCKET` | `aline-backups` |
| `R2_ACCESS_KEY_ID` | Access Key ID do token do R2 |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key do token do R2 |

### 5. Primeira execução
**Actions → Backup do banco → Run workflow.** Deve terminar verde, e o resumo mostra a tabela de contagens com "RESTAURAÇÃO OK". Confira se o arquivo apareceu em `diario/` no R2.

### 6. Ligar o horário diário
Só depois da primeira execução verde: repositório → **Settings → Secrets and variables → Actions → aba Variables → New repository variable**, nome `BACKUP_ATIVO`, valor `true`. Sem essa variável, o horário das 03:17 não roda (a execução à mão funciona sempre).

Ative os e-mails de falha em GitHub → Settings → Notifications → Actions.

## Rotina mensal (30 min): provar que dá para abrir
1. Baixe um arquivo do R2 (`semanal/`).
2. Abra: `age -d -i chave-backup.txt aline-AAAA-MM-DD.tar.age | tar -xz`
3. Confira que saem `public.dump`, `usuarios.csv` e `contagens.txt`.
4. Anote a data no `PROJETO.md`.

## Se precisar recuperar de verdade
1. Crie um projeto Supabase novo e aplique `supabase/aplicar/01-estrutura-completa.sql`.
2. Restaure os dados do `public.dump` (`pg_restore --data-only --schema=public`), apontando para o banco novo.
3. Convide de novo os usuários (lista em `usuarios.csv`) e ligue cada um à empresa.
4. Troque `VITE_SUPABASE_URL` e a chave no Cloudflare e refaça o deploy.

## Limites conhecidos
- O backup é diário: no pior caso perdem-se até 24 horas de lançamentos.
- O Supabase gratuito não tem backup próprio: este é o único.
- O arquivo de teste de restauração confere contagens de linhas, não o conteúdo de cada campo.
