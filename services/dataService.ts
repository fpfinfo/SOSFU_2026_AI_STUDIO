
import { supabase } from './supabaseClient';
import { Expense, Profile, ExpenseElement, SystemRole, AccountabilityReport, RequestItem, ManagementSettings, Comarca, AdministrativeUnit, DailyAllowanceRate, HistoryItem, SystemNotification, AppModule } from '../types';

export const getManagementSettings = async (module: string): Promise<ManagementSettings> => {
  const { data, error } = await supabase
    .from('management_settings')
    .select('*')
    .eq('module', module)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  
  if (!data) {
    return {
      module,
      expense_limit: 5000,
      expense_limit_extra: 15000,
      submission_deadline_days: 5,
      audit_auto_approve_score: 85,
      food_lunch: 30,
      food_dinner: 30,
      food_snack: 11,
      jury_servers: 7,
      jury_defenders: 2,
      jury_prosecutors: 2,
      jury_police: 5,
      maintenance_mode: false
    };
  }

  return {
    module: data.module,
    expense_limit: Number(data.expense_limit),
    expense_limit_extra: Number(data.expense_limit_extra || 15000),
    submission_deadline_days: data.submission_deadline_days,
    audit_auto_approve_score: data.audit_auto_approve_score,
    food_lunch: Number(data.food_lunch || 30),
    food_dinner: Number(data.food_dinner || 30),
    food_snack: Number(data.food_snack || 11),
    jury_servers: data.jury_servers || 7,
    jury_defenders: data.jury_defenders || 2,
    jury_prosecutors: data.jury_prosecutors || 2,
    jury_police: data.jury_police || 5,
    maintenance_mode: !!data.maintenance_mode,
    updated_at: data.updated_at
  };
};

