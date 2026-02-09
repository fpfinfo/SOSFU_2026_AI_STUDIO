import React, { useState, useEffect, useCallback } from 'react';
import {
    FileText, Search, Loader2,
    Inbox, CheckCircle2, Users, Receipt, Wallet
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useStaleProcesses } from '../../hooks/useStaleProcesses';
import { StaleProcessBanner } from '../ui/StaleProcessBanner';
import { useRealtimeInbox } from '../../hooks/useRealtimeInbox';
import { RessarcimentoTeamTable } from './RessarcimentoTeamTable';
import { RessarcimentoInbox } from './RessarcimentoInbox';

// ==================== TYPES ====================
interface RessarcimentoDashboardProps {
    onNavigate: (page: string, processId?: string) => void;
    darkMode?: boolean;
    userProfile?: any;
}

// ==================== MAIN COMPONENT ====================
export const RessarcimentoDashboard: React.FC<RessarcimentoDashboardProps> = ({ onNavigate, darkMode = false, userProfile }) => {
    const isGestor = true; // Assuming Gestor role or checking profile
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('');
    
    // Stats State
    const [stats, setStats] = useState({
        newInbox: 0,
        myAnalysis: 0,
        inPayment: 0,
        done: 0
    });

    const MODULE_NAME: 'RESSARCIMENTO' = 'RESSARCIMENTO';
    const WAITING_STATUS = 'WAITING_RESSARCIMENTO_ANALYSIS'; 

    const fetchData = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
                setUserName(profile?.full_name || 'Analista de Ressarcimento');
            }

            // Fetch Stats
            // 1. Inbox (Waiting Analysis)
            const { count: newSols } = await supabase.from('solicitations')
                .select('*', { count: 'exact', head: true })
                .eq('status', WAITING_STATUS); // Assuming specific status
            
            // 2. My Analysis (assigned to me)
            const { count: mySols } = await supabase.from('solicitations')
                .select('*', { count: 'exact', head: true })
                .eq('analyst_id', user?.id)
                .neq('status', 'PAID')
                .neq('status', 'APPROVED');

            // 3. In Payment Phase (Execution)
            const { count: paymentPhase } = await supabase.from('solicitations')
                .select('*', { count: 'exact', head: true })
                .or('status.eq.WAITING_RESSARCIMENTO_EXECUTION,status.eq.WAITING_SEFIN_SIGNATURE,status.eq.WAITING_PAYMENT');

            // 4. Concluded
             const { count: doneTotal } = await supabase.from('solicitations')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'PAID'); // Or APPROVED

            setStats({
                newInbox: newSols || 0,
                myAnalysis: mySols || 0,
                inPayment: paymentPhase || 0,
                done: doneTotal || 0
            });

        } catch (error) { console.error(`Erro ${MODULE_NAME}:`, error); } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const refetch = useCallback(() => { fetchData(); }, [fetchData]);

    useRealtimeInbox({ module: MODULE_NAME, onAnyChange: refetch, });

    const { staleProcesses } = useStaleProcesses({ statuses: [WAITING_STATUS], thresholdDays: 3 });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-400 animate-ping opacity-30" />
                    <Loader2 className="w-10 h-10 text-emerald-600 animate-spin absolute top-3 left-3" />
                </div>
                <p className="text-slate-500 font-medium">Carregando painel de Ressarcimento...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* ===== STATS CARDS ===== */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 1. CAIXA DE ENTRADA */}
                <div className="bg-white rounded-2xl p-5 border shadow-sm border-emerald-100 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Inbox size={48} className="text-emerald-600" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                            <Inbox size={18} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Caixa de Entrada</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">{stats.newInbox}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Solicitações Pendentes</p>
                    <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Triagem Necessária
                    </div>
                </div>

                {/* 2. EM ANÁLISE */}
                <div className="bg-white rounded-2xl p-5 border shadow-sm border-teal-100 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FileText size={48} className="text-teal-600" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                         <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                            <FileText size={18} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Em Análise</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">{stats.myAnalysis}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Processos na sua mesa</p>
                    <div className="mt-3 flex items-center gap-1 text-[10px] text-teal-600/80 font-medium">
                        <Users size={12} /> Responsabilidade técnica
                    </div>
                </div>

                {/* 3. FLUXO DE PAGAMENTO */}
                <div className="bg-white rounded-2xl p-5 border shadow-sm border-blue-100 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet size={48} className="text-blue-600" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                         <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                            <Wallet size={18} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pagamentos</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">{stats.inPayment}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Em Execução Financeira</p>
                     <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: '60%' }} />
                    </div>
                </div>

                {/* 4. CONCLUÍDOS */}
                <div className="bg-white rounded-2xl p-5 border shadow-sm border-slate-100 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle2 size={48} className="text-slate-400" />
                    </div>
                     <div className="flex items-center gap-2 mb-2">
                         <div className="p-2 rounded-lg bg-slate-50 text-slate-600">
                            <CheckCircle2 size={18} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Finalizados</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">{stats.done}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Ressarcimentos Pagos</p>
                </div>
            </div>

            {/* ===== STALE PROCESS ALERT ===== */}
            <StaleProcessBanner staleProcesses={staleProcesses} onViewProcess={(id) => onNavigate('process_detail', id)} accent="emerald" />
            
            {/* ===== SECTION C: INBOX ===== */}
            <RessarcimentoInbox onNavigate={onNavigate} userProfile={userProfile} />

            {/* ===== SECTION B: TEAM MANAGEMENT ===== */}
            <RessarcimentoTeamTable isGestor={isGestor} />

        </div>
    );
};
