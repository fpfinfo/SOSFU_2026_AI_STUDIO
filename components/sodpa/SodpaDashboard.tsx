import React, { useState, useEffect, useCallback } from 'react';
import {
    FileText, Search, Loader2,
    Inbox, CheckCircle2, Users, FileSignature
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useStaleProcesses } from '../../hooks/useStaleProcesses';
import { StaleProcessBanner } from '../ui/StaleProcessBanner';
import { useRealtimeInbox } from '../../hooks/useRealtimeInbox';
import { SodpaTeamTable } from './SodpaTeamTable';
import { SodpaInbox } from './SodpaInbox';

// ==================== TYPES ====================
interface SodpaDashboardProps {
    onNavigate: (page: string, processId?: string) => void;
    darkMode?: boolean;
    userProfile?: any;
}

// ==================== MAIN COMPONENT ====================
export const SodpaDashboard: React.FC<SodpaDashboardProps> = ({ onNavigate, darkMode = false, userProfile }) => {
    const isGestor = userProfile?.dperfil?.slug === 'SODPA_GESTOR';
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('');
    
    // Stats State
    const [stats, setStats] = useState({
        newInbox: 0,
        mySolicitations: 0,
        myAccountabilities: 0,
        waitingFlow: 0
    });

    const MODULE_NAME = 'SODPA';
    const WAITING_STATUS = 'WAITING_SODPA_ANALYSIS'; 

    const fetchData = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
                setUserName(profile?.full_name || 'Servidor SODPA');
            }

            // Fetch Stats
            // 1. Inbox (Waiting SODPA)
            const { count: newSols } = await supabase.from('solicitations')
                .select('*', { count: 'exact', head: true })
                .eq('status', WAITING_STATUS);
            
            // 2. Inbox (Pending Accountabilities) - assuming PENDING status
            const { count: newPcs } = await supabase.from('accountabilities')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'PENDING');

            // 3. My Solicitations
            const { count: mySols } = await supabase.from('solicitations')
                .select('*', { count: 'exact', head: true })
                .eq('analyst_id', user?.id)
                .neq('status', 'PAID')
                .neq('status', 'APPROVED');

            // 4. My Accountabilities
            const { count: myPcs } = await supabase.from('accountabilities')
                .select('*', { count: 'exact', head: true })
                .eq('analyst_id', user?.id)
                .or('status.eq.UNDER_ANALYSIS,status.eq.PENDING');

            // 5. Waiting Flow (Example: Waiting SEFIN or Signature)
            const { count: waiting } = await supabase.from('solicitations')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'WAITING_SEFIN_SIGNATURE'); 

            setStats({
                newInbox: (newSols || 0) + (newPcs || 0),
                mySolicitations: mySols || 0,
                myAccountabilities: myPcs || 0,
                waitingFlow: waiting || 0
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
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-400 to-teal-400 animate-ping opacity-30" />
                    <Loader2 className="w-10 h-10 text-sky-600 animate-spin absolute top-3 left-3" />
                </div>
                <p className="text-slate-500 font-medium">Carregando painel SODPA...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ===== WELCOME BANNER (Optional, maybe specific to SODPA) ===== */}
            {/* Keeping simpler layout to match SOSFU style which uses cards at top */}
            
            {/* ===== STATS CARDS ===== */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 1. CAIXA DE ENTRADA */}
                <div className="bg-white rounded-2xl p-5 border shadow-sm border-blue-100 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Inbox size={48} className="text-blue-600" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                            <Inbox size={18} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Caixa de Entrada</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">{stats.newInbox}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Novos Recebidos</p>
                    <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Ação Necessária
                    </div>
                </div>

                {/* 2. MINHA MESA (Solicitações) */}
                <div className="bg-white rounded-2xl p-5 border shadow-sm border-teal-100 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FileText size={48} className="text-teal-600" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                         <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                            <FileText size={18} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Minha Mesa</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">{stats.mySolicitations}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Diárias em Análise</p>
                    <div className="mt-3 flex items-center gap-1 text-[10px] text-teal-600/80 font-medium">
                        <Users size={12} /> Sob sua responsabilidade
                    </div>
                </div>

                {/* 3. MINHA MESA (Prest. Contas) */}
                <div className="bg-white rounded-2xl p-5 border shadow-sm border-amber-100 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle2 size={48} className="text-amber-600" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                         <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                            <CheckCircle2 size={18} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Prestações de Contas</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">{stats.myAccountabilities}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">PC em Análise</p>
                    <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: '45%' }} />
                    </div>
                </div>

                {/* 4. FLUXO EXECUTIVO */}
                <div className="bg-white rounded-2xl p-5 border shadow-sm border-amber-100 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FileSignature size={48} className="text-amber-600" />
                    </div>
                     <div className="flex items-center gap-2 mb-2">
                         <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                            <FileSignature size={18} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fluxo Executivo</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">{stats.waitingFlow}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Aguardando Assinatura</p>
                    <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-amber-600 bg-amber-50 w-fit px-2 py-1 rounded-md">
                         Aguardando Revisor
                    </div>
                </div>
            </div>

            {/* ===== STALE PROCESS ALERT ===== */}
            <StaleProcessBanner staleProcesses={staleProcesses} onViewProcess={(id) => onNavigate('process_detail', id)} accent="red" />
            


            {/* ===== SECTION C: INBOX ===== */}
            <SodpaInbox onNavigate={onNavigate} userProfile={userProfile} />

            {/* ===== SECTION B: TEAM MANAGEMENT ===== */}
            <SodpaTeamTable isGestor={isGestor} />

        </div>
    );
};
