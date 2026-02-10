# Task: Implementação do Módulo de Ressarcimento (Sentinela-First)

## 📋 Visão Geral
Criação do módulo de Ressarcimento, permitindo que usuários solicitem o reembolso de despesas realizadas com recursos próprios. O foco é uma experiência proativa no Portal do Usuário integrada ao rigor de conformidade da SEFIN.

## 🎯 Objetivos
- Criar fluxo de solicitação de ressarcimento no Portal do Usuário.
- Implementar o "Sentinela-First": validação de IA no momento do upload do comprovante.
- Desenvolver o Painel de Auditoria de Ressarcimento para a equipe da SEFIN/SOSFU.
- Garantir a integridade NE/DL/OB para pagamentos de reembolso.

## 🛠️ Plano de Implementação

### Fase 1: Fundação e Dados
- [ ] Adicionar `RESSARCIMENTO` aos enums de tipo de solicitação no frontend (`types.ts`).
- [ ] Verificar/Ajustar RLS para o perfil `RESSARCIMENTO_EQUIPE` no banco de dados.

### Fase 2: Portal do Usuário (Entrada de Dados)
- [ ] Criar `RessarcimentoSolicitation.tsx`:
    - Interface simplificada para anexar comprovantes.
    - Gatilho automático do Sentinela IA para cada anexo.
    - Bloqueio de submissão se a IA detectar erros críticos (ex: Data fora do prazo).
- [ ] Adicionar botão de atalho no `SupridoDashboard.tsx`.

### Fase 3: Workstation de Auditoria (SEFIN)
- [ ] Criar `RessarcimentoAuditPanel.tsx`:
    - Herdar a lógica de Glosa individual do SODPA.
    - Visualização clara de "Gasto Próprio" vs "Limite Permitido".
- [ ] Integrar no `ProcessDetailView.tsx`.

### Fase 4: Sentinela IA (Ressarcimento)
- [ ] Desenvolver prompt específico para Ressarcimento:
    - Checar se a NF está em nome do servidor (importante para reembolso).
    - Validar se a despesa é indenizável pelo TJPA.

### Fase 5: Finalização e Pagamento
- [ ] Implementar fluxo de "Aprovado para Pagamento".
- [ ] Gerar metadados para emissão de OB de ressarcimento.

---
**Status:** 🏗️ Iniciando Fase 1
**Responsável:** @frontend-specialist & @backend-specialist
