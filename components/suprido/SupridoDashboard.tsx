import React, { useState, useEffect } from 'react';
import { Siren, Gavel, FileText, Clock, Search, ChevronRight, Loader2, Wallet, AlertTriangle, ArrowRight, Play, CheckCircle2, RotateCcw, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StatusBadge } from '../StatusBadge';

interface SupridoDashboardProps {
    onNavigate: (page: string, processId?: string, accountabilityId?: string) => void;
}

interface ProcessWithPC {
    id: string;
    process_number: string;
    unit: string;
    value: number;
    status: string;
    created_at: string;
    accountabilities?: {
        id: string;
        status: string;
        balance: number;
        deadline: string;
    }[];
}

export const SupridoDashboard: React.FC<SupridoDashboardProps> = ({ onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ receivedYear: 0, inAnalysis: 0, pendingAccountability: 0 });
    const [processes, setProcesses] = useState<ProcessWithPC[]>([]);
    const [filterTerm, setFilterTerm] = useState('');
    const [creatingPC, setCreatingPC] = useState<string | null>(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Busca Solicitações + Status da PC associada (se houver)
            const { data: solicitations, error: solError } = await supabase
                .from('solicitations')
                .select(`
                    *,
                    accountabilities (
                        id,
                        status,
                        balance,
                        deadline
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (solError) throw solError;

            // Stats Logic
            const procs = solicitations as ProcessWithPC[];
            
            const paidProcs = procs.filter(s => s.status === 'PAID');
            const inAnalysis = procs.filter(s => s.status !== 'PAID' && s.status !== 'APPROVED' && s.status !== 'REJECTED');
            
            // Pending PC = Pago mas PC não está aprovada
            const pendingPC = paidProcs.filter(p => {
                const pc = p.accountabilities?.[0];
                return !pc || pc.status !== 'APPROVED';
            });

            setStats({
                receivedYear: paidProcs.reduce((acc, curr) => acc + Number(curr.value), 0),
                inAnalysis: inAnalysis.length,
                pendingAccountability: pendingPC.length,
            });

            setProcesses(procs);

        } catch (error) {
            console.error("Erro ao carregar dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartAccountability = async (processId: string, value: number, existingPC: any) => {
        // Se já existe PC, navega para a aba de PC dentro do detalhe do processo
        if (existingPC) {
            onNavigate('process_accountability', processId, existingPC.id);
            return;
        }

        // Se não existe, cria o Rascunho (DRAFT)
        setCreatingPC(processId);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não logado");

            // Busca dados complementares do processo para preencher a PC
            const { data: process } = await supabase.from('solicitations').select('process_number').eq('id', processId).single();

            // Calcula prazo (Ex: +30 dias)
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 30);

            const { data, error } = await supabase.from('accountabilities').insert({
                process_number: process?.process_number,
                requester_id: user.id,
                solicitation_id: processId,
                value: value,
                total_spent: 0,
                balance: value, // Saldo inicial = Valor recebido
                deadline: deadline.toISOString(),
                status: 'DRAFT'
            }).select('id').single();

            if (error) throw error;

            if (data) {
                // Navega para a aba de Prestação de Contas (unified view)
                onNavigate('process_accountability', processId, data.id);
            }

        } catch (error) {
            console.error(error);
            alert("Erro ao iniciar prestação de contas. Tente novamente.");
        } finally {
            setCreatingPC(null);
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
                        Gerencie suas solicitações de suprimento de fundos, acompanhe aprovações e realize prestações de contas de forma digital.
                    </p>
                </div>
            </div>

            {/* Cards de Atalho */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden" onClick={() => onNavigate('solicitation_emergency')}>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500 mb-4 group-hover:scale-105 transition-transform"><Siren size={24} /></div>
                            <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 rounded uppercase">Urgente</span>
                        </div>
                        <h4 className="text-lg font-bold text-gray-800 mb-1">Extra-Emergencial</h4>
                        <p className="text-sm text-gray-500 mb-4 max-w-xs">Para despesas urgentes e imprevisíveis.</p>
                        <span className="text-xs font-bold text-red-600 flex items-center gap-1 group-hover:gap-2 transition-all">Iniciar Solicitação <ArrowRight size={14} /></span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden" onClick={() => onNavigate('solicitation_jury')}>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 mb-4 group-hover:scale-105 transition-transform"><Gavel size={24} /></div>
                            <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded uppercase">Alimentação</span>
                        </div>
                        <h4 className="text-lg font-bold text-gray-800 mb-1">Extra-Júri</h4>
                        <p className="text-sm text-gray-500 mb-4 max-w-xs">Para custeio de alimentação em sessões do Júri.</p>
                        <span className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:gap-2 transition-all">Iniciar Solicitação <ArrowRight size={14} /></span>
                    </div>
                </div>
            </div>

            {/* Painel de Processos Unificado */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Meus Processos</h3>
                        <p className="text-xs text-gray-500">Histórico de solicitações e status das contas</p>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="text" placeholder="Buscar por número ou objeto..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all" value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} />
                    </div>
                </div>
                
                <div className="divide-y divide-gray-100">
                    {filteredProcesses.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 italic">Nenhum processo encontrado.</div>
                    ) : (
                        filteredProcesses.map((proc) => {
                            const typeInfo = getProcessType(proc.unit);
                            const isPaid = proc.status === 'PAID';
                            const pc = proc.accountabilities?.[0]; // Pega a PC associada (se houver)
                            
                            return (
                                <div key={proc.id} className="p-5 hover:bg-slate-50 transition-colors group flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    {/* Info Principal */}
                                    <div className="flex items-start gap-4 flex-1 cursor-pointer" onClick={() => onNavigate('process_detail', proc.id)}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPaid ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {isPaid ? <Wallet size={20} /> : <FileText size={20} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{proc.process_number}</h4>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${typeInfo.color}`}>{typeInfo.label}</span>
                                            </div>
                                            <div className="text-xs text-gray-500 flex items-center gap-4">
                                                <span>Data: {new Date(proc.created_at).toLocaleDateString()}</span>
                                                <span className="font-semibold text-gray-700">R$ {proc.value}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status e Ações */}
                                    <div className="flex items-center gap-4 justify-end min-w-[200px]">
                                        {!isPaid ? (
                                            <StatusBadge status={proc.status} size="sm" />
                                        ) : (
                                            // Lógica de Botão de Ação para PC
                                            <div className="flex items-center gap-3">
                                                {/* Status da PC */}
                                                {pc ? (
                                                    pc.status === 'APPROVED' ? (
                                                        <span className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded">
                                                            <CheckCircle2 size={14}/> Contas Aprovadas
                                                        </span>
                                                    ) : pc.status === 'WAITING_SOSFU' || pc.status === 'WAITING_MANAGER' ? (
                                                        <span className="flex items-center gap-1 text-blue-600 text-xs font-bold bg-blue-50 px-2 py-1 rounded">
                                                            <Clock size={14}/> Em Análise
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-orange-600 text-xs font-bold bg-orange-50 px-2 py-1 rounded">
                                                            {pc.status === 'CORRECTION' ? <RotateCcw size={14}/> : <FileText size={14}/>}
                                                            {pc.status === 'CORRECTION' ? 'Correção Solicitada' : 'Rascunho'}
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="flex items-center gap-1 text-red-500 text-xs font-bold bg-red-50 px-2 py-1 rounded animate-pulse">
                                                        <AlertTriangle size={14}/> Prestação Pendente
                                                    </span>
                                                )}

                                                {/* Botão de Ação */}
                                                {(!pc || pc.status === 'DRAFT' || pc.status === 'CORRECTION') && (
                                                    <button 
                                                        onClick={() => handleStartAccountability(proc.id, proc.value, pc)}
                                                        disabled={creatingPC === proc.id}
                                                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold shadow-md hover:bg-black transition-all flex items-center gap-2 transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                                                    >
                                                        {creatingPC === proc.id ? <Loader2 className="animate-spin" size={14}/> : (pc ? <Play size={14} fill="currentColor" /> : <Plus size={14}/>)}
                                                        {pc ? 'Continuar PC' : 'Iniciar PC'}
                                                    </button>
                                                )}
                                                
                                                {(pc && (pc.status === 'WAITING_SOSFU' || pc.status === 'APPROVED')) && (
                                                    <button 
                                                        onClick={() => onNavigate('process_detail', proc.id)}
                                                        className="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
                                                    >
                                                        Detalhes
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};