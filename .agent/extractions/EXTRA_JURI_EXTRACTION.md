# 🔍 Extração Completa: Lógica Extra-Júri (Sessão de Júri)

## 📋 Sumário Executivo

A lógica de **Extra-Júri** (Sessão de Júri / Suprimento Extraordinário para Júri) está distribuída em **6 arquivos principais** no repositório de referência (`__ref_repo`) e **parcialmente implementada** no projeto ativo (`SOSFU_2026_AI_STUDIO`).

---

## 🏗️ ARQUITETURA DO FLUXO

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO EXTRA-JÚRI COMPLETO                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. SUPRIDO (Solicitação)                                       │
│     ├── SupridoDashboard.tsx → renderForm() [Wizard 3 Steps]    │
│     │   ├── Step 1: Pessoas Envolvidas (7 categorias)           │
│     │   ├── Step 2: Projeção de Custos (datas + refeições)      │
│     │   └── Step 3: Justificativa + Assinatura                  │
│     ├── handleSaveJuriDraft() → Salvar Rascunho                 │
│     ├── handleSubmitJuriToAtesto() → Validações + Modal Assin.  │
│     └── handleConfirmSubmitAfterSigning() → Insert + Docs       │
│                                                                  │
│  2. SOSFU (Análise de Concessão)                                │
│     ├── DashboardSOSFU.tsx → action 'adjustQty'                 │
│     └── JuriReviewPanel.tsx → Painel de Análise                 │
│         ├── Participantes: Solicitado vs Aprovado               │
│         ├── Projeção: Vl.Unit/Qtd Solicitada vs Aprovada        │
│         ├── Total Solicitado vs Total Aprovado                  │
│         └── Ações: Salvar | Diligenciar | Aprovar e Conceder    │
│                                                                  │
│  3. ALERTAS & EXCEÇÕES                                          │
│     └── JuriExceptionInlineAlert.tsx                            │
│         ├── Policiais > 5 → Fluxo especial (AJSEFIN/Ordenador) │
│         ├── Refeições acima limites ($30/30/11)                 │
│         ├── Prazo < 7 dias → Ofício justificativa               │
│         └── PC atrasada > 30 dias                               │
│                                                                  │
│  4. PRESTAÇÃO DE CONTAS (Accountability)                        │
│     └── PrestacaoContasWizard.tsx → JuriExceptionInlineAlert    │
│                                                                  │
│  5. CONFIGURAÇÃO DINÂMICA                                       │
│     └── SystemSettings.tsx → juri_servidores, juri_defensor,    │
│                               juri_promotor, juri_policias      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 MAPEAMENTO DE ARQUIVOS

### Arquivo 1: `__ref_repo/components/Suprido/SupridoDashboard.tsx` (274KB)
**Responsabilidade:** Formulário de solicitação Extra-Júri (Wizard)

#### Interfaces & Types (Linhas 94-140):
```typescript
interface JuriParticipants {
  [key: string]: number;
  servidores: number;   // Servidor do Fórum
  reus: number;         // Réus
  jurados: number;      // Jurados
  testemunhas: number;  // Testemunhas
  defensor: number;     // Defensor Público
  promotor: number;     // Promotor
  policias: number;     // Polícias
}

interface ProjectionItem {
  id: string;
  description: string;
  element: string;       // Código elemento despesa (3.3.90.30.01, etc)
  unitValue: number;
  quantity: number;
  total: number;
  isAuto?: boolean;      // Calculado automaticamente
  freqType?: 'almocos' | 'jantares' | 'lanches';
}

interface FormState {
  // ... campos comuns ...
  juriParticipants: JuriParticipants;
  juriComarca: string;
  juriProcessNumber: string;
  juriMealFreq: { almocos: number; jantares: number; lanches: number; };
  juriDays: number;
  juriProjectionItems: ProjectionItem[];
}
```

#### Constantes (Linhas 151-167):
```typescript
const DEFAULT_JURI_ITEMS: ProjectionItem[] = [
  // 3 itens AUTO (refeições calculadas com base em participantes × frequência)
  { id: 'almoco', description: 'Refeição - Almoço', element: '3.3.90.30.01', unitValue: 30, isAuto: true, freqType: 'almocos' },
  { id: 'jantar', description: 'Refeição - Jantar', element: '3.3.90.30.01', unitValue: 25, isAuto: true, freqType: 'jantares' },
  { id: 'lanche', description: 'Lanches', element: '3.3.90.30.01', unitValue: 10, isAuto: true, freqType: 'lanches' },
  // 12 itens MANUAIS
  { id: 'agua', description: 'Água Mineral 20L', ... },
  { id: 'biscoito', description: 'Biscoito / Bolacha', ... },
  { id: 'suco', description: 'Suco - Polpa KG', ... },
  { id: 'cafe', description: 'Café KG', ... },
  { id: 'acucar', description: 'Açúcar KG', ... },
  { id: 'descartaveis', description: 'Descartáveis', ... },
  { id: 'material', description: 'Material de Expediente', ... },
  { id: 'combustivel', description: 'Combustível', element: '3.3.90.30.02', ... },
  { id: 'xerox', description: 'Foto Cópia (Xerox)', element: '3.3.90.39.01', ... },
  { id: 'som', description: 'Serviço de Som', element: '3.3.90.39.01', ... },
  { id: 'locacao', description: 'Locação de Equipamentos Diversos', element: '3.3.90.39.01', ... },
  { id: 'outros', description: 'Outros (Especificar)', ... },
];
```

