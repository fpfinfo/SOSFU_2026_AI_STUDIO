import React, { useState, useEffect } from 'react';
import { Briefcase, FileText, CheckCircle2, Search, DollarSign, ChevronRight, Scale, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SefinDashboardProps {
    onNavigate: (page: string, processId?: string) => void;
}

export const SefinDashboard: React.FC<SefinDashboardProps> = ({ onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [pendingAuth, setPendingAuth] = useState<any[]>([]); // Waiting SEFIN SIGNATURE
    const [approvedHistory, setApprovedHistory] = useState<any[]>([]); 
    const [searchTerm, setSearchTerm] = useState('');
    const [userName, setUserName] = useState('');

    useEffect(() => {
        fetchSefinData();
    }, []);

    const fetchSefinData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
                setUserName(profile?.full_name || 'Ordenador');
            }

            // Buscar Processos
            const { data: solicitations, error } = await supabase
                .from('solicitations')
                .select('*')
                .in('status', ['WAITING_SEFIN_SIGNATURE', 'WAITING_SOSFU_PAYMENT', 'WAITING_SUPRIDO_CONFIRMATION', 'PAID'])
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (solicitations) {
                // Filtra especificamente o que está aguardando assinatura
                setPendingAuth(solicitations.filter(s => s.status === 'WAITING_SEFIN_SIGNATURE'));
                // O resto é histórico
                setApprovedHistory(solicitations.filter(s => s.status !== 'WAITING_SEFIN_SIGNATURE'));
            }

        } catch (error) {
            console.error("Erro ao carregar painel SEFIN:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPending = pendingAuth.filter(p => 
        p.process_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.beneficiary.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <Loader2 className="w-10 h-10 text-emerald-800 animate-spin" />
                <p className="text-gray-500 font-medium">Carregando gabinete...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 font-sans">
             {/* Header Green (SEFIN) */}
             <div className="bg-emerald-900 rounded-2xl p-8 mb-8 shadow-sm relative overflow-hidden text-white border border-emerald-800">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2 tracking-tight">Gabinete SEFIN</h1>
                    <p className="text-emerald-200 max-w-2xl text-sm leading-relaxed">
                        Olá, <strong>{userName}</strong>. Gerencie aqui as autorizações de despesa e atos de concessão pendentes de assinatura.
                    </p>
                </div>
                <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-emerald-500/20 to-transparent pointer-events-none"></div>
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/30 rounded-full blur-3xl pointer-events-none"></div>
            </div>

            {/* Pendências de Autorização */}
            <div className="mb-10">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                        <Scale size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Processos Aguardando Assinatura</h3>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">{pendingAuth.length}</span>
                </div>

                {pendingAuth.length === 0 ? (
                    <div className="bg-white p-12 rounded-xl border border-dashed border-gray-300 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <CheckCircle2 size={32} />
                        </div>
                        <h4 className="text-gray-500 font-medium">Caixa de entrada vazia.</h4>
                        <p className="text-xs text-gray-400 mt-1">Nenhum processo aguardando sua assinatura no momento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPending.map(proc => (
                            <div 
                                key={proc.id} 
                                onClick={() => onNavigate('process_detail', proc.id)}
                                className="bg-white p-5 rounded-xl border border-l-4 border-emerald-500 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded uppercase">Assinatura Pendente</span>
                                    <span className="text-xs text-gray-400">{new Date(proc.created_at).toLocaleDateString()}</span>
                                </div>
                                <h4 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-emerald-700 transition-colors">{proc.process_number}</h4>
                                <p className="text-sm text-gray-600 mb-4 line-clamp-1">{proc.beneficiary}</p>
                                
                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                                    <span className="font-mono font-bold text-gray-700 flex items-center gap-1">
                                        <DollarSign size={14} className="text-gray-400" />
                                        {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(proc.value)}
                                    </span>
                                    <button className="text-xs font-bold text-emerald-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                        Examinar <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Histórico Recente */}
            <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Histórico de Autorizações</h3>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                     <div className="p-4 border-b border-gray-100 flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Buscar no histórico..." 
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-300 focus:outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {approvedHistory.length === 0 ? (
                             <div className="p-8 text-center text-gray-400 text-sm">
                                Nenhum histórico disponível.
                            </div>
                        ) : (
                            approvedHistory.slice(0, 10).map(proc => (
                                <div key={proc.id} onClick={() => onNavigate('process_detail', proc.id)} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                            <Briefcase size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{proc.process_number}</p>
                                            <p className="text-xs text-gray-500">Solicitante: {proc.beneficiary}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700">
                                            Autorizado
                                        </span>
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