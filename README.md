# Aline Antunes Decora — Sistema de gestão

Sistema web (celular e computador) para a **Aline Antunes Decora**, assessoria e decoração de eventos:
festas infantis, casamentos, 15 anos, chás, batizados e eventos corporativos.

## Módulos

| Módulo | O que faz |
| --- | --- |
| **Início** | Resumo do dia: próximas festas, valor fechado no mês, orçamentos em aberto e ordens em andamento. |
| **Agenda** | Calendário mensal das festas com horários de montagem, local e número de convidados. |
| **Orçamentos** | Propostas por status (rascunho, enviado, aprovado, recusado), valor e sinal pago. |
| **Ordens de serviço** | Checklist de preparação e equipe de cada festa. |
| **Acervo** | Itens próprios usados nas decorações: quantidade, valor, volume, local e conservação. |
| **Clientes** | Cadastro com origem do contato e atalho para o WhatsApp. |

Por enquanto as telas usam **dados de demonstração** (`src/data/demo.ts`). A conexão com o Supabase vem na próxima etapa.

## Tecnologias

- React 19 + TypeScript + Vite
- Tailwind CSS 4 (cores da marca em `src/index.css`)
- Supabase (banco e login) — esquema em `supabase/migrations/`
- Cloudflare Pages (hospedagem) — `public/_redirects` já trata as rotas
- Instalável no celular (PWA: `public/manifest.webmanifest`)

## Rodando localmente

```bash
npm install
npm run dev
```

Para conectar ao Supabase, copie `.env.example` para `.env.local` e preencha a URL e a chave anônima do projeto.

## Publicando no Cloudflare Pages

- Comando de build: `npm run build`
- Pasta de saída: `dist`
- Variáveis de ambiente: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
