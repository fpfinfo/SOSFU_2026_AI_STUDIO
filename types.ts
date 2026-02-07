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

export interface Solicitation {
  id: string;
  process_number: string;
  type?: 'EMERGENCY' | 'JURY' | 'ORDINARY';
  beneficiary: string;
  unit: string;
  value: number;
  date: string;
  status: 'PENDING' | 'WAITING_MANAGER' | 'WAITING_SOSFU_ANALYSIS' | 'WAITING_SEFIN_SIGNATURE' | 'WAITING_SOSFU_PAYMENT' | 'WAITING_SUPRIDO_CONFIRMATION' | 'WAITING_CORRECTION' | 'APPROVED' | 'REJECTED' | 'PAID' | 'ARCHIVED';
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