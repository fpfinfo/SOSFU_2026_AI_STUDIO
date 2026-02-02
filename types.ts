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
  processNumber: string;
  type?: 'EMERGENCY' | 'JURY' | 'ORDINARY'; // Novo campo
  beneficiary: string;
  unit: string;
  value: number;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
}

export interface Accountability {
  id: string;
  processNumber: string;
  requester: string;
  value: number;
  deadline: string;
  status: 'ANALYSIS' | 'APPROVED' | 'CORRECTION' | 'LATE';
  daysRemaining: number;
}