#### Estado Dinâmico de Config (Linhas 277-280):
```typescript
const [juriLimits, setJuriLimits] = useState({
  participantes: { servidores: 7, defensor: 2, promotor: 2, policias: 5 },
  refeicoes: { almoco: 30, jantar: 25, lanche: 10 }
});
```

#### Cálculo Automático (Linhas 1296-1349):
- Quando `type === 'Sessão de Júri'`:
  - Calcula dias entre `startDate` e `endDate`
  - Calcula total de participantes
  - Para itens `isAuto`, calcula: `qty = totalParticipants × frequência`
  - Total item = `qty × unitValue`
- Atualiza `unitValue` dos itens de refeição quando config DB é carregada

#### Funções de Persistência:
1. **handleSaveJuriDraft()** (L1366-1402): Salva rascunho na tabela `solicitacoes`
2. **handleSubmitJuriToAtesto()** (L1404-1417): Valida assinatura e justificativa
3. **handleConfirmSubmitAfterSigning()** (L1419-1565): 
   - Insere `solicitacoes` com `tipo: 'Sessão de Júri'`, `status: 'EM ANÁLISE SOSFU'`
   - Cria 3 documentos: Capa, Requerimento, Certidão de Atesto
   - Campos específicos: `juri_participantes`, `comarca_destino`, `processo_judicial`, `juri_dias`, `juri_frequencia_refeicoes`, `juri_projecao_custos`

#### Wizard UI (renderForm, Linhas 2725-3262):
- **Step 1: Pessoas Envolvidas** — Grid com 7 categorias, max values configuráveis, badge de exceção se policiais > 5
- **Step 2: Projeção** — Datas + Frequência refeições (painéis +/-) + Tabela itens projeção + Total Geral
- **Step 3: Justificativa** — Resumo financeiro por elemento + Urgência + Dados Gestor + Geração IA + Assinatura

---

### Arquivo 2: `__ref_repo/components/JuriReviewPanel.tsx` (390 linhas)
**Responsabilidade:** Painel de análise SOSFU — Ajuste de quantidades aprovadas

#### Lógica Core:
- Busca `solicitacao` por ID da tabela `solicitacoes`
- Exibe **Participantes**: coluna Solicitado (read-only) vs coluna Aprovado (editável)
- Exibe **Projeção de Custos**: Vl.Unitário Solicitado vs Aprovado + Qtd Solicitada vs Aprovada
- Calcula **Total Aprovado** dinamicamente
- Persiste em campos: `juri_participantes_aprovados`, `juri_projecao_aprovados`, `valor_total`
- Integra `TramitarModal` para Diligenciar ou Aprovar e Conceder

#### Campos Supabase (update):
```typescript
{
  juri_participantes_aprovados: participantesAprovados,
  juri_projecao_aprovados: projecaoAprovada,
  valor_total: totalAprovado,
  updated_at: new Date().toISOString()
}
```

---

### Arquivo 3: `__ref_repo/components/ui/JuriExceptionInlineAlert.tsx` (223 linhas)
**Responsabilidade:** Componente de alerta para exceções

#### Limites Configurados:
```typescript
const LIMITS = {
  policiais: 5,
  almoco: 30.00,
  jantar: 30.00,
  lanche: 11.00,
  prazo_minimo_dias: 7,
  pc_prazo_dias: 30
};
```

#### Exceções Detectadas:
1. **Policiais > 5** → Fluxo especial: Suprido → Gestor + Ofício → SOSFU → AJSEFIN → Ordenador
2. **Almoço > R$30** / **Jantar > R$30** / **Lanche > R$11** → Autorização especial
3. **Prazo < 7 dias** → Ofício justificativa do Gestor
4. **PC atrasada > 30 dias** → Autorização por atraso

#### Adaptação por Role:
- `SUPRIDO`: Tom informativo (amber)
- `GESTOR`: Tom de ação necessária (purple) — "Anexe Ofício de Justificativa"
- `SOSFU`: Tom de análise (amber) — "Gere Despacho para AJSEFIN"
- Outros: Tom institucional (blue) — "Autorização do Ordenador necessária"

---

### Arquivo 4: `__ref_repo/components/DashboardSOSFU.tsx` (984 linhas)
**Responsabilidade:** Integração do JuriReviewPanel no Dashboard SOSFU

#### Integração (Linhas 907-917):
```tsx
{reviewingProcessId && (
  <JuriReviewPanel
    solicitacaoId={reviewingProcessId}
    onClose={() => setReviewingProcessId(null)}
    onSave={() => {
      setReviewingProcessId(null);
      refreshProcesses();
    }}
  />
)}
```

