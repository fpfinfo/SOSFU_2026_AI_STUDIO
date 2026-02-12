# SOSFU - Arquitetura do Sistema

> Sistema de Suprimento de Fundos do TJPA (Tribunal de Justica do Para)

## Visao Geral

O SOSFU e uma aplicacao web SPA que gerencia o ciclo completo de suprimentos de fundos:
solicitacao, analise, execucao, prestacao de contas e arquivamento. Atende multiplos
perfis de usuario (Suprido, Gestor, SOSFU, SODPA, SEFIN, AJSEFIN, Presidencia, SEAD, SGP)
com dashboards e fluxos especificos para cada um.

---

## Stack Tecnologico

| Camada        | Tecnologia                               |
|---------------|------------------------------------------|
| Frontend      | React 18.2 + TypeScript 5.8              |
| Build         | Vite 6.2                                 |
| Estilo        | Tailwind CSS 4.1                         |
| Backend (BaaS)| Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions) |
| IA            | OpenRouter API (primario) + Google Gemini (fallback) |
| Geoespacial   | Leaflet, Maplibre-GL, Google Maps, OpenRouteService |
| PDF           | jsPDF + html2canvas                      |
| Graficos      | Recharts 3.7                             |
| Animacoes     | Framer Motion 12                         |
| Testes        | Vitest 4 + React Testing Library         |
| Lint          | ESLint 9 (flat config) + TypeScript strict |

---

## Estrutura de Diretorios

```
sosfu/
├── App.tsx                    # Roteador principal + auth + role switching
├── index.tsx                  # Entry point React
├── types.ts                   # Tipos globais (Solicitation, Status, etc.)
├── constants.ts               # Dados estaticos (dashboard stats, configs)
├── vite.config.ts             # Config Vite + Vitest
├── eslint.config.js           # ESLint 9 flat config
│
├── components/
│   ├── Header.tsx             # Header global com navegacao
│   ├── TopNav.tsx             # Navegacao superior
│   ├── LoginView.tsx          # Tela de login
│   ├── SolicitationsView.tsx  # Lista de solicitacoes
│   ├── AccountabilityView.tsx # Prestacao de contas
│   ├── ArchiveView.tsx        # Arquivo
│   ├── SettingsView.tsx       # Configuracoes
│   ├── ReportsView.tsx        # Relatorios (lazy-loaded)
│   │
│   ├── process/               # Detalhe do processo
│   │   ├── ProcessDetailView.tsx  # View principal (2300+ linhas)
│   │   ├── useProcessDetail.ts    # Hook com logica extraida
│   │   ├── tabs/                  # Tabs refatoradas
│   │   │   ├── ProcessOverviewTab.tsx
│   │   │   ├── ProcessAnalysisTab.tsx
│   │   │   └── ProcessArchiveTab.tsx
│   │   ├── AuditLogTab.tsx
│   │   ├── ProcessTimeline.tsx
│   │   ├── DocumentTemplates.tsx
│   │   └── NewDocumentModal.tsx
│   │
│   ├── suprido/               # Modulo Suprido (beneficiario)
│   │   ├── SupridoDashboard.tsx
│   │   ├── SupridoFormsView.tsx
│   │   ├── SupridoProcessesView.tsx
│   │   ├── SolicitationModal.tsx
│   │   ├── EmergencySolicitation.tsx
│   │   ├── JurySolicitation.tsx
│   │   ├── DiariasSolicitation.tsx
│   │   ├── RessarcimentoSolicitation.tsx
│   │   ├── active-timeline/       # Timeline interativa
│   │   └── management/            # Gestao de gastos
│   │
│   ├── sodpa/                 # Modulo SODPA
│   │   ├── SodpaCockpit.tsx       # Cockpit principal
│   │   ├── SodpaDashboard.tsx
│   │   ├── SodpaInbox.tsx
│   │   ├── SodpaWorkstation.tsx
│   │   ├── reports/               # Relatorios SODPA
│   │   └── settings/              # Configuracoes SODPA
│   │
│   ├── sefin/                 # Modulo SEFIN
│   │   ├── SefinCockpit.tsx
│   │   ├── SefinDashboard.tsx
│   │   └── ...
│   │
│   ├── ajsefin/               # Modulo AJSEFIN
│   │   ├── AjsefinCockpit.tsx
│   │   ├── AjsefinDashboard.tsx
│   │   └── ...
│   │
│   ├── ressarcimento/         # Modulo Ressarcimento
│   │   ├── RessarcimentoCockpit.tsx
│   │   ├── RessarcimentoDashboard.tsx
│   │   ├── RessarcimentoWorkstation.tsx
│   │   └── settings/
│   │
│   ├── sosfu/                 # Modulo SOSFU (gestao central)
│   │   ├── SosfuWorkstation.tsx
│   │   └── SosfuStatCard.tsx
│   │
│   ├── gestor/                # Dashboard do Gestor
│   ├── presidencia/           # Dashboard da Presidencia
│   ├── sead/                  # Dashboard SEAD
│   ├── sgp/                   # Dashboard SGP
│   │
│   ├── accountability/        # Prestacao de contas
│   │   ├── AccountabilityWizard.tsx
│   │   ├── JuriReviewPanel.tsx
│   │   ├── SmartReceiptCapture.tsx
│   │   ├── SosfuAuditPanel.tsx
│   │   └── OfflineStatusBanner.tsx
│   │
│   ├── settings/              # Sub-componentes de configuracao
│   ├── reports/               # Sub-componentes de relatorios
│   └── ui/                    # Componentes UI reutilizaveis
│       ├── ErrorBoundary.tsx
│       ├── Skeleton.tsx
│       ├── Tooltip.tsx
│       ├── SlaCountdown.tsx
│       ├── FileUploader.tsx
│       └── ...
│
├── hooks/                     # Hooks compartilhados
│   ├── useModulePendingCounts.ts   # Contagem pendente dos cockpits
│   ├── useRealtimeInbox.ts         # Inbox com Supabase Realtime
│   ├── useStaleProcesses.ts        # Processos estagnados
│   ├── useOfflineDrafts.ts         # Rascunhos offline
│   ├── usePriorityScore.ts         # Score de prioridade
│   └── useExpenseElements.ts       # Elementos de despesa
│
├── lib/                       # Servicos e utilitarios
│   ├── supabase.ts                 # Cliente Supabase
│   ├── aiService.ts                # Orquestrador IA (OpenRouter + Gemini)
│   ├── gemini.ts                   # Cliente Google Gemini
│   ├── openRouteService.ts         # Servico de rotas ORS
│   ├── pdfExport.ts                # Geracao de PDF
│   ├── solicitation.service.ts     # CRUD de solicitacoes
│   └── utils.ts                    # Utilitarios gerais
│
├── supabase/
│   ├── functions/
│   │   └── google-maps-proxy/      # Edge Function: proxy Google Maps
│   └── migrations/                 # Migracoes SQL
│
├── tests/                     # Testes automatizados
│   ├── setup.ts                    # Setup global (mocks Supabase)
│   ├── lib/
│   │   └── aiService.test.ts       # Testes do servico de IA
│   └── hooks/
│       └── useModulePendingCounts.test.ts  # Testes do hook de contagem
│
└── public/                    # Assets estaticos
```

