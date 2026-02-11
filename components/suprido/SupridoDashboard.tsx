import React, { useState, useEffect, useCallback } from 'react';
import { Siren, Gavel, FileText, Clock, Search, ChevronRight, Loader2, Wallet, AlertTriangle, ArrowRight, Play, CheckCircle2, RotateCcw, Plus, UserCheck, Shield, Banknote, Receipt, TrendingUp, Plane, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StatusBadge } from '../StatusBadge';
import { Tooltip } from '../ui/Tooltip';
import { SlaCountdown } from '../ui/SlaCountdown';
import { useRealtimeInbox } from '../../hooks/useRealtimeInbox';
import { TimelineCard } from './active-timeline/TimelineCard';
import { SentinelaNudge } from './active-timeline/SentinelaNudge';

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
    const [stats, setStats] = useState({ receivedYear: 0, inAnalysis: 0, pendingAccountability: 0, awaitingConfirmation: 0 });
    const [processes, setProcesses] = useState<ProcessWithPC[]>([]);
    const [filterTerm, setFilterTerm] = useState('');
    const [creatingPC, setCreatingPC] = useState<string | null>(null);
    const [confirmingReceipt, setConfirmingReceipt] = useState<string | null>(null);

    const refetchDashboard = useCallback(() => {
        fetchDashboardData();
    }, []);

    // ⚡ Realtime: auto-refresh when processes are updated for this user
    useRealtimeInbox({
        module: 'GESTOR', // Listen for processes coming back from Gestor
        onAnyChange: refetchDashboard,
    });

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
                        deadline,
                        sentinela_risk,
                        sentinela_alerts
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (solError) throw solError;

            // Stats Logic
            const procs = solicitations as ProcessWithPC[];
            
            const paidProcs = procs.filter(s => s.status === 'PAID');
            const awaitingConf = procs.filter(s => s.status === 'WAITING_SUPRIDO_CONFIRMATION');
            const inAnalysis = procs.filter(s => !['PAID', 'APPROVED', 'REJECTED', 'WAITING_SUPRIDO_CONFIRMATION', 'ARCHIVED'].includes(s.status));
            
            // Pending PC = Pago mas PC não está aprovada
            const pendingPC = paidProcs.filter(p => {
                const pc = p.accountabilities?.[0];
                return !pc || pc.status !== 'APPROVED';
            });

            setStats({
                receivedYear: paidProcs.reduce((acc, curr) => acc + Number(curr.value), 0),
                inAnalysis: inAnalysis.length,
                pendingAccountability: pendingPC.length,
                awaitingConfirmation: awaitingConf.length,
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
            console.error("Erro ao iniciar prestação de contas. Tente novamente.");
        } finally {
            setCreatingPC(null);
        }
    };

    // ─── Inline Confirm Receipt (dashboard shortcut) ───
    const handleInlineConfirmReceipt = async (processId: string, processValue: number) => {
        if (!confirm('Confirmar que você recebeu os recursos em sua conta bancária?')) return;
        setConfirmingReceipt(processId);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const now = new Date().toISOString();

            // 1. Transition solicitation to PAID
            await supabase.from('solicitations').update({ status: 'PAID' }).eq('id', processId);

            // 2. Insert history entry
            await supabase.from('historico_tramitacao').insert({
                solicitation_id: processId,
                status_from: 'WAITING_SUPRIDO_CONFIRMATION',
                status_to: 'PAID',
                actor_name: user.email,
                description: 'Suprido confirmou recebimento dos recursos. Início da fase de Prestação de Contas.',
                created_at: now
            });

            // 3. Auto-create PC if none exists
            const { data: existingPC } = await supabase.from('accountabilities').select('id').eq('solicitation_id', processId).maybeSingle();
            if (!existingPC) {
                const { data: procData } = await supabase.from('solicitations').select('process_number').eq('id', processId).single();
                const deadline = new Date();
                deadline.setDate(deadline.getDate() + 30);

                await supabase.from('accountabilities').insert({
                    process_number: procData?.process_number,
                    requester_id: user.id,
                    solicitation_id: processId,
                    value: processValue,
                    total_spent: 0,
                    balance: processValue,
                    deadline: deadline.toISOString(),
                    status: 'DRAFT'
                });
            }

            await fetchDashboardData();
        } catch (err) {
            console.error('Erro ao confirmar recebimento:', err);
        } finally {
            setConfirmingReceipt(null);
        }
    };

    const getProcessType = (unit: string) => {
        if (unit?.includes('EMERGENCIAL')) return { label: 'EMERGENCIAL', color: 'bg-red-50 text-red-600 border-red-100' };
        if (unit?.includes('JÚRI')) return { label: 'EXTRA-JÚRI', color: 'bg-blue-50 text-blue-600 border-blue-100' };
        return { label: 'ORDINÁRIO', color: 'bg-gray-50 text-gray-600 border-gray-100' };
    };

    const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    const activeProcesses = processes.filter(p => 
        p.status !== 'ARCHIVED' && 
        p.status !== 'REJECTED' &&
        p.accountabilities?.[0]?.status !== 'APPROVED'
    );

    const historyProcesses = processes.filter(p => 
        p.process_number.toLowerCase().includes(filterTerm.toLowerCase()) || 
        p.unit?.toLowerCase().includes(filterTerm.toLowerCase())
    );

    const handleAction = (processId: string, action: string) => {
        const proc = processes.find(p => p.id === processId);
        if (!proc) return;
        const pc = proc.accountabilities?.[0];

        switch(action) {
            case 'CONFIRM_RECEIPT':
                handleInlineConfirmReceipt(processId, proc.value);
                break;
            case 'START_ACCOUNTABILITY':
            case 'FIX_ACCOUNTABILITY':
                handleStartAccountability(processId, proc.value, pc);
                break;
            default:
                onNavigate('process_detail', processId);
        }
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-slate-800" /></div>;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 font-sans">
            


            {/* ═══ Processos Ativos (Timeline Cockpit) ═══ */}
            <div className="mb-12 space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <Clock className="text-sky-600" size={20} /> Processos em Andamento
                        </h3>
                        <p className="text-sm text-slate-500">Ações recomendadas pelo Sentinela IA para agilizar seu fluxo</p>
                    </div>
                </div>

                {activeProcesses.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
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
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300 shadow-sm">
                            <CheckCircle2 size={32} />
                        </div>
                        <h4 className="text-lg font-bold text-slate-800">Tudo em dia!</h4>
                        <p className="text-sm text-slate-500 max-w-xs mx-auto">Você não possui processos com ações pendentes neste momento.</p>
                    </div>
                )}
            </div>

            {/* ═══ Cards de Resumo Financeiro (Premium) ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                <div className="bg-white/70 backdrop-blur-md p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform"><TrendingUp size={16} /></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Executado</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 leading-none tracking-tighter">{formatCurrency(stats.receivedYear)}</p>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium">Total recebido no ano</p>
                </div>
                <div className="bg-white/70 backdrop-blur-md p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-sky-50 rounded-xl text-sky-600 group-hover:scale-110 transition-transform"><Clock size={16} /></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ativos</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 leading-none tracking-tighter">{stats.inAnalysis}</p>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium">Em análise institucional</p>
                </div>
                <div className="bg-white/70 backdrop-blur-md p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-amber-50 rounded-xl text-amber-600 group-hover:scale-110 transition-transform"><Banknote size={16} /></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prazos</span>
                    </div>
                    <p className="text-2xl font-black text-amber-600 leading-none tracking-tighter">{stats.awaitingConfirmation}</p>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium">Confirmação de depósito</p>
                </div>
                <div className="bg-white/70 backdrop-blur-md p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-red-50 rounded-xl text-red-600 group-hover:scale-110 transition-transform"><Receipt size={16} /></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alertas</span>
                    </div>
                    <p className="text-2xl font-black text-red-600 leading-none tracking-tighter">{stats.pendingAccountability}</p>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium">Prestações com pendência</p>
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
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden" onClick={() => onNavigate('solicitation_diarias')}>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 mb-4 group-hover:scale-105 transition-transform"><Plane size={24} /></div>
                            <span className="bg-sky-50 text-sky-600 text-[10px] font-bold px-2 py-1 rounded uppercase">Deslocamento</span>
                        </div>
                        <h4 className="text-lg font-bold text-gray-800 mb-1">Diárias e Passagens</h4>
                        <p className="text-sm text-gray-500 mb-4 max-w-xs">Para deslocamentos a serviço com diárias e passagens aéreas.</p>
                        <span className="text-xs font-bold text-sky-600 flex items-center gap-1 group-hover:gap-2 transition-all">Iniciar Solicitação <ArrowRight size={14} /></span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden" onClick={() => onNavigate('solicitation_ressarcimento')}>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-500 mb-4 group-hover:scale-105 transition-transform"><ShieldCheck size={24} /></div>
                            <span className="bg-teal-50 text-teal-600 text-[10px] font-bold px-2 py-1 rounded uppercase">Reembolso</span>
                        </div>
                        <h4 className="text-lg font-bold text-gray-800 mb-1">Ressarcimento</h4>
                        <p className="text-sm text-gray-500 mb-4 max-w-xs">Para ressarcimento de despesas realizadas com recursos próprios.</p>
                        <span className="text-xs font-bold text-teal-600 flex items-center gap-1 group-hover:gap-2 transition-all">Iniciar Solicitação <ArrowRight size={14} /></span>
                    </div>
                </div>
            </div>

            {/* Histórico/Monitoramento de Processos */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-black text-slate-800">Monitoramento de Processos</h3>
                        <p className="text-xs text-slate-500 tracking-wide">Acompanhe o fluxo de tramitação de todas as suas solicitações</p>
                    </div>
                    <div className="relative w-full md:w-80">
                        <label htmlFor="process-search-input" className="sr-only">Buscar NUP ou Unidade</label>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            id="process-search-input"
                            type="text" 
                            placeholder="Buscar NUP ou Unidade..." 
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none transition-all" 
                            value={filterTerm} 
                            onChange={(e) => setFilterTerm(e.target.value)} 
                        />
                    </div>
                </div>
                
                <div className="divide-y divide-slate-50">
                    {historyProcesses.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 italic font-medium">Você ainda não possui solicitações registradas.</div>
                    ) : (
                        historyProcesses.map((proc) => {
                            const typeInfo = getProcessType(proc.unit);
                            return (
                                <div key={proc.id} className="p-5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h4 className="text-sm font-bold text-slate-700">{proc.process_number}</h4>
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${typeInfo.color}`}>{typeInfo.label}</span>
                                            </div>
                                            <div className="text-[11px] text-slate-500 flex items-center gap-3">
                                                <span>Finalizado em {new Date(proc.created_at).toLocaleDateString()}</span>
                                                <span className="font-bold text-slate-600">{formatCurrency(proc.value)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => onNavigate('process_detail', proc.id)}
                                        className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
