import React, { useState, useEffect } from 'react';
import { Clock, ChevronLeft, Search, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TimelineCard } from './active-timeline/TimelineCard';
import { SentinelaNudge } from './active-timeline/SentinelaNudge';

interface SupridoProcessesViewProps {
    onNavigate: (page: string, processId?: string, accountabilityId?: string) => void;
    onBack: () => void;
}

export const SupridoProcessesView: React.FC<SupridoProcessesViewProps> = ({ onNavigate, onBack }) => {
    const [loading, setLoading] = useState(true);
    const [processes, setProcesses] = useState<any[]>([]);
    const [filterTerm, setFilterTerm] = useState('');

    useEffect(() => {
        fetchProcesses();
    }, []);

    const fetchProcesses = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('solicitations')
                .select(`
                    *,
                    accountabilities (
                        id,
                        status,
                        balance,
                        deadline,
                        sentinela_risk,
                        sentinela_alerts
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProcesses(data || []);
        } catch (err) {
            console.error('Erro ao buscar processos:', err);
        } finally {
            setLoading(false);
        }
    };

    const activeProcesses = processes.filter(p => 
        p.status !== 'ARCHIVED' && 
        p.status !== 'REJECTED' &&
        p.accountabilities?.[0]?.status !== 'APPROVED'
    ).filter(p => 
        p.process_number.toLowerCase().includes(filterTerm.toLowerCase()) ||
        p.unit?.toLowerCase().includes(filterTerm.toLowerCase())
    );

    const handleAction = (processId: string, action: string) => {
        // Implementação de ações (mesma lógica do dashboard)
        if (action === 'START_ACCOUNTABILITY' || action === 'FIX_ACCOUNTABILITY') {
             const proc = processes.find(p => p.id === processId);
             const pc = proc?.accountabilities?.[0];
             onNavigate('process_accountability', processId, pc?.id);
        } else {
             onNavigate('process_detail', processId);
        }
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-slate-800" /></div>;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 font-sans">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                             <Clock className="text-sky-600" size={24} /> Meus Processos em Andamento
                        </h2>
                        <p className="text-sm text-slate-500 font-medium">Acompanhe e execute ações nas suas solicitações ativas</p>
                    </div>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Buscar por NUP ou Unidade..." 
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-sky-500 outline-none transition-all shadow-sm" 
                        value={filterTerm} 
                        onChange={(e) => setFilterTerm(e.target.value)} 
                    />
                </div>
            </div>

            {activeProcesses.length > 0 ? (
                <div className="space-y-6">
                    {activeProcesses.map(proc => (
                        <div key={proc.id} className="space-y-4">
                            <TimelineCard 
                                process={proc}
                                onAction={handleAction}
                            />
                            {proc.accountabilities?.[0]?.sentinela_risk && (
                                <SentinelaNudge 
                                    risk={proc.accountabilities[0].sentinela_risk} 
                                    alerts={proc.accountabilities[0].sentinela_alerts} 
                                />
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 shadow-inner">
                        <CheckCircle2 size={40} />
                    </div>
                    <h4 className="text-xl font-black text-slate-800 mb-2">Excelente trabalho!</h4>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto font-medium">Você não possui processos com ações pendentes neste momento. Suas solicitações estão em dia.</p>
                </div>
            )}
        </div>
    );
};
