import React, { useState, useEffect, useMemo } from 'react';
import {
    Scale, Users, DollarSign, Calculator, CheckCircle2, Save,
    Loader2, X, AlertTriangle, ArrowRight, ChevronDown, ChevronUp,
    Shield, Send, FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { JuriExceptionInlineAlert } from '../ui/JuriExceptionInlineAlert';

// ==================== TYPES ====================

interface JuriReviewPanelProps {
    solicitacaoId: string;
    onClose: () => void;
    onSave: () => void;
}

interface ParticipantItem {
    id: string;
    item_name: string;
    qty_requested: number;
    qty_approved: number;
}

interface ExpenseItem {
    id: string;
    item_name: string;
    element_code: string;
    qty_requested: number;
    unit_price_requested: number;
    qty_approved: number;
    unit_price_approved: number;
    total_requested: number;
    total_approved: number;
}

interface SolicitationData {
    id: string;
    process_number: string;
    beneficiary: string;
    unit: string;
    value: number;
    status: string;
    event_start_date: string;
    event_end_date: string;
}

// ==================== HELPERS ====================

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// ==================== MAIN COMPONENT ====================

export const JuriReviewPanel: React.FC<JuriReviewPanelProps> = ({
    solicitacaoId,
    onClose,
    onSave
}) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [solicitacao, setSolicitacao] = useState<SolicitationData | null>(null);
    const [participants, setParticipants] = useState<ParticipantItem[]>([]);
    const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
    const [showExpenses, setShowExpenses] = useState(true);
    const [showParticipants, setShowParticipants] = useState(true);
    const [actionType, setActionType] = useState<'save' | 'diligenciar' | 'aprovar' | null>(null);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch solicitation header
                const { data: sol, error: solError } = await supabase
                    .from('solicitations')
                    .select('*')
                    .eq('id', solicitacaoId)
                    .single();

                if (solError) throw solError;
                setSolicitacao(sol);

                // 2. Fetch items (participants + expenses)
                const { data: items, error: itemsError } = await supabase
                    .from('solicitation_items')
                    .select('*')
                    .eq('solicitation_id', solicitacaoId)
                    .order('created_at');

                if (itemsError) throw itemsError;

                const participantItems: ParticipantItem[] = [];
                const expenseItems: ExpenseItem[] = [];

                (items || []).forEach((item: any) => {
                    if (item.category === 'PARTICIPANT') {
                        participantItems.push({
                            id: item.id,
                            item_name: item.item_name,
                            qty_requested: item.qty_requested || 0,
                            qty_approved: item.qty_approved || 0
                        });
                    } else if (item.category === 'EXPENSE') {
                        const unitPriceReq = item.unit_price_requested || 0;
                        const unitPriceAppr = item.unit_price_approved || unitPriceReq;
                        const qtyReq = item.qty_requested || 0;
                        const qtyAppr = item.qty_approved || 0;
                        expenseItems.push({
                            id: item.id,
                            item_name: item.item_name,
                            element_code: item.element_code || '',
                            qty_requested: qtyReq,
                            unit_price_requested: unitPriceReq,
                            qty_approved: qtyAppr,
                            unit_price_approved: unitPriceAppr,
                            total_requested: qtyReq * unitPriceReq,
                            total_approved: qtyAppr * unitPriceAppr
                        });
                    }
                });

                setParticipants(participantItems);
                setExpenses(expenseItems);
            } catch (err) {
                console.error('[JuriReviewPanel] Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [solicitacaoId]);

    // Computed totals
    const totalRequested = useMemo(() =>
        expenses.reduce((acc, e) => acc + e.total_requested, 0), [expenses]);

    const totalApproved = useMemo(() =>
        expenses.reduce((acc, e) => acc + e.total_approved, 0), [expenses]);

    const totalParticipantsRequested = useMemo(() =>
        participants.reduce((acc, p) => acc + p.qty_requested, 0), [participants]);

    const totalParticipantsApproved = useMemo(() =>
        participants.reduce((acc, p) => acc + p.qty_approved, 0), [participants]);

    // Helper: sync meal/lanche expenses with a given participant total
    const syncExpensesWithParticipants = (newTotal: number) => {
        setExpenses(prev => prev.map(e => {
            const name = e.item_name.toLowerCase();
            const isMeal = name.includes('refei') || name.includes('almo') || name.includes('jantar') || name.includes('lanche');
            if (!isMeal) return e;
            const updated = { ...e, qty_approved: newTotal };
            updated.total_approved = updated.qty_approved * updated.unit_price_approved;
            return updated;
        }));
    };

    // Check for police exception
    const policeItem = participants.find(p =>
        p.item_name.toLowerCase().includes('polic') || p.item_name.toLowerCase().includes('escolta')
    );
    const policeCount = policeItem?.qty_approved || policeItem?.qty_requested || 0;

    // --- Handlers ---

    const handleParticipantChange = (id: string, newQty: number) => {
        const updatedParticipants = participants.map(p =>
            p.id === id ? { ...p, qty_approved: Math.max(0, newQty) } : p
        );
        setParticipants(updatedParticipants);
        // Recalculate total and sync expenses
        const newTotal = updatedParticipants.reduce((acc, p) => acc + p.qty_approved, 0);
        syncExpensesWithParticipants(newTotal);
    };

    const handleExpenseChange = (id: string, field: 'qty_approved' | 'unit_price_approved', value: number) => {
        setExpenses(prev =>
            prev.map(e => {
                if (e.id !== id) return e;
                const updated = { ...e, [field]: Math.max(0, value) };
                updated.total_approved = updated.qty_approved * updated.unit_price_approved;
                return updated;
            })
        );
    };

    const handleAutoApproveAll = () => {
        setParticipants(prev =>
            prev.map(p => ({ ...p, qty_approved: p.qty_requested }))
        );
        setExpenses(prev =>
            prev.map(e => ({
                ...e,
                qty_approved: e.qty_requested,
                unit_price_approved: e.unit_price_requested,
                total_approved: e.qty_requested * e.unit_price_requested
            }))
        );
    };

    const handleSave = async (type: 'save' | 'diligenciar' | 'aprovar') => {
        setSaving(true);
        setActionType(type);

        try {
            // 1. Update each participant item
            for (const p of participants) {
                const { error } = await supabase
                    .from('solicitation_items')
                    .update({ qty_approved: p.qty_approved })
                    .eq('id', p.id);
                if (error) throw error;
            }

            // 2. Update each expense item
            for (const e of expenses) {
                const { error } = await supabase
                    .from('solicitation_items')
                    .update({
                        qty_approved: e.qty_approved,
                        unit_price_approved: e.unit_price_approved
                    })
                    .eq('id', e.id);
                if (error) throw error;
            }

            // 3. Update solicitation header
            const updates: any = {
                updated_at: new Date().toISOString()
            };

            if (type === 'aprovar') {
                updates.value = totalApproved;
                updates.status = 'WAITING_SEFIN_SIGNATURE';
            } else if (type === 'diligenciar') {
                updates.status = 'WAITING_CORRECTION';
            }

            const { error } = await supabase
                .from('solicitations')
                .update(updates)
                .eq('id', solicitacaoId);

            if (error) throw error;

            onSave();
        } catch (err) {
            console.error('[JuriReviewPanel] Save error:', err);
        } finally {
            setSaving(false);
            setActionType(null);
        }
    };

    // --- Loading State ---
    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-12 flex flex-col items-center gap-4 shadow-2xl">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-sm font-bold text-slate-600">Carregando dados da solicitação...</p>
                </div>
            </div>
        );
    }

    if (!solicitacao) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-12 flex flex-col items-center gap-4 shadow-2xl">
                    <AlertTriangle className="w-10 h-10 text-red-500" />
                    <p className="text-sm font-bold text-slate-600">Solicitação não encontrada.</p>
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 rounded-lg text-sm font-bold">Fechar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* ===== HEADER ===== */}
                <div className="bg-[#0f172a] text-white p-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-xl">
                            <Scale size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight">Análise Extra-Júri</h2>
                            <p className="text-xs text-slate-400">
                                {solicitacao.process_number} — {solicitacao.beneficiary}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleAutoApproveAll}
                            className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-500/30 transition-all flex items-center gap-1.5"
                        >
                            <CheckCircle2 size={14} /> Aprovar Tudo
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* ===== BODY ===== */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Summary cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Período do Evento</p>
                            <p className="text-sm font-bold text-blue-800">
                                {solicitacao.event_start_date
                                    ? `${new Date(solicitacao.event_start_date).toLocaleDateString('pt-BR')} — ${new Date(solicitacao.event_end_date).toLocaleDateString('pt-BR')}`
                                    : 'N/A'
                                }
                            </p>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Total Solicitado</p>
                            <p className="text-lg font-black text-amber-800">{formatCurrency(totalRequested)}</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Aprovado</p>
                            <p className="text-lg font-black text-emerald-800">{formatCurrency(totalApproved)}</p>
                        </div>
                    </div>

                    {/* Exception alert (police) */}
                    {policeCount > 5 && (
                        <JuriExceptionInlineAlert
                            policiais={policeCount}
                            userRole="SOSFU"
                        />
                    )}

                    {/* ===== PARTICIPANTS SECTION ===== */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <button
                            onClick={() => setShowParticipants(!showParticipants)}
                            className="w-full p-4 flex justify-between items-center bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Users size={18} className="text-blue-600" />
                                <div className="text-left">
                                    <h3 className="text-sm font-bold text-slate-800">Participantes</h3>
                                    <p className="text-[10px] text-slate-500">
                                        {totalParticipantsRequested} solicitados · {totalParticipantsApproved} aprovados
                                    </p>
                                </div>
                            </div>
                            {showParticipants ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                        </button>

                        {showParticipants && (
                            <div className="divide-y divide-slate-50">
                                {participants.map(p => (
                                    <div key={p.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                        <span className="text-sm font-bold text-slate-700 w-1/3">{p.item_name}</span>
                                        <div className="flex items-center gap-8">
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Solicitado</p>
                                                <div className="w-20 py-1.5 bg-slate-100 rounded text-center font-bold text-sm text-slate-600">
                                                    {p.qty_requested}
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Aprovado</p>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={p.qty_approved}
                                                    onChange={e => handleParticipantChange(p.id, parseInt(e.target.value) || 0)}
                                                    className="w-20 py-1.5 border border-emerald-200 bg-emerald-50 rounded text-center font-bold text-sm text-emerald-700 focus:ring-2 focus:ring-emerald-300 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {/* Totals row */}
                                <div className="px-6 py-3 flex items-center justify-between bg-blue-50 border-t border-blue-100">
                                    <span className="text-sm font-black text-blue-700 flex items-center gap-2">
                                        <Users size={16} /> Total de Pessoas
                                    </span>
                                    <div className="flex items-center gap-8">
                                        <div className="w-20 text-center font-bold text-blue-700">{totalParticipantsRequested}</div>
                                        <div className="w-20 text-center font-black text-emerald-700">{totalParticipantsApproved}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ===== EXPENSES SECTION ===== */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <button
                            onClick={() => setShowExpenses(!showExpenses)}
                            className="w-full p-4 flex justify-between items-center bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Calculator size={18} className="text-emerald-600" />
                                <div className="text-left">
                                    <h3 className="text-sm font-bold text-slate-800">Projeção de Custos</h3>
                                    <p className="text-[10px] text-slate-500">
                                        {formatCurrency(totalRequested)} solicitado · {formatCurrency(totalApproved)} aprovado
                                    </p>
                                </div>
                            </div>
                            {showExpenses ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                        </button>

                        {showExpenses && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Descrição</th>
                                            <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 w-40">Elemento</th>
                                            <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center w-20">Qtd Sol.</th>
                                            <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center w-24">Vl.Unit Sol.</th>
                                            <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-emerald-500 text-center w-20">Qtd Apr.</th>
                                            <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-emerald-500 text-center w-24">Vl.Unit Apr.</th>
                                            <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right w-28">Total Sol.</th>
                                            <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-emerald-500 text-right w-28">Total Apr.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {expenses.map(e => (
                                            <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3 font-bold text-slate-700">{e.item_name}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                                                        {e.element_code}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center text-slate-600 font-medium">{e.qty_requested}</td>
                                                <td className="px-4 py-3 text-center text-slate-600 font-medium">{formatCurrency(e.unit_price_requested)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={e.qty_approved}
                                                        onChange={ev => handleExpenseChange(e.id, 'qty_approved', parseInt(ev.target.value) || 0)}
                                                        className="w-16 py-1 border border-emerald-200 bg-emerald-50 rounded text-center font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-300 outline-none"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="relative inline-block">
                                                        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-emerald-400 text-[10px]">R$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min={0}
                                                            value={e.unit_price_approved}
                                                            onChange={ev => handleExpenseChange(e.id, 'unit_price_approved', parseFloat(ev.target.value) || 0)}
                                                            className="w-20 py-1 pl-5 border border-emerald-200 bg-emerald-50 rounded text-right font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-300 outline-none"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-slate-600">
                                                    {formatCurrency(e.total_requested)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-black text-emerald-700">
                                                    {formatCurrency(e.total_approved)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-emerald-50 border-t border-emerald-100">
                                            <td colSpan={6} className="px-4 py-3 text-right">
                                                <span className="text-xs font-black text-emerald-700 uppercase tracking-widest flex items-center justify-end gap-2">
                                                    <DollarSign size={14} /> Total Geral
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-bold text-slate-600">
                                                {formatCurrency(totalRequested)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-lg font-black text-emerald-700">
                                                {formatCurrency(totalApproved)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Variance indicator */}
                    {totalApproved > 0 && totalApproved !== totalRequested && (
                        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-xs font-bold ${
                            totalApproved < totalRequested
                                ? 'bg-amber-50 border border-amber-200 text-amber-700'
                                : 'bg-red-50 border border-red-200 text-red-700'
                        }`}>
                            <AlertTriangle size={14} />
                            Variação: {formatCurrency(totalApproved - totalRequested)} ({
                                ((totalApproved / totalRequested - 1) * 100).toFixed(1)
                            }%)
                        </div>
                    )}
                </div>

                {/* ===== FOOTER / ACTIONS ===== */}
                <div className="border-t border-slate-200 bg-slate-50 p-4 flex justify-between items-center shrink-0">
                    <button
                        onClick={onClose}
                        title="Fecha o painel sem salvar nenhuma alteração. Nenhum dado será modificado."
                        className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                        Cancelar
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleSave('save')}
                            disabled={saving}
                            title="Salva os ajustes de participantes e custos sem alterar o status do processo. Use para revisar antes de decidir."
                            className="px-5 py-2.5 bg-white border border-blue-200 text-blue-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving && actionType === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Salvar Ajustes
                        </button>
                        <button
                            onClick={() => { if (confirm('Confirma a devolução do processo para correção pelo Suprido?')) handleSave('diligenciar'); }}
                            disabled={saving}
                            title="Devolve o processo ao Suprido para correção de pendências ou documentação complementar."
                            className="px-5 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-amber-100 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving && actionType === 'diligenciar' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            Diligenciar
                        </button>
                        <button
                            onClick={() => { if (confirm(`Confirma a aprovação e encaminhamento para autorização SEFIN no valor de ${formatCurrency(totalApproved)}?`)) handleSave('aprovar'); }}
                            disabled={saving || totalApproved === 0}
                            title="Aprova a solicitação com os valores ajustados e encaminha para assinatura do Ordenador de Despesa (SEFIN)."
                            className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
                        >
                            {saving && actionType === 'aprovar' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            Aprovar e Conceder
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JuriReviewPanel;
