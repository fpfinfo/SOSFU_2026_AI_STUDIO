import React, { useState, useEffect } from 'react';
import { CheckCircle2, FileText, Filter, Search, Clock, ChevronRight, UserCheck, Loader2, Plus, Wallet, TrendingUp, AlertCircle, Stamp, FileCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StatusBadge } from '../StatusBadge';

interface GestorDashboardProps {
    onNavigate: (page: string, processId?: string, accountabilityId?: string) => void;
}

export const GestorDashboard: React.FC<GestorDashboardProps> = ({ onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [pendingApproval, setPendingApproval] = useState<any[]>([]); // Solicitações
    const [pendingAccountability, setPendingAccountability] = useState<any[]>([]); // PCs
    const [myRequests, setMyRequests] = useState<any[]>([]);
    const [stats, setStats] = useState({ 
        pendingCount: 0, 
        pendingPcCount: 0,
        myActiveCount: 0, 
        totalManagedValue: 0 
    });
    const [userName, setUserName] = useState('');

    useEffect(() => {
        fetchGestorData();
    }, []);

    const fetchGestorData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            // Pega nome do usuário
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
            setUserName(profile?.full_name?.split(' ')[0] || 'Gestor');

            // 1. Solicitações para APROVAR (WAITING_MANAGER)
            const { data: approvals, error: appError } = await supabase
                .from('solicitations')
                .select('*')
                .ilike('manager_email', user.email || '')
                .eq('status', 'WAITING_MANAGER')
                .order('created_at', { ascending: false });

            if (appError) throw appError;

            // 2. Prestações de Contas para ATESTAR (WAITING_MANAGER)
            // Precisamos fazer join com solicitations para verificar o manager_email
            const { data: pcApprovals, error: pcError } = await supabase
                .from('accountabilities')
                .select(`
                    *,
                    solicitation:solicitation_id!inner(manager_email, process_number, beneficiary, unit),
                    requester:requester_id(full_name)
                `)
                .eq('status', 'WAITING_MANAGER')
                .ilike('solicitation.manager_email', user.email || '');

            if (pcError) console.error("Erro ao buscar PCs:", pcError);
            
            // 3. Processos SOLICITADOS PELO GESTOR (Auto-suprimento)
            const { data: requests, error: reqError } = await supabase
                .from('solicitations')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (reqError) throw reqError;

            // Stats
            const pendingList = approvals || [];
            const pcList = pcApprovals || [];
            const myList = requests || [];
            const myActive = myList.filter(p => p.status !== 'PAID' && p.status !== 'REJECTED');
            
            // Cálculo do valor total sob gestão (aprovados + pendentes)
            const pendingValue = pendingList.reduce((acc, curr) => acc + Number(curr.value), 0);

            setPendingApproval(pendingList);
            setPendingAccountability(pcList);
            setMyRequests(myList);
            setStats({
                pendingCount: pendingList.length,
                pendingPcCount: pcList.length,
                myActiveCount: myActive.length,
                totalManagedValue: pendingValue
            });

        } catch (error) {
            console.error("Erro ao carregar painel do gestor:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <Loader2 className="w-10 h-10 text-indigo-800 animate-spin" />
                <p className="text-gray-500 font-medium">Carregando gabinete...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 font-sans">
             
             {/* Header Section */}
             <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Gabinete Virtual</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Bem-vindo, <strong>{userName}</strong>. Aqui você gerencia sua equipe e seus próprios processos.
                    </p>
                </div>
                <button 
                    onClick={() => onNavigate('solicitation_emergency')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 transform hover:-translate-y-0.5"
                >
                    <Plus size={18} /> Novo Suprimento Próprio
                </button>
             </div>

             {/* Stats Overview */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {/* Card 1: Aprovações (Solicitações + PCs) */}
                <div className={`p-6 rounded-2xl border flex items-center justify-between shadow-sm transition-all ${stats.pendingCount + stats.pendingPcCount > 0 ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-100' : 'bg-white border-gray-200'}`}>
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${stats.pendingCount > 0 ? 'text-amber-700' : 'text-gray-400'}`}>Pendências de Equipe</p>
                        <h3 className="text-3xl font-bold text-gray-800">{stats.pendingCount + stats.pendingPcCount}</h3>
                        <p className="text-xs text-gray-500 mt-1">{stats.pendingCount} Pedidos / {stats.pendingPcCount} PCs</p>
                    </div>
                    <div className={`p-4 rounded-xl ${stats.pendingCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-50 text-gray-300'}`}>
                        <Stamp size={24} />
                    </div>
                </div>

                {/* Card 2: Meus Processos */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Meus Processos Ativos</p>
                        <h3 className="text-3xl font-bold text-indigo-600">{stats.myActiveCount}</h3>
                        <p className="text-xs text-gray-500 mt-1">Solicitações próprias</p>
                    </div>
                    <div className="p-4 rounded-xl bg-indigo-50 text-indigo-600">
                        <Wallet size={24} />
                    </div>
                </div>

                {/* Card 3: Valor Gerido */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Valor em Análise</p>
                        <h3 className="text-3xl font-bold text-gray-800">
                            <span className="text-sm text-gray-400 font-normal align-top mr-1">R$</span>
                            {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(stats.totalManagedValue)}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Total aguardando aprovação</p>
                    </div>
                    <div className="p-4 rounded-xl bg-green-50 text-green-600">
                        <TrendingUp size={24} />
                    </div>
                </div>
             </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* PAINEL 1: MESA DE DECISÃO (APROVAÇÕES) */}
                <div className="flex flex-col h-full space-y-6">
                    
                    {/* Seção A: Prestação de Contas (Prioridade) */}
                    {pendingAccountability.length > 0 && (
                        <div className="space-y-3 animate-in slide-in-from-left-4">
                            <div className="flex items-center gap-2 px-1 text-purple-700">
                                <FileCheck size={20} />
                                <h3 className="text-sm font-bold uppercase">Prestações de Contas para Atesto</h3>
                            </div>
                            
                            {pendingAccountability.map(pc => (
                                <div 
                                    key={pc.id} 
                                    onClick={() => onNavigate('process_accountability', pc.solicitation_id, pc.id)}
                                    className="bg-white p-5 rounded-2xl border border-purple-200 border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="text-base font-bold text-gray-800 group-hover:text-purple-600 transition-colors flex items-center gap-2">
                                                {pc.solicitation.process_number}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">Enviado por: {pc.requester?.full_name}</p>
                                        </div>
                                        <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide flex items-center gap-1">
                                            <Clock size={12}/> Aguardando Atesto
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
                                        <span className="font-mono font-bold text-gray-800 text-sm">
                                            Total Gasto: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pc.total_spent)}
                                        </span>
                                        <button className="text-xs font-bold text-purple-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                                            Revisar Contas <ChevronRight size={14}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Seção B: Solicitações Iniciais */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1 text-amber-700">
                            <Stamp size={20} />
                            <h3 className="text-sm font-bold uppercase">Solicitações de Suprimento</h3>
                        </div>

                        {pendingApproval.length === 0 ? (
                            <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-300 text-center">
                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-300">
                                    <CheckCircle2 size={24} />
                                </div>
                                <p className="text-sm text-gray-500">Nenhuma solicitação pendente.</p>
                            </div>
                        ) : (
                            pendingApproval.map(proc => (
                                <div 
                                    key={proc.id} 
                                    onClick={() => onNavigate('process_detail', proc.id)}
                                    className="bg-white p-5 rounded-2xl border border-gray-200 border-l-4 border-l-amber-400 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="text-base font-bold text-gray-800 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                                                {proc.process_number}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">{new Date(proc.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                                            Aguardando Autorização
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                                            {proc.beneficiary.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-700">{proc.beneficiary}</p>
                                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{proc.unit}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                        <span className="font-mono font-bold text-gray-800">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.value)}
                                        </span>
                                        <button className="text-sm font-bold text-indigo-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                                            Analisar <ChevronRight size={16}/>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* PAINEL 2: MEUS PROCESSOS (AUTO-GESTÃO) */}
                <div className="flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-4 px-1">
                        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shadow-sm">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Meus Processos</h3>
                            <p className="text-xs text-gray-500">Histórico de suas solicitações pessoais</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1">
                        <div className="divide-y divide-gray-100">
                            {myRequests.length === 0 ? (
                                 <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-3 text-indigo-200">
                                        <Plus size={24} />
                                    </div>
                                    <p className="text-sm text-gray-500">Você ainda não criou nenhuma solicitação.</p>
                                    <button 
                                        onClick={() => onNavigate('solicitation_emergency')}
                                        className="mt-4 text-indigo-600 text-sm font-bold hover:underline"
                                    >
                                        Criar primeira solicitação
                                    </button>
                                </div>
                            ) : (
                                myRequests.map(proc => (
                                    <div key={proc.id} onClick={() => onNavigate('process_detail', proc.id)} className="p-5 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${proc.status === 'PAID' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                                {proc.status === 'PAID' ? <Wallet size={20} /> : <FileText size={20} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">{proc.process_number}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{new Date(proc.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <StatusBadge status={proc.status} size="sm" />
                                            <p className="text-[11px] text-gray-400 mt-1 font-mono font-medium">
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
        </div>
    );
};