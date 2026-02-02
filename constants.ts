import { Analyst, StatCardData, Solicitation, Accountability } from './types';

export const CURRENT_USER = {
  name: 'FABIO PEREIRA DE FREITAS',
  matricula: '203424',
  avatar: 'https://picsum.photos/id/1005/64/64'
};

export const DASHBOARD_STATS: StatCardData[] = [
  {
    id: '1',
    title: 'CAIXA DE ENTRADA',
    subtitle: 'NOVOS RECEBIDOS',
    count: 14,
    details: ['3 Sol.', '11 PC'],
    color: 'blue',
    iconType: 'inbox'
  },
  {
    id: '2',
    title: 'MINHA MESA',
    subtitle: 'SOLICITAÇÕES',
    count: 4,
    details: ['Concessões atribuídas a mim'],
    color: 'purple',
    iconType: 'file'
  },
  {
    id: '3',
    title: 'MINHA MESA',
    subtitle: 'PRESTAÇÕES DE CONTAS',
    count: 5,
    details: ['PCs atribuídas a mim'],
    color: 'orange',
    iconType: 'user'
  },
  {
    id: '4',
    title: 'FLUXO SEFIN',
    subtitle: 'AGUARD. ASSINATURA',
    count: 0,
    details: ['0 Aguardando', '0 Assinados'],
    color: 'yellow',
    iconType: 'shield'
  }
];

export const TEAM_MEMBERS: Analyst[] = [
  {
    id: '1',
    name: 'ANDRE EVARISTO BEZERRA LOURENCO',
    role: 'FINANCE',
    avatarUrl: 'https://picsum.photos/id/338/64/64',
    processCount: 0,
    capacityPercentage: 0,
    status: 'active'
  },
  {
    id: '2',
    name: 'FABIO PEREIRA DE FREITAS',
    role: 'GOVERNANCE',
    avatarUrl: 'https://picsum.photos/id/1005/64/64',
    processCount: 11,
    capacityPercentage: 110,
    slaAlerts: {
      count: 2,
      type: 'delayed'
    },
    status: 'active'
  },
  {
    id: '3',
    name: 'JAIRES COSTA SARRAF',
    role: 'TAX_ANALYSIS',
    avatarUrl: 'https://picsum.photos/id/64/64',
    processCount: 0,
    capacityPercentage: 0,
    status: 'active'
  },
  {
    id: '4',
    name: 'NELSON SILVA ARAUJO',
    role: 'FINANCE',
    avatarUrl: 'https://picsum.photos/id/91/64/64',
    processCount: 0,
    capacityPercentage: 0,
    status: 'active'
  },
  {
    id: '5',
    name: 'REGEANE KELLY HOLANDA DO CARMO',
    role: 'GOVERNANCE',
    avatarUrl: 'https://picsum.photos/id/55/64/64',
    processCount: 0,
    capacityPercentage: 0,
    status: 'active'
  }
];

export const MOCK_SOLICITATIONS: Solicitation[] = [
  { id: '1', processNumber: 'SF-2024/001', beneficiary: 'COMARCA DE BELÉM', unit: 'VARA ÚNICA', value: 2000.00, date: '2024-02-10', status: 'PENDING' },
  { id: '2', processNumber: 'SF-2024/045', beneficiary: 'COMARCA DE SANTARÉM', unit: 'DIRETORIA', value: 4500.50, date: '2024-02-12', status: 'APPROVED' },
  { id: '3', processNumber: 'SF-2024/089', beneficiary: 'COMARCA DE MARABÁ', unit: 'ADM', value: 1200.00, date: '2024-02-14', status: 'PAID' },
  { id: '4', processNumber: 'SF-2024/102', beneficiary: 'GABINETE DES. JOÃO', unit: 'GABINETE', value: 800.00, date: '2024-02-15', status: 'PENDING' },
];

export const MOCK_ACCOUNTABILITY: Accountability[] = [
  { id: '1', processNumber: 'PC-2023/998', requester: 'JOÃO SILVA', value: 2000.00, deadline: '2024-02-20', status: 'ANALYSIS', daysRemaining: 5 },
  { id: '2', processNumber: 'PC-2024/005', requester: 'MARIA OLIVEIRA', value: 500.00, deadline: '2024-02-10', status: 'LATE', daysRemaining: -5 },
  { id: '3', processNumber: 'PC-2024/012', requester: 'PEDRO SANTOS', value: 1200.00, deadline: '2024-03-01', status: 'APPROVED', daysRemaining: 14 },
  { id: '4', processNumber: 'PC-2024/033', requester: 'ANA COSTA', value: 300.00, deadline: '2024-02-28', status: 'CORRECTION', daysRemaining: 13 },
];