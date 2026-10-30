# Banco (Supabase): convenções, fluxo de mudança e armadilhas conhecidas

## Convenções
- Nomes em `snake_case`, em português, no plural.
- Toda tabela de negócio tem `id uuid`, `empresa_id`, `criado_em`, `atualizado_em`, `criado_por` e, quando o cliente pode querer recuperar, `excluido_em`.
- Chaves estrangeiras compostas `(empresa_id, id)`: impedem ligar um registro a outro de outra empresa.
- Gatilhos padrão em toda tabela nova:
  - `privado.carimbar()`: autor e datas que não podem ser forjados; impede trocar a empresa. A tabela precisa ter `atualizado_em`.
  - `privado.registrar_atividade()` nas tabelas sensíveis: guarda só os nomes das colunas, nunca dados pessoais.
- Papéis: `proprietaria`, `assistente` (com o financeiro liberável) e `freelancer`. Funções de apoio no schema `privado`: `tem_papel`, `ve_financeiro`, `eh_membro`.
- `security definer` só no schema `privado`, sempre com `set search_path = ''`. Revogue o execute de `public` e conceda só o necessário.
- Views com `security_invoker = true`.
- Dado sensível (CPF/CNPJ, inscrição estadual) fica em tabela separada, que só a proprietária lê.
- Dinheiro em `numeric(12,2)`. Contas de dinheiro que precisam ser atômicas (fechar venda, criar parcelas) vão em função `security invoker`, que respeita a RLS de quem chama.
- Estoque e saldos: prefira um **livro de movimentos** (só insere, nunca altera) e uma view que soma. Baixas automáticas por gatilho, que deixa os movimentos de um registro iguais ao que ele pede (idempotente: refazer não duplica).

## Fluxo de mudança (sempre)
1. `supabase/migrations/AAAAMMDDHHMMSS_nome.sql`, com comentário no topo explicando o porquê.
2. Teste local (Postgres 16):
   ```bash
   createdb teste && psql teste -f supabase/tests/supabase_local_stub.sql
   DATABASE_URL=postgresql://.../teste bash scripts/cliente/migrar.sh
   psql teste -v ON_ERROR_STOP=1 -f supabase/tests/isolamento.sql
   ```
   - Acrescente uma verificação numerada ao `isolamento.sql` para cada tabela ou regra nova: isolamento entre empresas, permissões por papel e a regra de negócio (ex.: orçamento não gera parcela; cancelar devolve o estoque).
   - Teste também a **atualização de um banco com dados antigos**: aplique as migrações anteriores, insira linhas, aplique a nova e confira o preenchimento dos campos novos.
3. `supabase/aplicar/NN-nome.sql`: cabeçalho explicando, `begin;`, o conteúdo da migração, `insert into controle.migracoes ... on conflict do nothing;` e `commit;`. Gere a partir da migração (não escreva duas vezes) e teste o próprio arquivo num banco no estado anterior.
4. Entregue ao Pedro num bloco de código para copiar:
   - "Supabase → SQL Editor → New query → colar → Run";
   - "se aparecer o aviso de RLS, escolha **Run and enable RLS**";
   - "deve aparecer *Success. No rows returned*".
5. Publique o front só depois do "rodou". Registre no `PROJETO.md`.

## Armadilhas que já aconteceram
- **`alter type ... add value`** dentro de transação: o valor novo não pode ser usado na mesma transação (nem em view, check ou default). Use `status::text = 'novo'` e `'novo'::text::tipo` dentro das funções.
- **Trocar a assinatura de uma função** (parâmetros novos): `create or replace` cria uma segunda versão, e chamadas antigas ficam ambíguas. Faça `drop` da antiga e recrie com os parâmetros novos `default null`, para o front antigo continuar funcionando até a publicação.
- **Backfill sem poluir o log:** desligue o `registrar_atividade` da tabela durante o `update` e ligue de novo.
- **Tabela nova sem `grant`:** com a exposição automática desligada, a API responde como se a tabela não existisse.
- **`controle.migracoes`:** o SQL Editor avisa sobre RLS. Ligue a RLS nela (sem políticas).
- **Função `rls_auto_enable` do Supabase:** gera aviso no Security Advisor. Revogue o execute de `anon` e `authenticated`.
- **Backup:** o dump precisa de `--schema=public --schema=privado`. Sem o `privado`, a restauração quebra (as políticas chamam funções dele). Só o teste de restauração mostra isso.
- **Usuário criado em Authentication → Users** entra, mas vê "Sem acesso a nenhuma empresa" até ser ligado à empresa (`supabase/aplicar/05-ligar-usuario.sql`).
- **E-mail padrão do Supabase** só entrega para quem é da equipe do projeto, com limite de 2 por hora. Sem SMTP próprio, o "Esqueci a senha" não chega ao cliente; até lá, o Pedro redefine a senha pelo painel.
- **QR code da verificação em duas etapas:** o Supabase devolve o SVG puro e o supabase-js põe o prefixo `data:`. O `#` dentro quebra a imagem. Codifique de novo com `encodeURIComponent`.
- **Leaked password protection** é do plano Pro. Compense com senha mínima de 10 caracteres e cadastro fechado, e justifique no Advisor.