---

## Arquitetura de Modulos

O sistema segue uma arquitetura baseada em **perfis de usuario**. Cada perfil tem
seu proprio dashboard/cockpit com funcionalidades especificas:

```
                    ┌──────────────┐
                    │   App.tsx    │
                    │  (Router +   │
                    │   Auth)      │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
    ┌───────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
    │   Suprido    │ │  Gestor  │ │    SOSFU    │
    │  Dashboard   │ │Dashboard │ │ Workstation │
    └──────────────┘ └──────────┘ └─────────────┘
            │                            │
    ┌───────▼──────┐              ┌──────▼──────┐
    │ Solicitation │              │   Cockpits  │
    │   Forms      │              │ SODPA|SEFIN │
    └──────────────┘              │ AJSEFIN|RES │
                                  └─────────────┘
```

### Perfis e Responsabilidades

| Perfil        | Modulo Principal         | Funcao                                    |
|---------------|--------------------------|-------------------------------------------|
| SUPRIDO       | SupridoDashboard         | Criar solicitacoes, prestar contas         |
| GESTOR        | GestorDashboard          | Aprovar/rejeitar solicitacoes da unidade   |
| SOSFU         | SosfuWorkstation         | Gestao central, analise, execucao          |
| SOSFU_GESTOR  | SosfuWorkstation         | Aprovar execucoes, indeferir               |
| SODPA         | SodpaCockpit             | Analisar diarias e passagens               |
| SEFIN         | SefinCockpit             | Assinatura financeira, inteligencia        |
| AJSEFIN       | AjsefinCockpit           | Acompanhamento juridico-financeiro         |
| RESSARCIMENTO | RessarcimentoCockpit     | Processar ressarcimentos                   |
| PRESIDENCIA   | PresidenciaDashboard     | Visao executiva                            |
| SEAD/SGP      | SeadDashboard/SgpDashboard| Gestao administrativa                    |

