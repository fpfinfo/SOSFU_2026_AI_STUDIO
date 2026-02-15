
// Enumerações para melhor type-safety
export type AppTab = 'inicio' | 'solicitacoes' | 'criar' | 'despesas' | 'mais' | 'formularios' | 'gestao_inbox' | 'gestao_config' | 'gestao_contas';
export type AppModule = 'usuarios' | 'suprimento' | 'diarias' | 'reembolsos' | 'contas' | 'sefin' | 'ajsefin' | 'sgp' | 'coorc' | 'sead' | 'presidencia';
export type RequestType = 'suprimento' | 'diaria' | 'reembolso' | 'passagem' | 'extra-emergencial' | 'extra-juri'; 
export type RequestStatus = 'Pendente' | 'Aprovado' | 'Rejeitado' | 'Em Analise' | 'Em Ajuste' | 'Parecer Juridico' | 'Orcamento' | 'Assinatura Ordenador' | 'Assinatura Gestor' | 'Autorizado' | 'Execucao' | 'Pago' | 'Aguardando Prestacao' | 'Concluido';
export type ExpenseStatus = 'Pendente' | 'Aprovado' | 'Rejeitado';

export interface Expense {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  category: string;
  status: ExpenseStatus;
}

export interface SystemRole {
  id: string;
  name: string;
  description: string;
  icon: string;
  colorClass: string;
}

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  cpf: string;
  registrationNumber: string;
  role: string;
  systemRole: string; 
  employmentType: string;
  phone: string;
  unit: string;
  city: string;
  managerName: string;
  managerEmail: string;
  bankName: string;
  bankCode: string;
  bankAgency: string;
  bankAccount: string;
  avatarUrl: string | null;
  signatureUrl: string | null; // Novo campo para assinatura eletrônica
  isTeamMember: boolean;
  teamRole: string | null;
}

export interface RequestItem {
  id: string;
  userId: string;
  title: string;
  type: RequestType;
  totalValue: number;
  status: RequestStatus;
  createdAt: string;
  justification?: string;
  destination?: string;
  items?: any[];
  manager_name?: string;
  manager_email?: string;
  managerInfo?: {
    id: string;
    name: string;
    email: string;
  };
  userProfile?: Partial<Profile>;
  managerProfile?: Partial<Profile>; // Perfil do gestor que assinou
  // Fix: Adding missing signature properties for RequestItem in camelCase to match data service mapping
  signedByManagerAt?: string;
  signedByManagerId?: string;
  signedByManagerLatitude?: number;
  signedByManagerLongitude?: number;
  budgetInfo?: {
    actionCode: string;
    allocation: string;
  };
  legalAnalysis?: string;
  nup?: string;
  dossier?: any[];
  signedByOrdenadorAt?: string;
  signedByOrdenadorId?: string;
  signedByOrdenadorLatitude?: number;
  signedByOrdenadorLongitude?: number;
  assignedToId?: string;
  assignedToName?: string;
  originModule?: string;
  ordenadorNotes?: string;
  startDate?: string;
  endDate?: string;
}

export interface AccountabilityReport {
  id: string;
  requestId: string;
  userId: string;
  userProfile?: Partial<Profile>;
  requestTitle: string;
  totalSpent: number;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado' | 'Em Ajuste';
  submittedAt: string;
  items: any[];
  notes?: string;
  aiAnalysis?: {
    score: number;
    summary: string;
    flags: string[];
  };
}

export interface ExpenseElement {
  id: string;
  code: string;
  description: string;
  module: string;
  status: string;
  createdAt: string;
}

export interface ManagementSettings {
  module: string;
  expense_limit: number;
  expense_limit_extra: number;
  submission_deadline_days: number;
  audit_auto_approve_score: number;
  food_lunch: number;
  food_dinner: number;
  food_snack: number;
  jury_servers: number;
  jury_defenders: number;
  jury_prosecutors: number;
  jury_police: number;
  maintenance_mode: boolean;
  banner_images?: string[]; 
  updated_at?: string;
}

export interface Comarca {
  id: number;
  name: string;
  entrancia: string;
  polo?: string;
  region?: string;
  bank_account?: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
}

export interface AdministrativeUnit {
  id: number;
  acronym: string;
  name: string;
  type: string;
  affiliation?: string;
  responsible_name?: string;
  responsible_avatar?: string;
  registration_info?: string;
  latitude?: number;
  longitude?: number;
  status: string;
  created_at?: string;
}

export interface DailyAllowanceRate {
  id: number;
  cargo_funcao: string;
  tipo_viagem: string;
  valor: number;
  created_at?: string;
}

export interface HistoryItem {
  id: string;
  requestId: string;
  userId: string;
  action: string;
  description: string;
  metadata: any;
  createdAt: string;
  latitude?: number;
  longitude?: number;
  userProfile?: {
    fullName: string;
    avatarUrl: string | null;
  };
}
export interface SystemNotification {
  id: string;
  user_id?: string | null;
  role_target?: string | null;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  category: 'SYSTEM' | 'PROCESS' | 'MESSAGE';
  title: string;
  message: string;
  link_action?: string;
  is_read: boolean;
  created_at: string;
}
