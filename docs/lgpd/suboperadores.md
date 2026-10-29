# Anexo: suboperadores · Sistema Aline Antunes Decora

> **RASCUNHO para revisão de advogado.** Versão de 30/10/2026. Vai como anexo do contrato entre Pedro Hoffman (operador) e Aline Antunes Decora (controladora).

| Fornecedor | O que faz no sistema | Dados que trata | Onde | Garantias |
|---|---|---|---|---|
| **Supabase Inc.** | Banco de dados e login | Todos os dados do sistema | Banco em São Paulo (Brasil); empresa nos EUA | Contrato de tratamento de dados (DPA) do Supabase; criptografia em trânsito e em repouso |
| **Cloudflare Inc.** | Publica o sistema (site) | Endereço IP e dados de navegação de quem usa | Rede global (inclui EUA) | DPA da Cloudflare; cláusulas-padrão para transferência internacional |
| **Cloudflare R2** | Guarda os backups | Cópia do banco, **criptografada** (a Cloudflare não consegue ler) | Definido no bucket | Idem; chave de abertura só com o operador |
| **Google LLC (Google Agenda)** | Opcional, só se a proprietária ligar: recebe na agenda "Aline Antunes Decora" o nome do evento, o nome da cliente, o local e os horários de festa, entrega, devolução e compromissos; o sistema lê a agenda pessoal dela só para mostrar, sem guardar | Título, nome da cliente, local, datas (nunca CPF, telefone ou valores) | EUA e outros | Termos do Google Workspace/Google Agenda da conta da proprietária; o token de acesso fica cifrado e é revogado ao desligar |
| **GitHub Inc. (Microsoft)** | Guarda o código e roda o backup diário | Durante o backup, os dados passam pela máquina temporária, que é apagada ao final; o código não tem dados pessoais | EUA | DPA do GitHub |

**Não são suboperadores** (não recebem dados do sistema): Google Fonts (as fontes são servidas pelo próprio sistema) e ferramentas de mensagem usadas para conversar com a Aline.

**Futuros (avisar a controladora antes de usar):** serviço de envio de e-mails do login (por exemplo, Resend), se o envio do próprio Supabase não for suficiente.

O operador avisa a controladora com pelo menos 15 dias de antecedência antes de incluir ou trocar um suboperador.

> Conferir com o advogado: os links e as versões atuais dos DPAs de cada fornecedor, e a região do bucket R2.
