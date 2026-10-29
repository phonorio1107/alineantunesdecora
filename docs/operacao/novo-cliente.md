# Checklist: criar um novo cliente

Roteiro repetível para colocar o sistema no ar para um cliente novo, a partir deste repositório. Siga na ordem e marque no `PROJETO.md` do cliente. As fases da skill `novo-cliente-saas` continuam valendo; aqui está só a parte operacional.

> Onde fica a infraestrutura (conta do Pedro ou do cliente) ainda está **em aberto** (ver `PROJETO.md` → Decisões). Os passos são os mesmos; muda só **de quem é a conta** nos passos 2 e 3.

## 0. Antes de começar
- [ ] Proposta aceita (`docs/modelos/proposta-comercial/`) e contrato assinado, com o anexo de suboperadores (`docs/lgpd/suboperadores.md`).
- [ ] 50% do setup recebido.
- [ ] Repositório do cliente criado a partir do `template-base`, **privado**.
- [ ] `PROJETO.md` novo, com os dados do cliente.

## 1. Identidade do cliente (no código)
- [ ] Logo em `src/assets/logo.png` e ícones em `public/` (favicon, apple-touch-icon, icon-192, icon-512).
- [ ] Cores em `src/index.css` (tokens do `:root` e do `.escuro`), conferindo contraste 4,5:1 para texto e botões.
- [ ] Nome em `index.html` (`<title>`, `description`) e em `public/manifest.webmanifest`.
- [ ] `wrangler.jsonc` → `name` com o nome do cliente.

## 2. Supabase
- [ ] Projeto novo, região **São Paulo**, com: Data API **ligada**, "Automatically expose new tables" **desligada**, RLS automática **ligada**.
- [ ] Senha do banco guardada no gerenciador de senhas (nunca no repositório nem no chat).
- [ ] Aplicar o banco:
  ```bash
  DATABASE_URL='<string do Session pooler>' bash scripts/cliente/migrar.sh
  ```
- [ ] Rodar o SQL de primeiro acesso (`supabase/aplicar/02-primeiro-acesso.sql`), com o e-mail da proprietária.
- [ ] Authentication: cadastro aberto **desligado**; confirmação de e-mail **ligada**; senha mínima **10**; URL Configuration com o endereço do sistema.
- [ ] Security Advisor: 0 erros; avisos restantes justificados no `PROJETO.md`.
- [ ] 2FA na conta do Supabase.

## 3. Cloudflare
- [ ] Criar `clientes/<cliente>.env` (modelo: `clientes/aline-antunes-decora.env`), só com valores públicos.
- [ ] Publicar, por um dos dois caminhos:
  - **Integração com o GitHub** (como a Aline): Workers & Pages → Create → conectar o repositório; build `npm run build`; deploy `npx wrangler deploy`; variáveis de **build** `NODE_VERSION=22`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
  - **Por script** (conta do cliente, sem dar acesso ao repositório):
    ```bash
    CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... bash scripts/cliente/publicar.sh clientes/<cliente>.env
    ```
- [ ] Ligar só a Worker URL de produção; prévias desligadas ou protegidas.
- [ ] Domínio próprio (Custom Domain) e HTTPS.
- [ ] Conferir os cabeçalhos de segurança no endereço publicado (CSP, HSTS e afins são gerados no build em `dist/_headers`).

## 4. Backup
- [ ] Seguir `docs/backup.md`: chave `age`, bucket R2 com regras de ciclo de vida, 6 segredos no GitHub, primeira execução verde e `BACKUP_ATIVO=true`.
- [ ] Abrir um backup à mão uma vez (rotina mensal) e anotar no `PROJETO.md`.

## 5. Entrega
- [ ] Login testado no celular e no computador.
- [ ] Dados iniciais importados e conferidos com o cliente.
- [ ] Usuários convidados (perfis: proprietária, assistente, freelancer).
- [ ] Política de privacidade e termos publicados (`docs/lgpd/`).
- [ ] Treino de 30 minutos e manual de 1 página.
- [ ] 3 a 5 dias de uso assistido.
- [ ] Go-live: 50% restantes recebidos; mensalidade começa no mês seguinte.

## Atualizar todos os clientes depois de uma mudança
1. Mudança aprovada e testada no repositório (CI verde).
2. Para cada cliente: `bash scripts/cliente/migrar.sh` (se houver migração nova; use `VER=1` antes para ver o que vai rodar) e depois publicar.
3. Anotar a data e a versão no `PROJETO.md` de cada cliente.

**Antes de qualquer migração num banco com dados reais:** confira que o backup do dia rodou verde.
