# E-mail da empresa: trocar o dono das contas

Objetivo: todas as contas que sustentam os sistemas dos clientes passam a ser do **e-mail da empresa do Pedro** (um Gmail novo, gratuito), e não do e-mail pessoal. Assim, quando houver mais clientes ou um ajudante, a operação já está separada da vida pessoal.

Nada muda para a Aline: endereço do sistema, banco, chaves e dados continuam iguais. A troca é só de **quem é o dono** de cada conta.

> Regra de ouro: **adicionar o e-mail novo primeiro, conferir que entra, e só depois tirar o antigo.** O e-mail antigo fica como segundo administrador por 30 dias e depois sai.

## 1. Criar o Gmail da empresa (10 min)
- [ ] Criar a conta em accounts.google.com (sugestão de nome: `pedrohoffman.sistemas@gmail.com` ou parecido; o que importa é ser fácil de ditar).
- [ ] Senha longa, guardada no gerenciador de senhas.
- [ ] **Verificação em duas etapas** com app autenticador (não só SMS).
- [ ] **Códigos de backup** impressos ou no gerenciador de senhas.
- [ ] Telefone de recuperação: o seu celular. E-mail de recuperação: o pessoal (pode trocar depois).
- [ ] Nome de exibição: `Pedro Hoffman`.

Esse e-mail passa a ser a **chave mestra**: quem o controla controla Cloudflare (login Google) e recupera as outras contas. Por isso o 2FA aqui é obrigatório.

## 2. GitHub (5 min)
Manter a mesma conta (`phonorio1107`) e trocar só o e-mail. Trocar o nome de usuário ou mudar o repositório de conta quebraria a ligação com o Cloudflare e os endereços antigos, sem ganho agora.

- [ ] Settings → **Emails** → Add email → confirmar pelo link que chega no Gmail novo.
- [ ] **Primary email**: escolher o novo.
- [ ] Settings → **Notifications** → Default notifications email: o novo (os alertas do Dependabot e da verificação automática passam a chegar lá).
- [ ] Depois de 30 dias sem problemas: remover o e-mail pessoal da lista.

## 3. Supabase (10 min)
Primeiro confira **como você entra** hoje no supabase.com:

- **Entra com o botão do GitHub:** a conta do Supabase segue a do GitHub. Basta conferir em Account → Preferences se o e-mail mostrado já é o novo; se não for, sair e entrar de novo pelo GitHub. Não precisa convidar ninguém.
- **Entra com e-mail e senha:**
  - [ ] Na organização: **Team → Invite** → e-mail novo, papel **Owner**.
  - [ ] Aceitar o convite pelo Gmail novo e criar a conta (de preferência já **com o botão do GitHub**, para ficar tudo amarrado na mesma conta).
  - [ ] Ligar o **2FA** na conta nova (Account → Security).
  - [ ] Conferir que vê o projeto `aline_antunes_decora-dev`, o SQL Editor e as Edge Functions.
  - [ ] Depois de 30 dias: remover o e-mail antigo da organização.

Nada muda no projeto: URL, chaves, usuários da Aline e segredos ficam iguais.

## 4. Cloudflare (10 min)
- [ ] No painel, **Manage Account → Members → Invite** → e-mail novo, papel **Super Administrator - All Privileges**.
- [ ] Aceitar pelo Gmail novo e entrar com **Continuar com Google** usando o Gmail novo.
- [ ] Conferir que vê o Worker `aline-antunes-decora` e o R2.
- [ ] **Notifications**: alertas indo para o e-mail novo.
- [ ] Depois de 30 dias: remover o membro antigo.

O 2FA continua o mesmo raciocínio de antes: login pelo Google, protegido pelo 2FA do Gmail novo.

## 5. Contas que ainda vão nascer
Já criar **direto com o e-mail novo**, para não ter que migrar depois:
- [ ] Google Cloud (ligação com o Google Agenda, `docs/google-agenda.md`).
- [ ] Resend (e-mail do sistema com o domínio da Aline, Fase 8).
- [ ] Bucket R2 e chave do backup (`docs/backup.md`): ficam dentro da conta Cloudflare, que já terá o e-mail novo.
- [ ] Futuros: monitor de disponibilidade, painel de saúde, conta bancária/MEI, contador.

## 6. Fechar
- [ ] Atualizar a tabela "Contas e quem tem acesso" do `README.md` com o e-mail novo.
- [ ] Marcar no `PROJETO.md` (Histórico) a data em que cada conta mudou.
- [ ] Daqui a 30 dias: tirar o e-mail pessoal do GitHub, do Supabase e do Cloudflare.

## Se algo der errado
| Situação | O que fazer |
|---|---|
| Convite do Supabase ou do Cloudflare não chega | Olhar Spam e Promoções; reenviar pelo mesmo painel |
| Entrou no Supabase e não vê o projeto | Entrou numa conta diferente da convidada; sair e entrar com o e-mail do convite |
| Cloudflare pede outra conta ao entrar com Google | Escolher o Gmail novo na lista do Google, não o pessoal |
| Perdeu o acesso ao Gmail novo | Usar os códigos de backup ou o telefone de recuperação; por isso o antigo fica 30 dias como segundo administrador |
