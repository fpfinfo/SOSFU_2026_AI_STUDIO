---
title: Modernização do Dashboard SOSFU (Opção C)
status: planning
priority: high
agent: orchestrator
tags: [SOSFU, UI/UX, Dashboards]
---

# 🎯 Objetivo
Transformar o `SosfuInbox.tsx` em um cockpit de gestão premium com abas contextuais e métricas dinâmicas para o Diretor de Finanças do TJPA.

## 📋 Requisitos Visuais
- [ ] Implementar Grid de 4 Cards com design Glassmorphism.
- [ ] Suporte a Barra de Progresso nos cards (ex: Prestações).
- [ ] Badge de "Ação Necessária" nos cards quando houver itens críticos.
- [ ] Tabela com avatares dos solicitantes e coluna de Prazo (SLA).

## 🗂 Estrutura de Abas & Cards
| Aba | Card 1 | Card 2 | Card 3 | Card 4 |
| :--- | :--- | :--- | :--- | :--- |
| **Inbox** | Novas Solicitações | Triagem Pendente | SLA Crítico | Meta Mensal |
| **Em Análise** | Minha Fila | Em Execução | Retorno SEFIN | Produtividade |
| **Prestações** | PCs Pendentes | Em Validação | Atrasos (Glosas) | Total Regularizado |
| **Histórico** | Total Arquivado | Volume Financeiro | Lead Time | Eficiência |

## 🚀 Plano de Implementação

### Fase 1: Componentes Base
- [ ] Criar `/components/sosfu/SosfuStatCard.tsx`.
- [ ] Criar `/components/sosfu/SosfuHeader.tsx` (Tabs + Filtros + Exportar).

### Fase 2: Lógica de Dados
- [ ] Criar `/hooks/useSosfuStats.ts` para calcular métricas baseadas na aba ativa.
- [ ] Atualizar tipos em `types.ts` se necessário.

### Fase 3: Assembleia (Workstation)
- [ ] Refatorar `SosfuInbox.tsx` para integrar os novos componentes.
- [ ] Atualizar lógica de filtragem para suportar as 4 novas abas.

### Fase 4: Polish & Dark Mode
- [ ] Garantir suporte total ao Dark Mode.
- [ ] Adicionar micro-animações nas transições de abas.

## 🧪 Critérios de Aceite
1. Os cards mudam de título e valor ao trocar de aba.
2. A barra de progresso no card de Prestações reflete o volume de validação concluída.
3. A tabela exibe o avatar do solicitante e o status do prazo (Atrasado/Restam X dias).
4. O botão "Exportar Dados" está posicionado conforme a referência visual.
