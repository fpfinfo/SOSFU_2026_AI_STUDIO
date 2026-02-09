# SOSFU - TJPA

Sistema de Suprimento de Fundos do Tribunal de Justiça do Estado do Pará - Modulo 1.

Aplicação web para gestão de solicitações de suprimento de fundos, prestação de contas e fluxos de aprovação multi-departamental.

## Stack Tecnológica

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **IA:** Google Gemini (geração de justificativas, OCR de comprovantes)
- **Mapas:** Leaflet + MapLibre GL
- **Deploy:** Vercel
- **Estilização:** Tailwind CSS

## Pré-requisitos

- Node.js >= 18
- npm >= 9

## Configuração

1. Clone o repositório:
   ```bash
   git clone <url-do-repo>
   cd SOSFU_2026_AI_STUDIO
   ```

2. Copie o arquivo de variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```

3. Preencha as variáveis no `.env`:
   ```
   VITE_SUPABASE_URL=<sua-url-supabase>
   VITE_SUPABASE_KEY=<sua-chave-anonima>
   VITE_GEMINI_API_KEY=<sua-chave-gemini>
   ```

4. Instale as dependências:
   ```bash
   npm install
   ```

5. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

   A aplicação estará disponível em `http://localhost:3000`.

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Type-check + build de produção |
| `npm run preview` | Preview do build local |
| `npm run type-check` | Verificação de tipos TypeScript |
| `npm run lint` | Análise estática (ESLint) |
| `npm run lint:fix` | Corrige problemas de lint automaticamente |
| `npm run format` | Formata código (Prettier) |
| `npm run format:check` | Verifica formatação |
| `npm run test` | Executa testes (Vitest) |
| `npm run test:watch` | Testes em modo watch |
| `npm run test:coverage` | Testes com cobertura |

## Arquitetura

```
├── App.tsx                    # Componente principal com roteamento por tabs
├── types.ts                   # Interfaces e enums compartilhados
├── constants.ts               # Constantes da aplicação
├── lib/
│   ├── supabase.ts            # Cliente Supabase
│   └── gemini.ts              # Serviço centralizado Google Gemini
├── hooks/
│   ├── useRealtimeInbox.ts    # Subscrição realtime Supabase
│   ├── usePriorityScore.ts    # Engine de priorização (scoring)
│   ├── useOfflineDrafts.ts    # Rascunhos offline (PWA)
│   ├── useStaleProcesses.ts   # Detecção de processos parados
│   └── useSupabaseQuery.ts    # Hook genérico para queries
├── components/
│   ├── ui/                    # Componentes reutilizáveis (ErrorBoundary, Skeleton, etc)
│   ├── process/               # Detalhe de processo e documentos
│   ├── accountability/        # Prestação de contas e auditoria
│   ├── suprido/               # Dashboard do servidor/suprido
│   ├── sefin/                 # Dashboard SEFIN (finanças)
│   ├── ajsefin/               # Dashboard AJSEFIN (jurídico)
│   ├── gestor/                # Dashboard do gestor
│   ├── sgp/ sead/ sodpa/      # Dashboards departamentais
│   ├── presidencia/           # Dashboard presidência
│   ├── settings/              # Configurações do sistema
│   └── execution/             # Execução de despesas
├── tests/                     # Testes unitários (Vitest)
└── .github/workflows/ci.yml   # Pipeline CI/CD
```

## Perfis de Acesso (RBAC)

O sistema suporta 11 perfis com dashboards específicos:

- **ADMIN** — Administrador geral
- **SOSFU_GESTOR / SOSFU_EQUIPE** — Equipe de suprimento de fundos
- **SEFIN_GESTOR / SEFIN_EQUIPE** — Secretaria de finanças
- **AJSEFIN_GESTOR / AJSEFIN_EQUIPE** — Assessoria jurídica
- **SGP / SEAD / PRESIDENCIA / SODPA** — Departamentos com gestores e equipes
- **GESTOR** — Gestor de unidade
- **USER / SERVIDOR** — Servidor público (suprido)

## Deploy

A aplicação é configurada para deploy no Vercel. O `vercel.json` inclui rewrite rules para SPA.

Variáveis de ambiente devem ser configuradas no painel do Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY`
- `VITE_GEMINI_API_KEY`
