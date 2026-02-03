import React, { useState, useEffect } from 'react';
import { Siren, Gavel, FileText, Clock, Search, ChevronRight, Loader2, Wallet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StatusBadge } from '../StatusBadge';

interface SupridoDashboardProps {
    onNavigate: (page: string, processId?: string) => void;
}

export const SupridoDashboard: React.FC<SupridoDashboardProps> = ({ onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ receivedYear: 0, inAnalysis: 0, pendingAccountability: 0 });
    const [processes, setProcesses] = useState<any[]>([]);
    const [filterTerm, setFilterTerm] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Solicitações
            const { data: solicitations, error: solError } = await supabase
                .from('solicitations')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (solError) throw solError;

            // 2. PCs (Contar PCs pendentes)
            const paidProcs = solicitations?.filter(s => s.status === 'PAID') || [];
            
            const { data: pcs } = await supabase
                .from('accountabilities')
                .select('solicitation_id, status')
                .in('solicitation_id', paidProcs.map(p => p.id));
            
            const pendingPC = paidProcs.length - (pcs?.filter(pc => pc.status === 'APPROVED').length || 0);

            setStats({
                receivedYear: paidProcs.reduce((acc, curr) => acc + Number(curr.value), 0),
                inAnalysis: solicitations?.filter(s => s.status === 'PENDING').length || 0,
                pendingAccountability: pendingPC,
            });

            setProcesses(solicitations || []);

        } catch (error) {
            console.error("Erro ao carregar dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    const getProcessType = (unit: string) => {
        if (unit?.includes('EMERGENCIAL')) return { label: 'EMERGENCIAL', color: 'bg-red-50 text-red-600 border-red-100' };
        if (unit?.includes('JÚRI')) return { label: 'EXTRA-JÚRI', color: 'bg-blue-50 text-blue-600 border-blue-100' };
        return { label: 'ORDINÁRIO', color: 'bg-gray-50 text-gray-600 border-gray-100' };
    };

    const filteredProcesses = processes.filter(p => 
        p.process_number.toLowerCase().includes(filterTerm.toLowerCase()) ||
        p.unit?.toLowerCase().includes(filterTerm.toLowerCase())
    );

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-slate-800" /></div>;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 font-sans">
            
            <div className="bg-[#1e293b] rounded-2xl p-8 mb-8 shadow-sm relative overflow-hidden text-white border border-slate-700">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2 tracking-tight">Portal do Suprido</h1>
                    <p className="text-slate-300 max-w-2xl text-sm leading-relaxed">
                        Gerencie suas solicitações de suprimento de fundos, acompanhe aprovações e realize prestações de contas.
                    </p>
                </div>
            </div>

            {stats.pendingAccountability > 0 && (
                <div className="mb-8 bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Wallet size={24}/></div>
                        <div>
                            <h4 className="font-bold text-orange-900">Prestação de Contas Pendente</h4>
                            <p className="text-sm text-orange-700">Você possui {stats.pendingAccountability} processo(s) pago(s) aguardando comprovação de despesas.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-10">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Nova Solicitação Extraordinária</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden" onClick={() => onNavigate('solicitation_emergency')}>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500 mb-4 group-hover:scale-105 transition-transform"><Siren size={24} /></div>
                            <h4 className="text-lg font-bold text-gray-800 mb-1">Extra-Emergencial</h4>
                            <p className="text-sm text-gray-500 mb-4 max-w-xs">Para despesas urgentes e imprevisíveis.</p>
                            <span className="text-xs font-bold text-red-600 flex items-center gap-1 group-hover:gap-2 transition-all">Iniciar Solicitação <ChevronRight size={14} /></span>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden" onClick={() => onNavigate('solicitation_jury')}>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 mb-4 group-hover:scale-105 transition-transform"><Gavel size={24} /></div>
                            <h4 className="text-lg font-bold text-gray-800 mb-1">Extra-Júri</h4>
                            <p className="text-sm text-gray-500 mb-4 max-w-xs">Para custeio de alimentação em sessões do Júri.</p>
                            <span className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:gap-2 transition-all">Iniciar Solicitação <ChevronRight size={14} /></span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="text" placeholder="Buscar processo..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-300 outline-none" value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} />
                    </div>
                </div>
                <div className="divide-y divide-gray-100">
                    {filteredProcesses.map((proc) => {
                        const typeInfo = getProcessType(proc.unit);
                        const isPaid = proc.status === 'PAID';
                        return (
                            <div key={proc.id} onClick={() => onNavigate('process_detail', proc.id)} className="p-6 hover:bg-slate-50 transition-colors group flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer">
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isPaid ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {isPaid ? <Clock size={20} /> : <FileText size={20} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600">{proc.process_number}</h4>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${typeInfo.color}`}>{typeInfo.label}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">Valor: <span className="font-semibold text-gray-700">R$ {proc.value}</span></p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {isPaid ? (
                                        <span className="px-3 py-1 bg-orange-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-orange-700 transition-colors">
                                            Prestar Contas
                                        </span>
                                    ) : (
                                        <StatusBadge status={proc.status} size="sm" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};