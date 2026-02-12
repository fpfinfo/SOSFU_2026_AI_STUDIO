import React, { useState, useEffect, useCallback } from 'react';
import { Siren, Gavel, FileText, Clock, Search, ChevronRight, Loader2, Wallet, AlertTriangle, ArrowRight, Play, CheckCircle2, RotateCcw, Plus, UserCheck, Shield, Banknote, Receipt, TrendingUp, Plane, ShieldCheck, LayoutDashboard, ChevronDown, Camera, Sparkles, CreditCard as CardIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StatusBadge } from '../StatusBadge';
import { Tooltip } from '../ui/Tooltip';
import { SlaCountdown } from '../ui/SlaCountdown';
import { useRealtimeInbox } from '../../hooks/useRealtimeInbox';
import { TimelineCard } from './active-timeline/TimelineCard';
import { SentinelaNudge } from './active-timeline/SentinelaNudge';
import { CreditCard } from './management/CreditCard';
import { SpendingChart } from './management/SpendingChart';
import { TransactionList } from './management/TransactionList';
import { TransactionDetail } from './management/TransactionDetail';
import { SmartScanModal } from './management/SmartScanModal';
import { motion } from 'framer-motion';

interface SupridoDashboardProps {
    onNavigate: (page: string, processId?: string, accountabilityId?: string) => void;
    userProfile?: any;
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
        total_spent: number;
        deadline: string;
    }[];
}

interface Stats {
    receivedYear: number;
    totalSpent: number;
    inAnalysis: number;
    pendingAccountability: number;
    awaitingConfirmation: number;
    totalReimbursement: number; // Added totalReimbursement to stats interface
}