#### Trigger (Linha 378):
```typescript
// Na handleAction:
else if (action === 'adjustQty') setReviewingProcessId(id);
```

---

### Arquivo 5: `__ref_repo/components/SystemSettings.tsx`
**Responsabilidade:** Configuração dos limites de júri

#### Campos configuráveis (Linhas 479-494):
- `juri_servidores` — Limite de servidores
- `juri_defensor` — Limite de defensores públicos
- `juri_promotor` — Limite de promotores  
- `juri_policias` — Limite de policiais

#### Chaves Supabase:
- `juri_limites_participantes` → JSON com limites por categoria
- `juri_valores_refeicoes` → JSON com valores unitários refeições

---

### Arquivo 6: `__ref_repo/components/Suprido/PrestacaoContasWizard.tsx`
**Responsabilidade:** Wizard de prestação de contas com alert de exceção

#### Uso do JuriExceptionInlineAlert (Linhas 392, 515):
- Integra alerta de prestação de contas fora do prazo
- Detecta atraso > 30 dias e exibe fluxo de autorização especial

---

## 🗄️ SCHEMA SUPABASE (Campos Específicos Júri)

### Tabela `solicitacoes`:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `tipo` | text | `'Sessão de Júri'` |
| `juri_participantes` | jsonb | `{ servidores, reus, jurados, testemunhas, defensor, promotor, policias }` |
| `juri_participantes_aprovados` | jsonb | Mesma estrutura, valores aprovados pela SOSFU |
| `juri_projecao_custos` | jsonb | Array de `ProjectionItem[]` |
| `juri_projecao_aprovados` | jsonb | Array com `approvedQty` e `approvedUnitValue` |
| `juri_dias` | integer | Dias de sessão |
| `juri_frequencia_refeicoes` | jsonb | `{ almocos, jantares, lanches }` |
| `comarca_destino` | text | Comarca do júri |
| `processo_judicial` | text | Número do processo judicial |

### Tabela `configuracoes_sistema`:
| Chave | Tipo | Descrição |
|-------|------|-----------|
| `juri_limites_participantes` | jsonb | Limites por categoria |
| `juri_valores_refeicoes` | jsonb | Valores unitários das refeições |

---

## ✅ STATUS NO PROJETO ATIVO (Atualizado: 2026-02-07)

### Já implementado:
| Arquivo | Status | Notas |
|---------|--------|-------|
| `components/suprido/JurySolicitation.tsx` | ✅ Completo | Wizard 3 steps, fetch config, AI justification, submit + JuriExceptionInlineAlert integrado |
| `components/suprido/EmergencySolicitation.tsx` | ✅ Existe | Formulário Extra-Emergencial separado |
| `components/ui/JuriExceptionInlineAlert.tsx` | ✅ Criado | Alertas de exceção por role (USER, GESTOR, SOSFU, AJSEFIN, SEFIN) |
| `components/accountability/JuriReviewPanel.tsx` | ✅ Criado | Painel de análise SOSFU — participantes + despesas (solicitation_items) |
| `components/process/ProcessDetailView.tsx` | ✅ Integrado | JuriReviewPanel na aba ANALYSIS para processos TJPA-JUR |
| `components/settings/GeneralSettings.tsx` | ✅ Completo | Sub-aba "Júri" com limites de participantes e valores de refeição (app_config) |

### Integração concluída:
| Componente | Status | Detalhes |
|-----------|--------|---------|
| JuriExceptionInlineAlert no JurySolicitation | ✅ Feito | Step 1: alerta policial. Step 2: alerta valores/prazos |
| JuriReviewPanel no ProcessDetailView | ✅ Feito | Botão "Abrir Painel de Revisão" na aba Análise (SOSFU only) |
| Config Limites em GeneralSettings | ✅ Feito | Sub-tab "Júri" com campos persistidos em app_config |
| Detecção Extra-Júri | ✅ Feito | Via `process_number.includes('TJPA-JUR')` ou `unit.includes('JÚRI')` |

---

## 🎯 PLANO DE EXTRAÇÃO — STATUS FINAL

### Fase 1: Componentes Faltantes ✅ CONCLUÍDA
1. ✅ `components/ui/JuriExceptionInlineAlert.tsx` — criado e adaptado
2. ✅ `components/accountability/JuriReviewPanel.tsx` — criado com schema do projeto ativo

### Fase 2: Integração SOSFU ✅ CONCLUÍDA
3. ✅ `JuriReviewPanel` integrado na aba ANALYSIS do `ProcessDetailView.tsx`
4. ✅ `JuriExceptionInlineAlert` integrado no `JurySolicitation.tsx` (Steps 1 e 2)

### Fase 3: Configurações ✅ CONCLUÍDA
5. ✅ Sub-aba "Júri" criada em `GeneralSettings.tsx`
6. ✅ Campos de limites e valores persistidos em `app_config` via Supabase

### Fase 4: Prestação de Contas ✅ CONCLUÍDA
7. ✅ `JuriExceptionInlineAlert` integrado no `AccountabilityWizard.tsx` — detecta PC com atraso > 30 dias e exibe alerta adaptado por role

