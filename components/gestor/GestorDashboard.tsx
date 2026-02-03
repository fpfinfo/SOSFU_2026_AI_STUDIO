import React, { useState, useEffect } from 'react';
import { CheckCircle2, FileText, Filter, Search, Clock, ChevronRight, UserCheck, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StatusBadge } from '../StatusBadge';

interface GestorDashboardProps {
    onNavigate: (page: string, processId?: string) => void;
}

export const GestorDashboard: React.FC<GestorDashboardProps> = ({ onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [pendingProcesses, setPendingProcesses] = useState<any[]>([]);
    const [historyProcesses, setHistoryProcesses] = useState<any[]>([]);
    const [filterTerm, setFilterTerm] = useState('');
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        fetchGestorData();
    }, []);

    const fetchGestorData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserEmail(user.email || '');

            // Busca processos onde o usuário é o gestor (pelo email)
            const { data: solicitations, error } = await supabase
                .from('solicitations')
                .select('*')
                .ilike('manager_email', user.email || '')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (solicitations) {
                // Filtra Pendentes (WAITING_MANAGER)
                setPendingProcesses(solicitations.filter(s => s.status === 'WAITING_MANAGER'));
                // Filtra Histórico: Tudo que não é WAITING_MANAGER. 
                // Se for PENDING (Rascunho do Suprido), ainda aparece aqui para o gestor saber que existe, mas com badge cinza.
                setHistoryProcesses(solicitations.filter(s => s.status !== 'WAITING_MANAGER'));
            }

        } catch (error) {
            console.error("Erro ao carregar painel do gestor:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPending = pendingProcesses.filter(p => 
        p.process_number.toLowerCase().includes(filterTerm.toLowerCase()) ||
        p.beneficiary.toLowerCase().includes(filterTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <Loader2 className="w-10 h-10 text-indigo-800 animate-spin" />
                <p className="text-gray-500 font-medium">Carregando painel de gestão...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 font-sans">
             {/* Header Dark (Gestor) */}
             <div className="bg-[#312e81] rounded-2xl p-8 mb-8 shadow-sm relative overflow-hidden text-white border border-indigo-900">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2 tracking-tight">Painel do Gestor</h1>
                    <p className="text-indigo-200 max-w-2xl text-sm leading-relaxed">
                        Área exclusiva para validação de solicitações de suprimento de fundos. 
                        Analise os pedidos de sua unidade e emita o atesto de chefia imediata.
                    </p>
                </div>
                {/* Decorative background element */}
                <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none"></div>
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none"></div>
            </div>

            {/* Pendências de Atesto */}
            <div className="mb-10">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-yellow-100 text-yellow-700 rounded-lg">
                        <Clock size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Aguardando Seu Atesto</h3>
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full">{pendingProcesses.length}</span>
                </div>

                {pendingProcesses.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl border border-dashed border-gray-300 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <CheckCircle2 size={32} />
                        </div>
                        <h4 className="text-gray-500 font-medium">Nenhuma pendência encontrada.</h4>
                        <p className="text-xs text-gray-400 mt-1">Você não possui solicitações aguardando atesto no momento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPending.map(proc => (
                            <div 
                                key={proc.id} 
                                onClick={() => onNavigate('process_detail', proc.id)}
                                className="bg-white p-5 rounded-xl border border-l-4 border-yellow-400 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <StatusBadge status="WAITING_MANAGER" size="sm" />
                                    <span className="text-xs text-gray-400">{new Date(proc.created_at).toLocaleDateString()}</span>
                                </div>
                                <h4 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">{proc.process_number}</h4>
                                <p className="text-sm text-gray-600 mb-4 line-clamp-1">{proc.beneficiary}</p>
                                
                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                                    <span className="font-mono font-bold text-gray-700">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.value)}
                                    </span>
                                    <button className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                        Analisar <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Histórico */}
            <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Histórico de Tramitações</h3>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                     {/* Search Bar */}
                     <div className="p-4 border-b border-gray-100 flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Buscar no histórico..." 
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-300 focus:outline-none transition-all"
                                value={filterTerm}
                                onChange={(e) => setFilterTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {historyProcesses.length === 0 ? (
                             <div className="p-8 text-center text-gray-400 text-sm">
                                Nenhum histórico disponível.
                            </div>
                        ) : (
                            historyProcesses.map(proc => (
                                <div key={proc.id} onClick={() => onNavigate('process_detail', proc.id)} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                            <UserCheck size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{proc.process_number}</p>
                                            <p className="text-xs text-gray-500">Solicitante: {proc.beneficiary}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <StatusBadge status={proc.status} size="sm" />
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.value)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};