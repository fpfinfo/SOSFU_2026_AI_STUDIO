# Task: Implementação do Portal do Usuário "Active Timeline Cockpit"

## 📋 Visão Geral
Transformação do Dashboard do Suprido/Usuário em uma interface baseada em linha do tempo cronológica e cartões de ação contextuais, eliminando a distinção visual rígida entre Solicitação e Prestação de Contas.

## 🎯 Objetivos
- Unificar o fluxo de Solicitação -> Recebimento -> Prestação de Contas.
- Implementar o componente `ActiveProcessCard` com estados contextuais.
- Integrar notificações proativas do "Sentinela IA" no dashboard.
- Melhorar a visibilidade de prazos (SLA) através de indicadores visuais de urgência.

## 🛠️ Plano de Implementação

### Fase 1: Refatoração da Estrutura de Dados
- [ ] Atualizar o hook `fetchDashboardData` em `SupridoDashboard.tsx` para incluir metadados do Sentinela IA.
- [ ] Criar interface `TimelineProcess` para padronizar os estados do processo.

### Fase 2: Componentes de UI (Active Timeline)
- [ ] Criar `TimelineCard.tsx` em `components/suprido/`:
    - Header com NUP e Tipo.
    - Barra de progresso visual (Solicitado -> Pago -> Prestado -> Homologado).
    - Área de "Ações Recomendadas" (botão dinâmico baseado no status).
- [ ] Implementar `SentinelaNudge.tsx`: Um pequeno banner de alerta IA que aparece dentro do card se houver pendências (ex: "Nota Fiscal ilegível detectada").

### Fase 3: Lógica Contextual
- [ ] Mapear status do banco para ações da Timeline:
    - `WAITING_SUPRIDO_CONFIRMATION` -> Botão: "Confirmar Recebimento 💰"
    - `PAID` + PC pendente -> Botão: "Lançar Despesas 🧾"
    - `PENDENCIA` -> Botão: "Corrigir Prestação ⚠️"
- [ ] Adicionar transição suave de estados após ações de sucesso.

### Fase 4: Polimento e UX
- [ ] Integrar `framer-motion` para animações nas passagens de estado dos cards.
- [ ] Adicionar modo "Deep Focus" para processos urgentes (SLA < 48h).
- [ ] Validar responsividade mobile (UX móvel é crítica para envio de fotos de recibos).

## ✅ Critérios de Aceitação
- [ ] O dashboard deve mostrar os processos ativos no topo.
- [ ] O usuário deve conseguir realizar o ciclo completo sem sair da página principal de visualização do card.
- [ ] Os alertas da IA devem ser visíveis e claros.
- [ ] O design deve seguir os novos padrões institucionais SOSFU (Dark mode-ready, glassmorphism).

---
**Status:** 🏗️ Aguardando Início da Fase 1
**Responsável:** @orchestrator