---

## Fluxo de Status (Solicitation Lifecycle)

```
PENDING
  │
  ▼
WAITING_MANAGER ──► WAITING_CORRECTION ──► (volta para analise)
  │
  ▼
WAITING_[MODULO]_ANALYSIS
  │
  ├──► REJECTED
  │
  ▼
WAITING_[MODULO]_EXECUTION
  │
  ▼
WAITING_SEFIN_SIGNATURE (se aplicavel)
  │
  ▼
WAITING_[MODULO]_PAYMENT
  │
  ▼
WAITING_SUPRIDO_CONFIRMATION
  │
  ▼
APPROVED ──► ARCHIVED
```

Os prefixos de modulo (`SOSFU`, `SODPA`, `RESSARCIMENTO`) determinam
qual cockpit processa cada etapa.

---

## Camada de Dados (Supabase)

### Tabela Principal: `solicitations`

Campos-chave:
- `id` (UUID, PK)
- `process_number` (texto, numero do processo)
- `type` (enum: EMERGENCY, JURY, ORDINARY, DIARIAS_PASSAGENS, RESSARCIMENTO)
- `status` (enum: ~20 status possiveis)
- `beneficiary`, `unit`, `value`, `date`
- `manager_name`, `manager_email`
- `analyst_id` (FK para profiles)
- `created_at`, `updated_at`

### Autenticacao

- Supabase Auth com email/password
- Tabela `profiles` vinculada ao `auth.users`
- Tabela `dperfis` para roles/perfis do sistema
- Role switching via `simulatedRole` (localStorage)

### Realtime

- Supabase Realtime para atualizacoes em tempo real na inbox
- Hook `useRealtimeInbox` escuta INSERT/UPDATE na tabela `solicitations`

### Storage

- Supabase Storage para documentos e comprovantes
- Upload via `FileUploader` component

### Edge Functions

- `google-maps-proxy`: proxy para Google Maps API (evitar CORS e expor API key)

---

## Integracao de IA

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Component   │────►│  aiService   │────►│ OpenRouter  │
│  (front)     │     │ (orchestrate)│     │   API       │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │ fallback
                    ┌──────▼───────┐
                    │   Gemini     │
                    │   (Google)   │
                    └──────────────┘
```

- **OpenRouter** (primario): modelo configuravel, headers padrao
- **Gemini** (fallback): ativado quando OpenRouter falha
- **Sentinela IA**: assistente de analise inteligente com context de solicitacoes

---

## Scripts de Desenvolvimento

```bash
npm run dev          # Servidor local (porta 3000)
npm run build        # Type-check + build producao
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run typecheck    # TypeScript --noEmit
npm run test         # Vitest (todos os testes)
npm run test:watch   # Vitest em modo watch
npm run test:coverage # Cobertura de codigo
```

---

## Decisoes Arquiteturais

1. **SPA sem router**: navegacao via estado (`activeTab`) no App.tsx, sem React Router
2. **BaaS-first**: todo o backend via Supabase (sem servidor custom)
3. **Progressive strict**: TypeScript strict habilitado incrementalmente
4. **Lazy loading**: ReportsView carregado sob demanda (Leaflet ~300KB)
5. **Modulos por perfil**: cada departamento tem seu cockpit independente
6. **Hook compartilhado**: `useModulePendingCounts` elimina duplicacao entre cockpits
7. **Dark mode global**: toggle persistido em localStorage, propagado via prop drilling
8. **Offline-first parcial**: `useOfflineDrafts` para rascunhos quando sem conexao

---

## Proximos Passos (Roadmap Tecnico)

- [ ] Migrar navegacao para React Router (deep linking, back button)
- [ ] Implementar Context/Zustand para dark mode e auth (evitar prop drilling)
- [ ] Adicionar RLS (Row Level Security) no Supabase
- [ ] Expandir cobertura de testes (componentes, integracao)
- [ ] CI/CD com GitHub Actions (lint + test + deploy)
- [ ] Indices no banco para `status`, `analyst_id`, `created_at`
- [ ] Migrar ProcessDetailView para usar tabs refatoradas
