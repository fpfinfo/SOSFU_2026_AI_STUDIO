import { StatCardData, Solicitation, Accountability } from './types';

// Dados estáticos de configuração visual (mantidos)
export const DASHBOARD_STATS: StatCardData[] = [
  {
    id: '1',
    title: 'CAIXA DE ENTRADA',
    subtitle: 'NOVOS RECEBIDOS',
    count: 0, // Será atualizado via API
    details: ['Aguardando atualização'],
    color: 'blue',
    iconType: 'inbox'
  },
  {
    id: '2',
    title: 'MINHA MESA',
    subtitle: 'SOLICITAÇÕES',
    count: 0, // Será atualizado via API
    details: ['Concessões atribuídas a mim'],
    color: 'teal',
    iconType: 'file'
  },
  {
    id: '3',
    title: 'MINHA MESA',
    subtitle: 'PRESTAÇÕES DE CONTAS',
    count: 0, // Será atualizado via API
    details: ['PCs atribuídas a mim'],
    color: 'orange',
    iconType: 'user'
  },
  {
    id: '4',
    title: 'FLUXO SEFIN',
    subtitle: 'AGUARD. ASSINATURA',
    count: 0, // Será atualizado via API
    details: ['Aguardando'],
    color: 'yellow',
    iconType: 'shield'
  }
];

// Dados Mockados removidos para garantir uso do banco de dados real.
export const MOCK_SOLICITATIONS: Solicitation[] = [];
export const MOCK_ACCOUNTABILITY: Accountability[] = [];