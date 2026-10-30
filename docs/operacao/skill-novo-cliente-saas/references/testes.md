# Como testar (e o que olhar)

## Sempre
```bash
npx tsc -b
npx vitest run
npm run build
```
Funções de cálculo (lucro, parcelas, estoque, áreas) ficam em `src/lib/calculos.ts`, puras e com teste. Regra nova de dinheiro ganha teste antes de ganhar tela.

## Prévia (banco simulado)
- `npx vite build --mode demo` gera `dist-demo/`, com o backend em memória de `src/demo/banco.ts`: REST, RPC, login, verificação em duas etapas (código 123456) e Edge Functions simuladas.
- Sirva com um servidor que aplique o `dist/_headers` (CSP): assim os testes pegam erro de CSP também.
- **Recarregar a página apaga a sessão e os dados.** Navegue clicando, ou com `history.pushState` + `popstate`. Nunca use `page.goto` no meio do teste.
- O tema escuro pode ser escolha do sistema (classe e `localStorage`), não do celular. Nesse caso, `colorScheme: 'dark'` não o liga: use `addInitScript` para gravar a chave antes de abrir.
- Rode serviços longos em segundo plano com tempo limite alto. Não use `pkill -f nome`: o comando pode matar o próprio terminal.

## Roteiro com Playwright
Para cada mudança de tela, um script curto:
- entrar;
- percorrer o fluxo pedido, do jeito que o cliente faria;
- prints em 1280px e 360px;
- capturar `pageerror` e `console.error`;
- conferir `document.documentElement.scrollWidth <= largura`.

**Olhe os prints** (Read na imagem); não basta o script passar. Arquivo gerado (PDF, Excel) na prévia: capture o blob pelo evento da prévia e converta as páginas em imagem (`pdftoppm`) para olhar.

## Auditoria automática (Fase 7, Fase 10 e toda mudança visual)
```bash
URL=http://127.0.0.1:4173 EMAIL=teste@demo.com SENHA=x npm run auditoria
```
O `scripts/qualidade/auditoria.cjs` entra, abre cada item do menu nos temas claro e escuro, em 1280px e 360px, e aponta:
- contraste abaixo de 4,5:1 (3:1 para texto grande), medido contra o fundo real;
- data ISO ou americana, ponto decimal, NaN/undefined/null na tela;
- rolagem lateral;
- mais de um botão principal visível.

Precisa sair limpo. Antes de confiar num resultado "zero", confirme uma vez que o detector acusa um erro plantado. Para corrigir contraste sem mudar a identidade, crie um token de tom vizinho (ex.: `--accent-ink`) só para o lugar que reprova.

## Banco
Veja `banco.md`: isolamento local em banco novo e em banco com dados, e o arquivo `aplicar/` testado no estado anterior.

## O que dizer no fim
"Testado: tipos, N testes, build; fluxo X percorrido na prévia no computador e no celular; auditoria limpa; isolamento com a verificação N passando." Se não deu para testar contra o Supabase real ou o domínio publicado, diga isso e passe ao Pedro o roteiro de conferência no ar.
