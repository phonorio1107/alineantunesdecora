# E-mails do sistema em português

Modelos para colar no Supabase: **Authentication → Emails → Templates** (em alguns painéis, **Email Templates**). Para cada linha: escolha o modelo na lateral, troque o **Subject** pelo assunto abaixo, apague o corpo e cole o conteúdo do arquivo (aba **Source**), e clique em **Save**.

| Modelo do Supabase | Assunto (Subject) | Arquivo |
|---|---|---|
| **Invite user** (convite) | Você foi convidada para o sistema da Aline Antunes Decora | `convite.html` |
| **Reset password** (esqueci a senha) | Criar uma nova senha no sistema da Aline Antunes Decora | `redefinir-senha.html` |
| **Confirm sign up** | Confirme o seu e-mail no sistema da Aline Antunes Decora | `confirmar-cadastro.html` |
| **Magic link** | Seu link de acesso ao sistema da Aline Antunes Decora | `link-de-acesso.html` |
| **Change email address** | Confirme o novo e-mail no sistema da Aline Antunes Decora | `trocar-email.html` |
| **Reauthentication** | Seu código de segurança do sistema da Aline Antunes Decora | `confirmar-identidade.html` |

Os arquivos usam as variáveis do Supabase (`{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .Token }}`, `{{ .SiteURL }}`): **não apague as chaves duplas**. O logo vem de `{{ .SiteURL }}/icon-192.png`, que o próprio sistema publica.

## Remetente com o domínio (o que falta)
Os modelos resolvem o **idioma**. O **remetente** ("Aline Antunes Decora <nao-responda@...>") exige um serviço de e-mail próprio, porque o envio padrão do Supabase:
- é limitado a poucos e-mails por hora;
- **só entrega para endereços da equipe do projeto Supabase**. O e-mail da Aline não faz parte dela, então o "Esqueci a senha" e os convites **não chegariam** a ela por esse caminho.

Passo a passo (depois que o domínio estiver pronto, Fase 8):
1. Criar conta no **Resend** (plano gratuito, 3.000 e-mails por mês) e adicionar o domínio `alineantunesdecora.com.br`, que é o da Aline. O Resend mostra 3 ou 4 registros DNS para colocar no provedor do domínio (quem registrou o domínio da Aline).
2. Criar uma chave de API no Resend (permissão só de envio).
3. Supabase → **Authentication → Emails → SMTP Settings → Enable custom SMTP**: host `smtp.resend.com`, porta `465`, usuário `resend`, senha = a chave de API, remetente `nao-responda@alineantunesdecora.com.br`, nome `Aline Antunes Decora`.
4. Testar: "Esqueci a senha" com um e-mail que **não** é da equipe do Supabase.
5. Atualizar `docs/lgpd/suboperadores.md` (o Resend vira suboperador).

**Enquanto isso não for feito, não convide ninguém novo por e-mail:** crie o usuário em Authentication → Users com senha e passe a senha por um canal seguro (o que já fizemos com a Aline).
