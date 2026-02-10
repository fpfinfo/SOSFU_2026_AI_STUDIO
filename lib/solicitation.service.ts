/**
 * SolicitationService - Camada de serviço centralizada para operações de solicitações.
 * Unifica chamadas ao Supabase para SOSFU, SODPA e Ressarcimento.
 */
import { supabase } from './supabase';

// ── Tipos ──────────────────────────────────────────

export type SolicitationModule = 'SOSFU' | 'SODPA' | 'RESSARCIMENTO';

export interface CreateSolicitationPayload {
    process_number: string;
    beneficiary: string;
    unit: string;
    value: number;
    user_id: string;
    event_start_date?: string | null;
    event_end_date?: string | null;
    manager_name?: string;
    manager_email?: string;
    justification?: string;
}

export interface SolicitationItemPayload {
    solicitation_id: string;
    category: string;
    item_name: string;
    element_code?: string;
    qty_requested: number;
    unit_price_requested: number;
    qty_approved?: number;
    unit_price_approved?: number;
}

export interface SolicitationListFilters {
    module?: SolicitationModule;
    status?: string | string[];
    userId?: string;
    analystId?: string;
    search?: string;
    limit?: number;
    offset?: number;
}

// ── Prefixos de Processo ──────────────────────────

const PROCESS_PREFIX: Record<SolicitationModule, string> = {
    SOSFU: 'TJPA-SF',
    SODPA: 'TJPA-DPA',
    RESSARCIMENTO: 'TJPA-RES',
};

// ── Service ───────────────────────────────────────

export const SolicitationService = {

    /**
     * Gera número de processo único com prefixo do módulo.
     */
    generateProcessNumber(module: SolicitationModule): string {
        const year = new Date().getFullYear();
        const seq = Math.floor(1000 + Math.random() * 9000);
        return `${PROCESS_PREFIX[module]}-${year}/${seq}`;
    },

    /**
     * Cria uma nova solicitação e retorna o ID.
     */
    async create(payload: CreateSolicitationPayload): Promise<{ id: string; process_number: string }> {
        const { data, error } = await supabase
            .from('solicitations')
            .insert({
                ...payload,
                date: new Date().toISOString(),
                status: 'PENDING',
            })
            .select('id, process_number')
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Insere itens vinculados a uma solicitação.
     */
    async addItems(items: SolicitationItemPayload[]): Promise<void> {
        if (items.length === 0) return;
        const { error } = await supabase.from('solicitation_items').insert(items);
        if (error) throw error;
    },

    /**
     * Busca solicitações com filtros opcionais.
     */
    async list(filters: SolicitationListFilters = {}) {
        let query = supabase
            .from('solicitations')
            .select('*, analyst:analyst_id(full_name)', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (filters.status) {
            if (Array.isArray(filters.status)) {
                query = query.in('status', filters.status);
            } else {
                query = query.eq('status', filters.status);
            }
        }

        if (filters.userId) {
            query = query.eq('user_id', filters.userId);
        }

        if (filters.analystId) {
            query = query.eq('analyst_id', filters.analystId);
        }

        if (filters.search) {
            query = query.or(`process_number.ilike.%${filters.search}%,beneficiary.ilike.%${filters.search}%,unit.ilike.%${filters.search}%`);
        }

        // Module filtering via unit field pattern
        if (filters.module === 'SODPA') {
            query = query.ilike('unit', '%DIARIAS-PASSAGENS%');
        } else if (filters.module === 'RESSARCIMENTO') {
            query = query.ilike('unit', '%RESSARCIMENTO%');
        }

        if (filters.limit) {
            const from = filters.offset || 0;
            query = query.range(from, from + filters.limit - 1);
        }

        const { data, error, count } = await query;
        if (error) throw error;
        return { data: data || [], count: count || 0 };
    },

    /**
     * Busca uma solicitação por ID com itens.
     */
    async getById(id: string) {
        const { data, error } = await supabase
            .from('solicitations')
            .select(`
                *,
                analyst:analyst_id(full_name, email),
                solicitation_items(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Atualiza o status de uma solicitação e registra no histórico.
     */
    async updateStatus(
        id: string,
        newStatus: string,
        actorName: string,
        description?: string
    ): Promise<void> {
        // Busca status atual
        const { data: current } = await supabase
            .from('solicitations')
            .select('status')
            .eq('id', id)
            .single();

        const oldStatus = current?.status || 'UNKNOWN';

        // Atualiza
        const { error: updateError } = await supabase
            .from('solicitations')
            .update({ status: newStatus })
            .eq('id', id);

        if (updateError) throw updateError;

        // Registra no histórico
        await supabase.from('historico_tramitacao').insert({
            solicitation_id: id,
            status_from: oldStatus,
            status_to: newStatus,
            actor_name: actorName,
            description: description || `Status alterado de ${oldStatus} para ${newStatus}`,
            created_at: new Date().toISOString(),
        });
    },

    /**
     * Conta solicitações pendentes por módulo (para dashboards).
     */
    async getPendingCounts(module: SolicitationModule): Promise<{ pending: number; urgent: number }> {
        const statusMap: Record<SolicitationModule, string[]> = {
            SOSFU: ['WAITING_SOSFU_ANALYSIS', 'WAITING_SOSFU_EXECUTION'],
            SODPA: ['WAITING_SODPA_ANALYSIS'],
            RESSARCIMENTO: ['WAITING_RESSARCIMENTO_ANALYSIS', 'WAITING_RESSARCIMENTO_EXECUTION'],
        };

        const { data, error } = await supabase
            .from('solicitations')
            .select('id, created_at')
            .in('status', statusMap[module]);

        if (error) throw error;

        const items = data || [];
        const now = Date.now();
        const urgentThresholdHours = module === 'RESSARCIMENTO' ? 48 : 24;
        const urgent = items.filter(t => {
            const hours = (now - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
            return hours > urgentThresholdHours;
        }).length;

        return { pending: items.length, urgent };
    },

    /**
     * Busca o perfil do usuario logado com dados complementares.
     */
    async getCurrentUserProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, matricula, cargo, lotacao, gestor_nome, gestor_email, municipio, banco, agencia, conta')
            .eq('id', user.id)
            .single();

        return profile ? { ...profile, userId: user.id } : null;
    },
};
