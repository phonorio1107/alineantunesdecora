# Revisão do código da branch `claude/eager-ramanujan-xcz3om`

> Revisado em 28/10/2026, para decidir o que entra na Fase 6. Nada foi alterado na branch antiga.

## Resumo

Base bem feita e saudável (compila, tipos estritos, nenhuma vulnerabilidade), mas **construída para a v2** (agenda, orçamentos, ordens de serviço, acervo) e **sem o financeiro**, que é a v1. A segurança do banco **não segue o padrão**: qualquer usuário logado veria e alteraria tudo. Recomendação: **aproveitar a estrutura do projeto e os utilitários, reescrever o banco e a camada de dados**, e guardar as telas da v2 para depois.

## Como foi verificado

| Verificação | Resultado |
|---|---|
| `npm ci` | instalou sem erro |
| `npm run typecheck` (TypeScript estrito) | sem erros |
| `npm run build` | build ok |
| `npm audit --omit=dev` | 0 vulnerabilidades |
| Busca por segredos, `service_role`, `dangerouslySetInnerHTML`, `innerHTML` | nada encontrado |
| Tamanho | 38 arquivos, cerca de 1.900 linhas em `src/` |

## O que está bom e vai ser aproveitado

- **Estrutura do projeto:** React + TypeScript estrito + Vite + Tailwind, `package.json`, `tsconfig.json`, `vite.config.ts`.
- **`public/_redirects`** para as rotas da aplicação (item da Fase 8).
- **`src/lib/supabase.ts`** usa só a chave pública (anon), lida de variável de ambiente.
- **`src/lib/format.ts`**: moeda e datas em pt-BR, "Hoje", "Amanhã", "Em 3 dias".
- **Ícones e manifest** (`favicon`, `apple-touch-icon`, `icon-192/512`, `manifest.webmanifest`).
- **Para a v2, guardar:** telas de Agenda, Orçamentos, Ordens de serviço e Estoque, o gerador de PDF do orçamento (`src/lib/pdfOrdem.ts`, com jsPDF) e os tipos do acervo.

## O que precisa mudar (e por quê)

### Crítico: segurança do banco (`supabase/migrations/0001_estrutura_inicial.sql`)

1. **Todas as tabelas têm a política `using (true) with check (true)` para qualquer usuário autenticado.** Isso viola o checklist da Fase 4: não há separação por empresa e, se o cadastro ficar aberto por engano, qualquer pessoa que criar conta lê e altera os dados das clientes da Aline. **Reescrever** com políticas por `empresa_id` via `usuarios_empresas`, separadas por operação, com `with check`.
2. **Faltam as colunas padrão** `empresa_id`, `criado_por`, `atualizado_em`, `excluido_em` e os índices em `empresa_id`.
3. **Faltam perfis:** não existe `usuarios_empresas`, então não dá para ter proprietária, assistente e freelancer checados no banco.

### Importante: o banco não tem a v1

4. **Não há tabelas do financeiro:** `contas`, `categorias`, `lancamentos`, `recorrencias`, `fechamentos_mensais`, `inscricoes_workshop`, `registros_atividades`. São o coração da v1 aprovada em `docs/fase-2-modelagem.md`.
5. **`clientes` não tem** `cpf_cnpj` nem endereço; **`eventos` não tem** valor fechado nem fonte (decoração, assessoria ou workshop).
6. **Nome da migração sem data** (`0001_...`): o padrão é com data (`20261028120000_...`).

### Importante: dados guardados no aparelho

7. **`src/data/store.tsx` guarda clientes e eventos no `localStorage`.** Era só para a demonstração, mas com dados reais isso deixaria nome e telefone de clientes salvos no navegador, fora do controle de acesso. Na v1 os dados vêm só do Supabase.

### Ajustes de padrão do template

8. **Faltam bibliotecas do padrão:** TanStack Query (dados), React Hook Form + Zod (formulários com validação), shadcn/ui (componentes).
9. **Não há login** (convite, recuperar senha, sair de todos os dispositivos): Fase 5.
10. **Fonte do corpo:** o código usa Plus Jakarta Sans e o protótipo usa DM Sans. Decidir na Fase 7.

## Plano para a Fase 6

1. Trazer a estrutura do projeto e os utilitários listados acima para a branch de trabalho.
2. Escrever a migração nova a partir do modelo aprovado, com RLS por empresa e o teste de isolamento (Fase 4).
3. Trocar `store.tsx` por chamadas ao Supabase com TanStack Query.
4. Construir as telas da v1 a partir do protótipo (Início, Lançar, Lançamentos, Eventos, Clientes, Relatórios, Configurações).
5. Guardar as telas da v2 numa pasta separada, fora das rotas, até chegar a vez delas.