export const SupridoDashboard: React.FC<SupridoDashboardProps> = ({ onNavigate, userProfile }) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats>({ receivedYear: 0, totalSpent: 0, inAnalysis: 0, pendingAccountability: 0, awaitingConfirmation: 0, totalReimbursement: 0 }); // Initialized totalReimbursement
    const [processes, setProcesses] = useState<ProcessWithPC[]>([]);
    const [creatingPC, setCreatingPC] = useState<string | null>(null);
    const [confirmingReceipt, setConfirmingReceipt] = useState<string | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
    const [isScanOpen, setIsScanOpen] = useState(false);
    const [expenseElements, setExpenseElements] = useState<{codigo: string, descricao: string}[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);

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
                        total_spent,
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
            
            // Busca Elementos de Despesa
            const { data: elements } = await supabase
                .from('delemento')
                .select('codigo, descricao')
                .eq('is_active', true)
                .order('codigo');
            
            if (elements) setExpenseElements(elements);

            // Busca Transações (Itens de Prestação) de todos os processos do usuário
            const solicitationIds = procs.map(p => p.id);
            const { data: items } = await supabase
                .from('accountability_items')
                .select(`
                    *,
                    accountabilities (
                        process_number,
                        solicitation_id,
                        solicitations (id, process_number)
                    )
                `)
                .in('accountabilities.solicitation_id', solicitationIds)
                .order('created_at', { ascending: false });

            if (items) {
                const formattedItems = items.map(item => ({
                    id: item.id,
                    name: item.supplier || item.description,
                    category: item.element_code?.startsWith('3.3.90.30') ? 'fuel' : 'hotel',
                    date: new Date(item.item_date || item.created_at).toLocaleDateString('pt-BR'),
                    value: Number(item.value),
                    status: item.status === 'APPROVED' ? 'regularizado' : 'conciliar',
                    receipt_url: item.receipt_url,
                    process_number: item.accountabilities?.process_number,
                    portaria: item.ai_metadata?.portaria,
                    is_reimbursement: item.ai_metadata?.is_reimbursement,
                    element_descricao: elements?.find((e: any) => e.codigo === item.element_code)?.descricao || item.element_code
                }));
                setTransactions(formattedItems);

                // Gerar dados para o gráfico (Opção C: Recebido vs Gasto)
                const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                const historyMap: Record<string, { name: string, recebido: number, gasto: number }> = {};

                // Inicializar últimos 6 meses
                for (let i = 5; i >= 0; i--) {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const monthName = monthNames[d.getMonth()];
                    historyMap[monthName] = { name: monthName, recebido: 0, gasto: 0 };
                }

                // Somar recebidos
                paidProcs.forEach(p => {
                    const month = monthNames[new Date(p.created_at).getMonth()];
                    if (historyMap[month]) historyMap[month].recebido += Number(p.value);
                });

                // Somar gastos
                items.forEach(item => {
                    const month = monthNames[new Date(item.item_date || item.created_at).getMonth()];
                    if (historyMap[month]) historyMap[month].gasto += Number(item.value);
                });

                setChartData(Object.values(historyMap));
            }

            // Cálculo de Ressarcimentos
            const reimbursementTotal = items
                ? items
                    .filter((item: any) => item.ai_metadata?.is_reimbursement)
                    .reduce((acc: number, curr: any) => acc + Number(curr.value || 0), 0)
                : 0;

            const totalReceived = paidProcs.reduce((acc, curr) => acc + Number(curr.value), 0);
            const totalSpent = procs.reduce((acc, curr) => {
                const pcSpent = curr.accountabilities?.reduce((a, c) => a + Number(c.total_spent || 0), 0) || 0;
                return acc + pcSpent;
            }, 0);

            setStats({
                receivedYear: totalReceived,
                totalSpent: totalSpent,
                totalReimbursement: reimbursementTotal,
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
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 font-sans relative">
            
            {/* ═══ Toolbar Local (Suprido) ═══ */}
            <div className="sticky top-0 z-[40] -mx-6 px-6 py-3 mb-8 bg-[#F8FAFC]/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
                        <UserCheck size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-slate-800 leading-none">Cockpit do Suprido</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Módulo de Execução</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 relative">
                    {/* Botão Formulários */}
                    <button 
                        onClick={() => onNavigate('suprido_forms')}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:border-teal-500 hover:text-teal-600 transition-all flex items-center gap-2"
                    >
                        <FileText size={14} /> Formulários
                    </button>

                    {/* Botão Processos */}
                    <button 
                        onClick={() => onNavigate('suprido_processes')}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:border-sky-500 hover:text-sky-600 transition-all flex items-center gap-2 relative"
                    >
                        <Clock size={14} /> Processos
                        {activeProcesses.length > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white font-black">{activeProcesses.length}</span>}
                    </button>
                </div>
            </div>


            {/* Dashboard Alerts (Nudges) - Movidos para fora da lista para destaque se houverem processos de risco */}
            <div className="mb-8 space-y-4">
                {activeProcesses.filter(p => p.accountabilities?.[0]?.sentinela_risk).map(proc => (
                    <SentinelaNudge 
                        key={`nudge-${proc.id}`}
                        risk={proc.accountabilities![0].sentinela_risk} 
                        alerts={proc.accountabilities![0].sentinela_alerts} 
                    />
                ))}
            </div>

            {/* ═══ Painel de Gestão Integrado (Fintech Mode Clean) ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT COLUMN - 4/12 */}
                <div className="lg:col-span-4 space-y-8">
                    <CreditCard userName={userProfile?.full_name} />

                    {/* Conciliação Card */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 relative overflow-hidden group shadow-sm transition-shadow hover:shadow-md">
                        <div className="absolute top-0 right-0 p-6 opacity-5 text-emerald-600 group-hover:scale-110 group-hover:opacity-10 transition-all">
                            <Sparkles size={40} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                            <span className="p-2 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100"><Camera size={16} /></span>
                            Conciliação Inteligente
                        </h3>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-6 px-1">2 Notas pendentes</p>
                        
                        <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
                            Utilize a IA para ler seus comprovantes e vincular automaticamente às transações do cartão Banpará.
                        </p>

                        <button 
                            onClick={() => setIsScanOpen(true)}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-900/10 active:scale-[0.98]"
                        >
                            <Camera size={20} /> Escanear Comprovante (IA)
                        </button>
                    </div>

                    {/* Saldo Card */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disponível para Gastos</span>
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-emerald-600 border border-slate-100 shadow-inner">
                                <CardIcon size={20} />
                            </div>
                        </div>
                        <div className="mb-8">
                            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">R$ {(stats.receivedYear - stats.totalSpent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Uso de recursos</span>
                                <span className="text-[10px] font-bold text-slate-700 leading-none"><span className="text-emerald-600">R$ {stats.totalSpent.toLocaleString('pt-BR')}</span> de R$ {stats.receivedYear.toLocaleString('pt-BR')}</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5 shadow-inner">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(stats.totalSpent / (stats.receivedYear || 1)) * 100}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="h-full bg-emerald-600 rounded-full shadow-[0_0_10px_rgba(5,150,105,0.2)]" 
                                />
                            </div>
                        </div>

                        {/* REIMBURSEMENT CARD */}
                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm transition-shadow hover:shadow-md h-full flex flex-col justify-between group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-amber-50 rounded-xl text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all">
                                    <Sparkles size={16} />
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">A Ressarcir</p>
                                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">R$ {stats.totalReimbursement.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                                <div className="mt-4 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Créditos recurso próprio</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN - 8/12 */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Gráfico Section */}
                    <div className="h-[420px]">
                        <SpendingChart data={chartData} />
                    </div>

                    {/* Transaction List Part */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
                        <TransactionList transactions={transactions} onSelect={setSelectedTransaction} />
                    </div>
                </div>
            </div>

            {/* Modals Transplants */}
            <TransactionDetail 
                transaction={selectedTransaction} 
                onClose={() => setSelectedTransaction(null)} 
            />

            <SmartScanModal 
                isOpen={isScanOpen} 
                onClose={() => setIsScanOpen(false)}
                activeProcesses={activeProcesses}
                expenseElements={expenseElements}
                onTransactionAdded={refetchDashboard}
            />
        </div>
    );
};
