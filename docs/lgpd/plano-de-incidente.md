# Plano de resposta a incidentes · Sistema Aline Antunes Decora

> **RASCUNHO para revisão de advogado.** Versão de 30/10/2026. Uso interno do Pedro (operador).

Incidente é qualquer acesso não autorizado, vazamento, perda, alteração ou indisponibilidade de dados pessoais. Exemplos: senha da Aline vazada, alguém da equipe vendo dados que não devia, banco apagado, backup exposto, chave do Supabase publicada por engano.

## Prazos

| Quem avisar | Prazo | Como |
|---|---|---|
| Aline (controladora) | **Até 24 horas** depois de saber | WhatsApp e e-mail, por escrito |
| ANPD (a controladora comunica, com o apoio do operador) | **Até 3 dias úteis**, quando houver risco ou dano relevante aos titulares | Formulário da ANPD |
| Titulares afetados (a controladora comunica) | No mesmo prazo, quando houver risco relevante | Mensagem direta, linguagem simples |

## Passo a passo

1. **Conter (primeira hora):** trocar senhas e chaves envolvidas; desativar o usuário suspeito; se preciso, tirar o sistema do ar no Cloudflare.
2. **Entender:** o que aconteceu, quando, quais dados, quantas pessoas, se os dados estavam criptografados.
3. **Avisar a Aline** em até 24 horas, mesmo sem ter todas as respostas.
4. **Corrigir** a causa (código, configuração, acesso) e, se houve perda, restaurar do backup (`docs/backup.md`).
5. **Apoiar a comunicação** à ANPD e aos titulares, se for o caso.
6. **Registrar** no histórico de incidentes abaixo. Guardar o registro por **5 anos**, mesmo quando não houver comunicação à ANPD.

## Contatos

| Quem | Contato |
|---|---|
| Aline (controladora) | [WhatsApp], [e-mail] |
| Encarregada | [nome e contato] |
| Suporte Supabase | painel do Supabase → Support |
| Cloudflare | painel → Support |
| ANPD | https://www.gov.br/anpd |

## Histórico de incidentes

| Data | O que houve | Dados e pessoas afetadas | Comunicado à ANPD? | Medidas |
|---|---|---|---|---|
| — | Nenhum até agora | — | — | — |
