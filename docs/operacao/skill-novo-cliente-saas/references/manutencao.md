# Modo manutenção: pedidos e correções do dia a dia

Para quando o sistema já está em uso e o Pedro chega com "a cliente pediu…", "deu erro em…" ou "dá para mudar…?".

## 1. Entender e classificar (antes de mexer)
Leia o `PROJETO.md` ("Decisões" e "Histórico") e classifique cada pedido:

| Tipo | Exemplos | Precisa de SQL? | Pode publicar direto? |
|---|---|---|---|
| Texto ou visual | trocar rótulo, cor, ordem de menu | não | sim, depois dos testes |
| Regra na tela | máscara, validação, campo opcional | não | sim, depois dos testes |
| Dado novo | campo novo, IE, observação | **sim** | só depois do Pedro rodar o SQL |
| Fluxo ou módulo | estoque, orçamento → contrato, parcelamento | **sim** | só depois do SQL e da aprovação |
| Erro | "não consigo excluir", "deu tela branca" | depende | correção mínima primeiro |

- **Erro:** reproduza na prévia ou no teste local antes de corrigir. Encontre a causa; não esconda o sintoma. Se só acontece com o banco real, peça ao Pedro o texto exato do erro ou um print.
- **Pedido ambíguo:** faça de 1 a 4 perguntas de múltipla escolha, com recomendação, sobre o que muda a construção. Para o resto, escolha o padrão óbvio e diga qual foi.
- **Pedido que cruza com uma decisão registrada:** cite a decisão e pergunte se mudou.
- **Lista que veio cortada** (item vazio, frase pela metade): diga isso numa linha e siga com o resto.

## 2. Fazer
- Uma branch de trabalho; commits pequenos com mensagem em português e o porquê.
- Ao mexer num nome que aparece em vários lugares (ex.: "Nova cliente" → "Novo cliente"), procure em todo o código, nos avisos, nos textos vazios, nos PDFs e na prévia.
- Ao renomear ou juntar telas, mantenha os endereços antigos redirecionando (links salvos, Google Agenda, e-mails).
- Dado novo no banco: siga `banco.md` à risca.
- Prévia (`src/demo/banco.ts`): acompanhe toda mudança de banco, senão a prévia mente.

## 3. Testar
Siga `testes.md`. O mínimo: tipos, testes, build, o fluxo pedido percorrido na prévia em 1280px e 360px, e `npm run auditoria` se mexeu em tela.

## 4. Entregar
Resposta ao Pedro, nesta ordem:
1. Uma frase: o que ficou pronto e onde está (publicado ou só na branch).
2. O que mudou, por pedido, em linguagem de usuário.
3. Como foi testado.
4. **O que ele precisa fazer**, numerado (rodar SQL, conferir no ar, perguntar algo à cliente).
5. Prints da prévia (dados fictícios) para ele mostrar à cliente.

Atualize o `PROJETO.md`: uma linha no "Histórico" e as decisões novas em "Decisões". Itens de fase que o pedido resolveu ganham `[x]` com evidência.

## 5. Publicar
- Sem banco: depois dos testes, publique na `main` (o Cloudflare publica em 1 a 2 minutos) e passe ao Pedro um roteiro curto de conferência no ar.
- Com banco: entregue o SQL num bloco para copiar; publique **só quando o Pedro disser que rodou**. Depois, registre no "Histórico" que foi aplicado.
- Edge Function alterada: lembre que ela precisa ser publicada de novo (`supabase functions deploy nome`), com o passo a passo.

## Pedidos que costumam vir juntos (antecipe)
- **Excluir algo com histórico** (cliente, peça): exclusão lógica ou anonimização (LGPD), nunca apagar dinheiro do passado.
- **Repetição de lançamentos:** parcelado (N vezes), todo mês, excluir "esta e as seguintes", parar de repetir.
- **Máscaras:** telefone, CPF/CNPJ, CEP, dinheiro; nomes e cidades com inicial maiúscula; campos com 16px (o iPhone não dá zoom).
- **Ver a senha** (olho) e círculo de carregamento ao entrar.
- **Mais de uma categoria por registro:** pergunte como o dinheiro se divide no relatório.
