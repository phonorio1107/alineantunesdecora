# Ligar o Google Agenda

## Como funciona

- O sistema **escreve** numa agenda nova, "Aline Antunes Decora", que aparece dentro do Google Agenda da Aline (no celular e no computador). Vão para lá as festas (dia inteiro), as entregas, as devoluções e os compromissos marcados na Agenda do sistema. Mudou ou apagou no sistema, muda ou some no Google.
- O sistema **lê** a agenda pessoal dela (a principal) para mostrar na Agenda do sistema, só para ela (a assistente não vê). Nada da agenda pessoal fica guardado no banco.
- Quem faz a ponte é a Edge Function `google-agenda` (`supabase/functions/google-agenda/index.ts`), no Supabase. O token do Google fica cifrado na tabela `google_contas`, que nenhuma pessoa logada consegue ler.
- Permissões pedidas ao Google: criar e editar **só a agenda que o próprio sistema criou** (`calendar.app.created`) e **ler** os eventos (`calendar.events.readonly`). O sistema não consegue mudar nem apagar nada da agenda pessoal.

## Passo a passo (uma vez, uns 20 minutos)

### 0. Banco
Rodar `supabase/aplicar/04-agenda-e-google.sql` no SQL Editor (se aparecer o aviso de RLS, "Run and enable RLS").

### 1. Projeto no Google Cloud
1. Entre em **console.cloud.google.com** com a **sua** conta (do Pedro, não a da Aline).
2. No topo, **Selecionar projeto → Novo projeto**. Nome: `Aline Antunes Decora`. Criar.
3. Menu **APIs e serviços → Biblioteca** → procure **Google Calendar API** → **Ativar**.

### 2. Tela de consentimento (o que a Aline vê ao autorizar)
Menu **APIs e serviços → Tela de permissão OAuth** (pode aparecer como **Google Auth Platform**):
1. **Branding:** nome do app `Aline Antunes Decora`, e-mail de suporte (o seu), logo opcional.
2. **Público (Audience):** tipo **Externo**.
3. **Domínios autorizados:** `supabase.co` e `workers.dev` (ou o domínio próprio, quando houver).
4. **Acesso a dados (Data access) → Adicionar escopos:** marque
   - `.../auth/calendar.app.created`
   - `.../auth/calendar.events.readonly`
   - `openid` e `.../auth/userinfo.email`
5. **Publicar o app:** em Público, clique em **Publicar app** ("Em produção").
   - Por que publicar: em modo "Teste", o Google desliga a ligação a cada 7 dias.
   - Como o app não passou pela verificação do Google, na hora de autorizar aparece "O Google não verificou este app". A Aline clica em **Avançado → Acessar Aline Antunes Decora (não seguro)**. Isso é esperado para uso próprio (até 100 pessoas). A verificação do Google entra quando o sistema for vendido para outros clientes.

### 3. Credencial
Menu **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**:
1. Tipo: **Aplicativo da Web**. Nome: `Sistema Aline`.
2. **URIs de redirecionamento autorizados:** adicione exatamente
   `https://nqdlsiqunkeaufgravhg.supabase.co/functions/v1/google-agenda`
3. Criar. Copie o **ID do cliente** e a **Chave secreta do cliente**. A chave secreta vai **só** para o Supabase (passo 5); não mande no chat nem guarde no repositório.

### 4. Chave para cifrar o token
No Supabase, **SQL Editor**, rode:
```sql
select encode(extensions.gen_random_bytes(32), 'base64');
```
Copie o resultado (termina com `=`). Ele também vai só para o Supabase.

### 5. Segredos da função no Supabase
**Edge Functions → Secrets → Add new secret**, um por um:

| Nome | Valor |
|---|---|
| `GOOGLE_CLIENT_ID` | ID do cliente (passo 3) |
| `GOOGLE_CLIENT_SECRET` | chave secreta do cliente (passo 3) |
| `GOOGLE_TOKEN_KEY` | o resultado do passo 4 |
| `APP_URL` | `https://aline-antunes-decora.phonorio1107.workers.dev` |

Confira que na mesma tela já existem `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` (o Supabase cria sozinho).

### 6. Publicar a função
1. **Edge Functions → Deploy a new function → Via Editor**.
2. Nome: `google-agenda` (exatamente assim).
3. Apague o exemplo e cole todo o conteúdo de `supabase/functions/google-agenda/index.ts`.
4. **Deploy**.
5. Nos detalhes da função, desligue **Enforce JWT verification** (ou "Verify JWT"). O retorno do Google chega sem login; as outras ações conferem o login dentro da própria função.

### 7. Ligar
1. A Aline (proprietária) abre **Agenda → Ligar o Google Agenda**.
2. Escolhe a conta Google dela, passa pelo aviso do passo 2.5 e **marca todas as permissões**.
3. Volta para o sistema com "Google Agenda ligado". No Google Agenda dela aparece a agenda "Aline Antunes Decora".
4. Toque em **Mandar tudo de novo** uma vez, para levar os eventos que já existiam.

## Se algo der errado

| O que aparece | O que fazer |
|---|---|
| "A ligação com o Google Agenda ainda não foi ativada no servidor" | A função não está publicada ou o nome não é `google-agenda` (passo 6) |
| Google mostra "redirect_uri_mismatch" | O endereço do passo 3.2 está diferente; copie exatamente |
| Volta com "Faltou marcar as permissões da agenda" | Ligar de novo e marcar todas as caixas |
| "A ligação com o Google expirou ou foi removida" | O app ficou em modo Teste (passo 2.5) ou a Aline removeu o acesso na conta Google; publicar e ligar de novo |
| Erro de CORS no navegador | `APP_URL` diferente do endereço usado; ajustar o segredo |

## Desligar
Na Agenda, **Desligar**: o sistema revoga o acesso no Google e apaga o token. A agenda "Aline Antunes Decora" continua no Google dela; apagar por lá, se quiser.

## Para clientes futuros
Cada cliente usa o mesmo projeto do Google Cloud (passo 1), com mais um URI de redirecionamento por cliente (o Supabase de cada um). Para passar de 100 pessoas ou tirar o aviso de "não verificado", pedir a **verificação do Google**: exige política de privacidade publicada, domínio próprio verificado e um vídeo mostrando o uso das permissões.
