import React, { useState, useEffect } from 'react';
import { Siren, Gavel, FileText, CheckSquare, Clock, AlertTriangle, Search, Filter, ChevronRight, MoreVertical, DollarSign, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SupridoDashboardProps {
    onNavigate: (page: string) => void;
}

export const SupridoDashboard: React.FC<SupridoDashboardProps> = ({ onNavigate }) => {
    const [loading, setLoading] = useState(true);
    
    // Dados Reais
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

            // 1. Buscar Solicitações do Usuário
            const { data: solicitations, error: solError } = await supabase
                .from('solicitations')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (solError) throw solError;

            // 2. Buscar PCs do Usuário
            const { data: accountabilities, error: accError } = await supabase
                .from('accountabilities')
                .select('*')
                .eq('requester_id', user.id);

            if (accError) throw accError;

            // Calcular Estatísticas
            const received = solicitations
                ?.filter(s => s.status === 'PAID')
                .reduce((acc, curr) => acc + Number(curr.value), 0) || 0;
            
            const analysis = solicitations
                ?.filter(s => s.status === 'PENDING')
                .reduce((acc, curr) => acc + Number(curr.value), 0) || 0;

            const pendingPC = accountabilities?.filter(a => ['LATE', 'CORRECTION', 'ANALYSIS'].includes(a.status)).length || 0;

            setStats({
                receivedYear: received,
                inAnalysis: analysis,
                pendingAccountability: pendingPC,
            });

            setProcesses(solicitations || []);

        } catch (error) {
            console.error("Erro ao carregar dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    // Helper para extrair tipo do campo unit (já que não temos coluna type ainda)
    const getProcessType = (unit: string) => {
        if (unit?.includes('EMERGENCIAL')) return { label: 'EMERGENCIAL', color: 'bg-red-50 text-red-600 border-red-100' };
        if (unit?.includes('JÚRI')) return { label: 'EXTRA-JÚRI', color: 'bg-blue-50 text-blue-600 border-blue-100' };
        return { label: 'ORDINÁRIO', color: 'bg-gray-50 text-gray-600 border-gray-100' };
    };

    const filteredProcesses = processes.filter(p => 
        p.process_number.toLowerCase().includes(filterTerm.toLowerCase()) ||
        p.unit?.toLowerCase().includes(filterTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <Loader2 className="w-10 h-10 text-slate-800 animate-spin" />
                <p className="text-gray-500 font-medium">Carregando portal...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 font-sans">
            
            {/* Header Dark (Portal do Suprido) */}
            <div className="bg-[#1e293b] rounded-2xl p-8 mb-8 shadow-sm relative overflow-hidden text-white border border-slate-700">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2 tracking-tight">Portal do Suprido</h1>
                    <p className="text-slate-300 max-w-2xl text-sm leading-relaxed">
                        Gerencie suas solicitações de suprimento de fundos, acompanhe aprovações e realize prestações de contas de forma simples e rápida.
                    </p>
                </div>
                {/* Decorative background element */}
                <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none"></div>
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
            </div>

            {/* Nova Solicitação Cards */}
            <div className="mb-10">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Nova Solicitação Extraordinária</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Card Emergencial */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden" onClick={() => onNavigate('solicitation_emergency')}>
                         <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <Siren size={120} className="text-red-500" />
                        </div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500 mb-4 group-hover:scale-105 transition-transform">
                                <Siren size={24} />
                            </div>
                            <h4 className="text-lg font-bold text-gray-800 mb-1">Extra-Emergencial</h4>
                            <p className="text-sm text-gray-500 mb-4 max-w-xs">
                                Para despesas urgentes e imprevisíveis que exigem atendimento imediato.
                            </p>
                            <span className="text-xs font-bold text-red-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                                Iniciar Solicitação <ChevronRight size={14} />
                            </span>
                        </div>
                    </div>

                    {/* Card Júri */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden" onClick={() => onNavigate('solicitation_jury')}>
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <Gavel size={120} className="text-blue-500" />
                        </div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 mb-4 group-hover:scale-105 transition-transform">
                                <Gavel size={24} />
                            </div>
                            <h4 className="text-lg font-bold text-gray-800 mb-1">Extra-Júri</h4>
                            <p className="text-sm text-gray-500 mb-4 max-w-xs">
                                Para custeio de alimentação e logística em sessões do Tribunal do Júri.
                            </p>
                            <span className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                                Iniciar Solicitação <ChevronRight size={14} />
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Meus Processos */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Meus Processos e Prestação de Contas</h3>
                    <button className="text-xs font-bold text-blue-600 hover:underline">Ver Histórico Completo</button>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Search Bar */}
                    <div className="p-4 border-b border-gray-100 flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Buscar processo..." 
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-300 focus:outline-none transition-all"
                                value={filterTerm}
                                onChange={(e) => setFilterTerm(e.target.value)}
                            />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                            <Filter size={16} />
                            Filtros
                        </button>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {filteredProcesses.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                Nenhuma solicitação encontrada.
                            </div>
                        ) : (
                            filteredProcesses.map((proc) => {
                                const typeInfo = getProcessType(proc.unit);
                                const isPaid = proc.status === 'PAID';
                                const isPending = proc.status === 'PENDING';
                                
                                return (
                                    <div key={proc.id} className="p-6 hover:bg-slate-50 transition-colors group flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            {/* Icon */}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                isPaid ? 'bg-orange-100 text-orange-600' :
                                                isPending ? 'bg-yellow-100 text-yellow-600' :
                                                'bg-blue-100 text-blue-600'
                                            }`}>
                                                {isPaid ? <Clock size={20} /> : <FileText size={20} />}
                                            </div>
                                            
                                            {/* Content */}
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h4 className="text-sm font-bold text-gray-900">{proc.process_number} - {typeInfo.label === 'EXTRA-JÚRI' ? 'Suprimento Júri' : 'Suprimento Emergencial'}</h4>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${typeInfo.color}`}>
                                                        {typeInfo.label}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    {isPaid ? 'Aprovado em ' : 'Solicitado em '} 
                                                    {new Date(proc.date).toLocaleDateString('pt-BR')} • 
                                                    Valor: <span className="font-semibold text-gray-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.value)}</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Status & Actions */}
                                        <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                                            <div className="text-right">
                                                {isPaid ? (
                                                    <p className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg inline-block">
                                                        Aguardando Prestação de Contas
                                                    </p>
                                                ) : isPending ? (
                                                     <p className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-lg inline-block">
                                                        Em Análise Técnica
                                                    </p>
                                                ) : (
                                                    <p className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg inline-block">
                                                        Processamento
                                                    </p>
                                                )}
                                                
                                                {isPaid && (
                                                    <p className="text-[10px] text-gray-400 mt-1">Prazo: 15 dias restantes</p>
                                                )}
                                            </div>

                                            {isPaid ? (
                                                <button className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-black transition-colors shadow-sm">
                                                    Prestar Contas
                                                </button>
                                            ) : (
                                                <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                                                    Ver Detalhes
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};