export const saveManagementSettings = async (settings: Partial<ManagementSettings>) => {
  const { data, error } = await supabase
    .from('management_settings')
    .upsert({
      ...settings,
      updated_at: new Date()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getAccountabilityReports = async (): Promise<AccountabilityReport[]> => {
  try {
    const { data, error } = await supabase
      .from('accountability_reports')
      .select('*, profiles(full_name, avatar_url, registration_number)')
      .order('created_at', { ascending: false });
      
    if (error || !data) {
       return [] as AccountabilityReport[];
    }
    
    return data.map(raw => ({
      id: raw.id,
      requestId: raw.request_id,
      userId: raw.user_id,
      userProfile: {
        fullName: raw.profiles?.full_name,
        avatarUrl: raw.profiles?.avatar_url,
        registrationNumber: raw.profiles?.registration_number
      },
      requestTitle: raw.request_title || 'Prestação de Contas',
      totalSpent: raw.total_spent,
      status: raw.status,
      submittedAt: raw.created_at,
      items: raw.items || [],
      notes: raw.notes,
      aiAnalysis: raw.ai_analysis
    }));
  } catch (e) {
    return [] as AccountabilityReport[];
  }
};

export const updateAccountabilityStatus = async (id: string, status: string, notes?: string) => {
  const { data, error } = await supabase
    .from('accountability_reports')
    .update({ status, notes, updated_at: new Date() })
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const updateRequestStatus = async (requestId: string, status: string, notes?: string) => {
  const { data, error } = await supabase
    .from('requests')
    .update({ 
      status, 
      notes, 
      updated_at: new Date() 
    })
    .eq('id', requestId)
    .select()
    .single();
    
  // Registrar em auditoria
  await logAuditEvent(requestId, 'STATUS_CHANGE', `Status alterado para ${status}.`, { notes });

  // Notificar o solicitante
  await sendNotification({
    user_id: data.user_id,
    type: status === 'Rejeitado' || status === 'Em Ajuste' ? 'WARNING' : 'SUCCESS',
    category: 'PROCESS',
    title: `Atualização de Status: ${status}`,
    message: `Sua solicitação "${data.title}" foi movida para o status ${status}.`,
    link_action: `/solicitacoes/${requestId}`
  });

  return data;
};

export const getExpenses = async () => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

export const saveExpense = async (expense: Partial<Expense>) => {
  const { data, error } = await supabase
    .from('expenses')
    .upsert(expense)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const deleteExpense = async (id: string) => {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

export const getRequests = async (userId?: string): Promise<RequestItem[]> => {
  try {
    let query = supabase
      .from('requests')
      .select('*, profiles:user_id(full_name, avatar_url, role, registration_number, unit, cpf, bank_name, bank_code, bank_agency, bank_account)');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(req => ({
      id: req.id,
      userId: req.user_id,
      title: req.title,
      type: req.type,
      totalValue: req.total_value,
      status: req.status,
      createdAt: req.created_at,
      justification: req.justification,
      destination: req.destination,
      items: req.items,
      managerInfo: req.manager_info,
      userProfile: {
        fullName: req.profiles?.full_name,
        avatarUrl: req.profiles?.avatar_url,
        role: req.profiles?.role,
        registrationNumber: req.profiles?.registration_number,
        unit: req.profiles?.unit,
        cpf: req.profiles?.cpf,
        bankName: req.profiles?.bank_name,
        bankCode: req.profiles?.bank_code,
        bankAgency: req.profiles?.bank_agency,
        bankAccount: req.profiles?.bank_account
      },
      // Fix: Adding signature fields
      signedByManagerAt: req.signed_by_manager_at,
      signedByManagerId: req.signed_by_manager_id,
      signedByManagerLatitude: req.signed_by_manager_latitude,
      signedByManagerLongitude: req.signed_by_manager_longitude,
      nup: req.nup,
      dossier: req.dossier,
      assignedToId: req.assigned_to_id,
      assignedToName: req.assigned_to_name,
      signedByOrdenadorAt: req.signed_by_ordenador_at,
      signedByOrdenadorId: req.signed_by_ordenador_id,
      signedByOrdenadorLatitude: req.signed_by_ordenador_latitude,
      signedByOrdenadorLongitude: req.signed_by_ordenador_longitude,
      originModule: req.origin_module,
      ordenadorNotes: req.ordenador_notes,
      startDate: req.start_date,
      endDate: req.end_date
    }));
  } catch (e) {
    console.error("Erro no getRequests:", e);
    return [] as RequestItem[];
  }
};

export const saveRequest = async (request: any) => {
  const { data, error } = await supabase
    .from('requests')
    .insert(request)
    .select()
    .single();
    
  // Auditoria automática de criação
  await logAuditEvent(data.id, 'CREATE', 'Solicitação protocolada no sistema.', {
    nup: data.nup,
    type: data.type
  });

  // Notificar o gestor (se houver e-mail)
  if (data.manager_email) {
    // Busca o perfil do gestor pelo e-mail (opcional, ou notifica por broadcast de role se preferir)
    // Aqui vamos apenas disparar para o dono do processo como confirmação e deixar broadcast para o gestor
    await sendNotification({
      user_id: data.user_id,
      type: 'INFO',
      category: 'PROCESS',
      title: 'Solicitação Protocolada',
      message: `Sua solicitação "${data.title}" foi enviada com sucesso (NUP: ${data.nup}).`,
      link_action: `/solicitacoes/${data.id}`
    });
  }

  return data;
};

export const updateRequest = async (requestId: string, request: any, previousNotes?: string) => {
  const { data, error } = await supabase
    .from('requests')
    .update({
      ...request,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .select()
    .single();
    
  if (error) throw error;

  // Auditoria automática de atualização focada em reanálise
  const auditMessage = previousNotes 
    ? `Solicitação reapresentada após ajustes. Parecer anterior SOSFU: "${previousNotes}"`
    : 'Solicitação atualizada pelo usuário.';

  await logAuditEvent(requestId, 'UPDATE', auditMessage, {
    nup: data.nup,
    status: data.status,
    isReanalysis: !!previousNotes
  });

  return data;
};

export const logAuditEvent = async (requestId: string, action: string, description: string, metadata: any = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('system_history').insert({
      request_id: requestId,
      user_id: user.id,
      action: action,
      description: description,
      metadata: metadata,
      latitude: metadata.latitude,
      longitude: metadata.longitude
    });
  } catch (e) {
    console.error("Erro ao registrar auditoria:", e);
  }
};

export const getRequestHistory = async (requestId: string): Promise<HistoryItem[]> => {
  const { data, error } = await supabase
    .from('system_history')
    .select('*, profiles:user_id(full_name, avatar_url)')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || []).map(item => ({
    id: item.id,
    requestId: item.request_id,
    userId: item.user_id,
    action: item.action,
    description: item.description,
    metadata: item.metadata,
    createdAt: item.created_at,
    latitude: item.latitude,
    longitude: item.longitude,
    userProfile: {
      fullName: item.profiles?.full_name,
      avatarUrl: item.profiles?.avatar_url
    }
  }));
};


export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    cpf: data.cpf,
    registrationNumber: data.registration_number,
    role: data.role,
    systemRole: data.system_role,
    employmentType: data.employment_type,
    phone: data.phone,
    unit: data.unit,
    city: data.city,
    managerName: data.manager_name,
    managerEmail: data.manager_email,
    bankName: data.bank_name,
    bankCode: data.bank_code,
    bankAgency: data.bank_agency,
    bankAccount: data.bank_account,
    avatarUrl: data.avatar_url,
    signatureUrl: data.signature_url, // Mapeamento do campo de assinatura
    isTeamMember: data.is_team_member,
    teamRole: data.team_role
  } as Profile;
};

export const getAllProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true });
    
  if (error || !data) {
    return [] as Profile[];
  }

  return data.map(d => ({
    id: d.id,
    fullName: d.full_name,
    email: d.email,
    systemRole: d.system_role,
    avatarUrl: d.avatar_url,
    signatureUrl: d.signature_url,
    cpf: d.cpf,
    registrationNumber: d.registration_number,
    role: d.role,
    employmentType: d.employment_type,
    phone: d.phone,
    unit: d.unit,
    city: d.city,
    managerName: d.manager_name,
    managerEmail: d.manager_email,
    bankName: d.bank_name,
    bankCode: d.bank_code,
    bankAgency: d.bank_agency,
    bankAccount: d.bank_account
  })) as Profile[];
};

export const updateProfile = async (profile: Partial<Profile>) => {
  if (!profile.id) throw new Error("ID do perfil é necessário para atualização.");

  const dbPayload: any = { 
    updated_at: new Date().toISOString()
  };
  
  if (profile.fullName !== undefined) dbPayload.full_name = profile.fullName;
  if (profile.avatarUrl !== undefined) dbPayload.avatar_url = profile.avatarUrl;
  if (profile.signatureUrl !== undefined) dbPayload.signature_url = profile.signatureUrl; // Atualiza assinatura
  if (profile.registrationNumber !== undefined) dbPayload.registration_number = profile.registrationNumber;
  if (profile.systemRole !== undefined) dbPayload.system_role = profile.systemRole;
  if (profile.cpf !== undefined) dbPayload.cpf = profile.cpf;
  if (profile.role !== undefined) dbPayload.role = profile.role;
  if (profile.employmentType !== undefined) dbPayload.employment_type = profile.employmentType;
  if (profile.phone !== undefined) dbPayload.phone = profile.phone;
  if (profile.unit !== undefined) dbPayload.unit = profile.unit;
  if (profile.city !== undefined) dbPayload.city = profile.city;
  if (profile.managerName !== undefined) dbPayload.manager_name = profile.managerName;
  if (profile.managerEmail !== undefined) dbPayload.manager_email = profile.managerEmail;
  if (profile.bankName !== undefined) dbPayload.bank_name = profile.bankName;
  if (profile.bankCode !== undefined) dbPayload.bank_code = profile.bankCode;
  if (profile.bankAgency !== undefined) dbPayload.bank_agency = profile.bankAgency;
  if (profile.bankAccount !== undefined) dbPayload.bank_account = profile.bankAccount;

  const { data, error } = await supabase
    .from('profiles')
    .update(dbPayload)
    .eq('id', profile.id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const uploadAvatar = async (userId: string, file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `public/avatars/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return publicUrl;
};

export const getExpenseElements = async (): Promise<ExpenseElement[]> => {
  const { data, error } = await supabase
    .from('expense_elements')
    .select('*')
    .order('code', { ascending: true });
  if (error) throw error;
  return (data || []);
};

export const saveExpenseElement = async (element: Partial<ExpenseElement>) => {
  const { data, error } = await supabase
    .from('expense_elements')
    .upsert(element)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteExpenseElement = async (id: string) => {
  const { error } = await supabase
    .from('expense_elements')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const getSystemRoles = async (): Promise<SystemRole[]> => {
  const { data, error } = await supabase
    .from('system_roles')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    icon: r.icon,
    colorClass: r.color_class
  }));
};

// Função getRequests removida desta posição para evitar duplicidade

export const getComarcas = async (): Promise<Comarca[]> => {
  const { data, error } = await supabase
    .from('comarcas')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const saveComarca = async (comarca: Partial<Comarca>) => {
  const { data, error } = await supabase
    .from('comarcas')
    .upsert(comarca)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteComarca = async (id: number) => {
  const { error } = await supabase
    .from('comarcas')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const getDailyAllowanceRates = async (): Promise<DailyAllowanceRate[]> => {
  const { data, error } = await supabase
    .from('daily_allowance_rates')
    .select('*')
    .order('cargo_funcao');

  if (error) throw error;
  return data || [];
};

export const saveDailyAllowanceRate = async (rate: Partial<DailyAllowanceRate>) => {
  const { data, error } = await supabase
    .from('daily_allowance_rates')
    .upsert([rate])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteDailyAllowanceRate = async (id: number) => {
  const { error } = await supabase
    .from('daily_allowance_rates')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const getAdministrativeUnits = async (): Promise<AdministrativeUnit[]> => {
  const { data, error } = await supabase
    .from('administrative_units')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const saveAdministrativeUnit = async (unit: Partial<AdministrativeUnit>) => {
  const { data, error } = await supabase
    .from('administrative_units')
    .upsert(unit)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteAdministrativeUnit = async (id: number) => {
  const { error } = await supabase
    .from('administrative_units')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// getRequests removido para evitar duplicatas - use a versão no topo do arquivo

export const getRequestsByManager = async (managerEmail: string): Promise<RequestItem[]> => {
  const { data, error } = await supabase
    .from('requests')
    .select('*, profiles:user_id(full_name, avatar_url, role, signature_url, registration_number, unit)')
    .eq('manager_email', managerEmail)
    .in('status', ['Pendente', 'Assinatura Gestor'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return (data || []).map(req => ({
    id: req.id,
    userId: req.user_id,
    title: req.title,
    type: req.type,
    totalValue: req.total_value,
    status: req.status,
    createdAt: req.created_at,
    justification: req.justification,
    destination: req.destination,
    items: req.items,
    managerInfo: req.manager_info,
    userProfile: {
      fullName: req.profiles?.full_name,
      avatarUrl: req.profiles?.avatar_url,
      role: req.profiles?.role,
      registrationNumber: req.profiles?.registration_number,
      unit: req.profiles?.unit
    },
    managerProfile: {
        fullName: req.manager_info?.name,
        signatureUrl: req.profiles?.signature_url // Assumindo que o gestor logado é o subordinado na query, mas corrigiremos no fluxo de detalhes
    },
    signedByManagerAt: req.signed_by_manager_at,
    signedByManagerId: req.signed_by_manager_id,
    signedByManagerLatitude: req.signed_by_manager_latitude,
    signedByManagerLongitude: req.signed_by_manager_longitude,
    nup: req.nup,
    dossier: req.dossier,
    assignedToId: req.assigned_to_id,
    assignedToName: req.assigned_to_name
  }));
};

export const assignRequest = async (requestId: string, userId: string, userName: string) => {
  const { data, error } = await supabase
    .from('requests')
    .update({ 
      assigned_to_id: userId, 
      assigned_to_name: userName,
      status: 'Em Analise',
      updated_at: new Date()
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  
  // Registrar evento de auditoria
  await logAuditEvent(requestId, 'ATRIBUIÇÃO', `Processo atribuído ao analista ${userName}.`);

  // Notificar o analista
  await sendNotification({
    user_id: userId,
    type: 'INFO',
    category: 'PROCESS',
    title: 'Novo Processo Atribuído',
    message: `Você foi designado como analista para o processo "${data.title}" (NUP: ${data.nup}).`,
    link_action: `/gestao_inbox`
  });
  
  return data;
};

export const signRequest = async (requestId: string, managerId: string, coords?: { latitude: number, longitude: number }) => {
  const { data, error } = await supabase
    .from('requests')
    .update({ 
      status: 'Em Analise', 
      signed_by_manager_at: new Date().toISOString(),
      signed_by_manager_id: managerId,
      signed_by_manager_latitude: coords?.latitude,
      signed_by_manager_longitude: coords?.longitude,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;

  // Auditoria de assinatura com GPS
  await logAuditEvent(requestId, 'SIGN', 'Solicitação assinada eletronicamente pelo gestor.', {
    managerId: managerId,
    timestamp: new Date().toISOString(),
    latitude: coords?.latitude,
    longitude: coords?.longitude
  });

  // Notificar o solicitante
  await sendNotification({
    user_id: data.user_id,
    type: 'SUCCESS',
    category: 'PROCESS',
    title: 'Assinado pelo Gestor',
    message: `Sua solicitação "${data.title}" foi assinada pelo gestor e enviada para análise técnica.`,
    link_action: `/solicitacoes/${requestId}`
  });

  return data;
};

export const signByOrdenador = async (
  requestId: string,
  ordenadorId: string,
  notes: string,
  coords?: { latitude: number; longitude: number }
) => {
  const { data, error } = await supabase
    .from('requests')
    .update({
      status: 'Autorizado',
      signed_by_ordenador_at: new Date().toISOString(),
      signed_by_ordenador_id: ordenadorId,
      signed_by_ordenador_latitude: coords?.latitude,
      signed_by_ordenador_longitude: coords?.longitude,
      ordenador_notes: notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;

  await logAuditEvent(requestId, 'ORDENADOR_SIGN',
    'Minuta de Autorização assinada eletronicamente pelo Ordenador de Despesas.', {
      ordenadorId,
      timestamp: new Date().toISOString(),
      latitude: coords?.latitude,
      longitude: coords?.longitude
    }
  );

  // Notificar o solicitante
  await sendNotification({
    user_id: data.user_id,
    type: 'SUCCESS',
    category: 'PROCESS',
    title: 'Processo Autorizado',
    message: `Excelente! Sua solicitação "${data.title}" foi autorizada pelo Ordenador de Despesas.`,
    link_action: `/solicitacoes/${requestId}`
  });

  return data;
};

export const returnByOrdenador = async (
  requestId: string,
  ordenadorId: string,
  notes: string
) => {
  const { data, error } = await supabase
    .from('requests')
    .update({
      status: 'Em Ajuste',
      ordenador_notes: notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  await logAuditEvent(requestId, 'ORDENADOR_RETURN',
    `Processo devolvido pelo Ordenador de Despesas: ${notes}`);
  return data;
};

export const getNextNUP = async () => {
    try {
        const { data, error } = await supabase
            .from('requests')
            .select('nup')
            .order('nup', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        
        const year = new Date().getFullYear();
        if (data && data.length > 0 && data[0].nup) {
            // TJPA-JUR-2026/6501
            const lastNup = data[0].nup;
            const match = lastNup.match(/\/(\d+)/);
            if (match) {
                const nextId = parseInt(match[1]) + 1;
                return `TJPA-JUR-${year}/${nextId}`;
            }
        }
        
        return `TJPA-JUR-${year}/6501`;
    } catch (e) {
        console.error("Error generating NUP:", e);
        return `TJPA-JUR-${new Date().getFullYear()}/6501`;
    }
};

export const sendNotification = async (notification: Omit<SystemNotification, 'id' | 'created_at' | 'is_read'>) => {
    try {
        const { error } = await supabase
            .from('system_notifications')
            .insert({
                ...notification,
                is_read: false
            });

        if (error) throw error;
        return true;
    } catch (e) {
        console.error("Erro ao enviar notificação:", e);
        return null;
    }
};

export const tramitarRequest = async (requestId: string, targetModule: AppModule, notes?: string) => {
  const { data, error } = await supabase
    .from('requests')
    .update({ 
      origin_module: targetModule,
      status: targetModule === 'usuarios' ? 'Pendente' : 'Em Analise',
      assigned_to_id: null,
      assigned_to_name: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  
  // Registrar evento de auditoria
  await logAuditEvent(requestId, 'TRAMITAÇÃO', `Processo tramitado para o módulo ${targetModule.toUpperCase()}.`, { 
    targetModule,
    notes 
  });

  // Notificar o solicitante sobre a tramitação
  await sendNotification({
    user_id: data.user_id,
    type: 'INFO',
    category: 'PROCESS',
    title: 'Processo Tramitado',
    message: `Sua solicitação "${data.title}" foi enviada para o módulo ${targetModule.toUpperCase()}.`,
    link_action: `/solicitacoes/${requestId}`
  });
  
  return data;
};
