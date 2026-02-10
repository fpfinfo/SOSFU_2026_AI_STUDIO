export interface Analyst {
  id: string;
  name: string;
  role: 'FINANCE' | 'GOVERNANCE' | 'TAX_ANALYSIS';
  avatarUrl: string;
  processCount: number;
  capacityPercentage: number;
  slaAlerts?: {
    count: number;
    type: 'delayed' | 'warning';
  };
  status: 'active' | 'inactive';
}

export interface StatCardData {
  id: string;
  title: string;
  subtitle: string;
  count: number;
  details: string[];
  color: 'blue' | 'purple' | 'orange' | 'yellow';
  iconType: 'inbox' | 'file' | 'user' | 'shield';
}

export enum TabCategory {
  OPERATIONAL = 'OPERATIONAL',
  FINANCIAL = 'FINANCIAL',
  MANAGEMENT = 'MANAGEMENT'
}

// Status compartilhados entre todos os módulos
export type SharedStatus = 'PENDING' | 'WAITING_MANAGER' | 'WAITING_CORRECTION' | 'APPROVED' | 'REJECTED' | 'PAID' | 'ARCHIVED';

// Status específicos por módulo
export type SosfuStatus = 'WAITING_SOSFU_ANALYSIS' | 'WAITING_SOSFU_EXECUTION' | 'WAITING_SEFIN_SIGNATURE' | 'WAITING_SOSFU_PAYMENT' | 'WAITING_SUPRIDO_CONFIRMATION';
export type SodpaStatus = 'WAITING_SODPA_ANALYSIS' | 'WAITING_SODPA_EXECUTION' | 'WAITING_SODPA_APPROVAL' | 'WAITING_SODPA_PAYMENT';
export type RessarcimentoStatus = 'WAITING_RESSARCIMENTO_ANALYSIS' | 'WAITING_RESSARCIMENTO_EXECUTION' | 'WAITING_RESSARCIMENTO_APPROVAL' | 'WAITING_RESSARCIMENTO_PAYMENT';

export type SolicitationStatus = SharedStatus | SosfuStatus | SodpaStatus | RessarcimentoStatus;

export type SolicitationType = 'EMERGENCY' | 'JURY' | 'ORDINARY' | 'DIARIAS_PASSAGENS' | 'RESSARCIMENTO';

export interface Solicitation {
  id: string;
  process_number: string;
  type?: SolicitationType;
  beneficiary: string;
  unit: string;
  value: number;
  date: string;
  status: SolicitationStatus;
  manager_name?: string;
  manager_email?: string;
}

export interface AccountabilityItem {
    id: string;
    item_date: string;
    description: string;
    supplier: string;
    doc_number: string;
    element_code: string;
    value: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface Accountability {
  id: string;
  process_number: string; // Vem via join
  requester: string; // Vem via join
  value: number; // Valor concedido
  total_spent: number;
  balance: number;
  deadline: string;
  status: 'DRAFT' | 'WAITING_MANAGER' | 'WAITING_SOSFU' | 'APPROVED' | 'CORRECTION' | 'LATE';
  daysRemaining: number;
  items?: AccountabilityItem[];

}

export enum AppRole {
  ADMIN = 'ADMIN',
  GESTOR = 'GESTOR',
  USER = 'USER',
  
  // SOSFU
  SOSFU_GESTOR = 'SOSFU_GESTOR',
  SOSFU_EQUIPE = 'SOSFU_EQUIPE',
  
  // SEFIN
  SEFIN_GESTOR = 'SEFIN_GESTOR',
  SEFIN_EQUIPE = 'SEFIN_EQUIPE',

  // AJSEFIN
  AJSEFIN_GESTOR = 'AJSEFIN_GESTOR',
  AJSEFIN_EQUIPE = 'AJSEFIN_EQUIPE',

  // SGP
  SGP_GESTOR = 'SGP_GESTOR',
  SGP_EQUIPE = 'SGP_EQUIPE',

  // SODPA
  SODPA_GESTOR = 'SODPA_GESTOR',
  SODPA_EQUIPE = 'SODPA_EQUIPE',

  // SEAD
  SEAD_GESTOR = 'SEAD_GESTOR',
  SEAD_EQUIPE = 'SEAD_EQUIPE',

  // PRESIDENCIA
  PRESIDENCIA_GESTOR = 'PRESIDENCIA_GESTOR',
  PRESIDENCIA_EQUIPE = 'PRESIDENCIA_EQUIPE',

  // RESSARCIMENTO
  RESSARCIMENTO_GESTOR = 'RESSARCIMENTO_GESTOR',
  RESSARCIMENTO_EQUIPE = 'RESSARCIMENTO_EQUIPE'
}
