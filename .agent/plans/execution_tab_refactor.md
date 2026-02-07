# 🏗️ Plano de Refatoração: Aba Execução + Módulo SEFIN

## Contexto
A aba **Execução** do processo precisa gerar 5 minutas de documentos financeiros. Após geração, 3 são tramitadas para assinatura do Ordenador de Despesa (SEFIN), e 2 são assinadas pelo analista SOSFU que os gerou.

---

## 📋 FASE 1 — Novo Wizard de Execução (ExpenseExecutionWizard)

### Documentos a Gerar (6 steps)

| Step | Documento | Quem Assina | Modelo Referência |
|------|-----------|-------------|-------------------|
| 1 | **Portaria SF** | Ordenador SEFIN | `generatePortariaContent()` |
| 2 | **Certidão de Regularidade** | Ordenador SEFIN | `generateCertidaoContent()` |
| 3 | **Nota de Empenho (NE)** | Ordenador SEFIN | Upload PDF SIAFE + valor |
| 4 | **Doc. de Liquidação (DL)** | Analista SOSFU (auto-sign) | Upload PDF SIAFE + valor |
| 5 | **Ordem Bancária (OB)** | Analista SOSFU (auto-sign) | Upload PDF SIAFE + valor |
| 6 | **Tramitar** | — | Envia Portaria+Certidão+NE → SEFIN |

### Arquitetura
- **Componente:** `components/execution/ExpenseExecutionWizard.tsx` (novo)
- **Baseado em:** `sosfu2026_ref/components/Execution/ExpenseExecutionWizard.tsx`
- **Adaptações:**
  - Usar `supabase` do projeto atual (`../../lib/supabase`)
  - Tabelas: `solicitations`, `process_documents`, `historico_tramitacao`
  - Sem `useBudgetAllocations` (simplificar com campos manuais por enquanto)
  - Sem `useToast` (usar `alert()` ou criar simple toast)
  - Steps 4 e 5 (DL, OB): auto-assinados pelo SOSFU no momento da geração
  - Step 6 (Tramitar): cria `sefin_signing_tasks` para Portaria, Certidão e NE

### Fluxo de Dados
```
[SOSFU gera docs] → [process_documents com status MINUTA]
    ├─ Portaria SF      → status: MINUTA → tramitar → SEFIN assina
    ├─ Certidão         → status: MINUTA → tramitar → SEFIN assina  
    ├─ Nota de Empenho  → status: MINUTA → tramitar → SEFIN assina
    ├─ Doc. Liquidação  → status: SIGNED (auto, SOSFU assina)
    └─ Ordem Bancária   → status: SIGNED (auto, SOSFU assina)
```

### Campos por Step

**Step 1 - Portaria SF:**
- PTRES (input text)
- Dotação Orçamentária (input text, múltiplas separadas por ;)
- Preview do Art. 1º
- Botão: "Minutar Portaria SF"

**Step 2 - Certidão de Regularidade:**
- Verificação automática de regularidade do suprido
- Status: REGULAR / IRREGULAR
- Botão: "Emitir Certidão"

**Step 3 - Nota de Empenho:**
- Upload PDF do SIAFE
- Campo valor NE (R$) — Triple Check
- Botão: "Registrar NE"

**Step 4 - Doc. Liquidação:**
- Upload PDF do SIAFE
- Campo valor DL (R$) — Triple Check  
- Auto-assinado pelo SOSFU
- Botão: "Registrar e Assinar DL"

**Step 5 - Ordem Bancária:**
- Upload PDF do SIAFE
- Campo valor OB (R$) — Triple Check
- Auto-assinado pelo SOSFU
- Botão: "Registrar e Assinar OB"

**Step 6 - Tramitar:**
- Resumo de todos os documentos gerados
- Validação: Portaria + Certidão + NE obrigatórios
- Triple Check: NE ≥ DL ≥ OB (validação de valores)
- Botão: "Tramitar para Ordenador de Despesa"

---

## 📋 FASE 2 — Integração na ExecutionTab

### O que muda
- A `ExecutionTab` atual (linhas 711-772 do ProcessDetailView.tsx) será **substituída**
- Nova versão mostra:
  - Cards com status de cada documento (gerado/pendente)
  - Botão "Iniciar Execução da Despesa" abre o Wizard
  - Resumo financeiro (NE, DL, OB valores + Triple Check)

### Visibilidade por Role
- **SOSFU/ADMIN**: Pode gerar docs e tramitar
- **SEFIN**: Visualiza docs, assina minutas
- **USER/GESTOR**: Apenas visualização (read-only)

---

## 📋 FASE 3 — Módulo SEFIN (Receber Minutas)

### Tabela `sefin_signing_tasks` (migration)
```sql
CREATE TABLE IF NOT EXISTS sefin_signing_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitation_id UUID REFERENCES solicitations(id),
  document_type TEXT NOT NULL,  -- PORTARIA_SF, CERTIDAO, NOTA_EMPENHO
  title TEXT NOT NULL,
  origin TEXT DEFAULT 'SOSFU',
  value NUMERIC(15,2) DEFAULT 0,
  status TEXT DEFAULT 'PENDING', -- PENDING, SIGNED, REJECTED
  signed_by UUID REFERENCES auth.users(id),
  signed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### SefinDashboard Refatoração
- Adicionar seção "Minutas Pendentes de Assinatura"
- Listar tasks com status PENDING
- Botão "Assinar" → Modal de confirmação
- Botão "Devolver" → Textarea motivo + status REJECTED
- Após assinatura: `process_documents.status = 'SIGNED'`
- Após todas 3 assinadas: `solicitations.status = 'WAITING_SOSFU_PAYMENT'`

---

## 📋 FASE 4 — Migrations e Storage

### Migration 1: `sefin_signing_tasks`
- Criar tabela
- RLS policies (SEFIN, SOSFU, ADMIN)

### Migration 2: Campos extras em `solicitations`
- `ptres_code TEXT`
- `dotacao_code TEXT`
- `portaria_sf_numero TEXT`
- `ne_numero TEXT`, `ne_valor NUMERIC`
- `dl_numero TEXT`, `dl_valor NUMERIC`
- `ob_numero TEXT`, `ob_valor NUMERIC`
- `execution_started_at TIMESTAMPTZ`

### Storage
- Bucket `execution-docs` para PDFs do SIAFE

---

## 🎯 Ordem de Execução

1. ✅ Criar migration (`sefin_signing_tasks` + campos `solicitations`)
2. ✅ Criar `ExpenseExecutionWizard.tsx`
3. ✅ Substituir `ExecutionTab` no ProcessDetailView
4. ✅ Refatorar SefinDashboard para minutas
5. ✅ Testar fluxo completo

## ⏱️ Estimativa
- Fase 1+2: ~45 min (componente principal)
- Fase 3: ~20 min (SEFIN)
- Fase 4: ~10 min (migrations)
- Total: ~1h15

---

**Prioridade: Funcionalidade > Perfeição. Ship fast, iterate later.**
