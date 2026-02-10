import React, { useState, useEffect } from 'react';
import { 
    Wallet, Search, ArrowRight, FileCheck, Banknote, Building2, 
    CheckCircle2, AlertCircle, RefreshCw, Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RessarcimentoPaymentsProps {
    onNavigate: (page: string, processId?: string) => void;
}

export const RessarcimentoPayments: React.FC<RessarcimentoPaymentsProps> = ({ onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState<any[]>([]);
    
    // Status filter: WAITING_RESSARCIMENTO_EXECUTION usually
    // But we might want to see all in execution phase
    
    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('solicitations')
                .select('*')
                .or('status.eq.WAITING_RESSARCIMENTO_EXECUTION,status.eq.WAITING_SEFIN_SIGNATURE,status.eq.WAITING_PAYMENT')
                .order('updated_at', { ascending: false });
            
            setPayments(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const StatusStep = ({ active, completed, label, icon: Icon }: any) => (
        <div className={`flex flex-col items-center gap-2 ${active ? 'opacity-100' : completed ? 'opacity-100' : 'opacity-40'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                completed ? 'bg-emerald-500 border-emerald-500 text-white' : 
                active ? 'bg-white border-emerald-500 text-emerald-600 animate-pulse' : 
                'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
                {completed ? <CheckCircle2 size={16} /> : <Icon size={14} />}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${active || completed ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
        </div>
    );

    const ProgressLine = ({ active }: { active: boolean }) => (
        <div className={`flex-1 h-0.5 mt-4 mx-2 ${active ? 'bg-emerald-500' : 'bg-slate-200'}`} />
    );

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                     <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Wallet className="text-emerald-500" /> Fluxo de Pagamentos
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Gestão da fase de execução financeira (NE, DL, OB, Baixa).</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchPayments} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
                        <RefreshCw size={20} />
                    </button>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Filtrar processos..." className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm w-64 focus:ring-2 focus:ring-emerald-200 focus:outline-none" />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="animate-spin text-emerald-600" size={32} />
                </div>
            ) : payments.length === 0 ? (
                 <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                    <Wallet size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-600">Nenhum pagamento pendente</h3>
                    <p className="text-slate-400 text-sm">A fila de execução está limpa.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {payments.map(payment => (
                        <div key={payment.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-all group">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                                        EXEC
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg group-hover:text-emerald-700 transition-colors">{payment.process_number}</h3>
                                        <p className="text-sm text-slate-500">{payment.beneficiary} • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.value)}</p>
                                    </div>
                                </div>
                                <button onClick={() => onNavigate('process_detail', payment.id)} className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-xs hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                                    Gerenciar Execução <ArrowRight size={14} />
                                </button>
                            </div>

                            {/* Execution Pipeline Visualization */}
                            <div className="flex items-start justify-between px-8 relative">
                                {/* This is a visual representation. Logic would depend on document existence/status */}
                                {/* Assuming status mapping for demo purposes */}
                                <StatusStep 
                                    label="Nota de Empenho" 
                                    icon={FileCheck} 
                                    completed={true} // Usually first step 
                                    active={false} 
                                />
                                <ProgressLine active={true} />
                                <StatusStep 
                                    label="Liquidação" 
                                    icon={CheckCircle2} 
                                    completed={payment.status !== 'WAITING_RESSARCIMENTO_EXECUTION'} // e.g. waiting signature
                                    active={payment.status === 'WAITING_RESSARCIMENTO_EXECUTION'} 
                                />
                                <ProgressLine active={payment.status !== 'WAITING_RESSARCIMENTO_EXECUTION'} />
                                <StatusStep 
                                    label="Ordem Bancária" 
                                    icon={Banknote} 
                                    completed={payment.status === 'WAITING_PAYMENT' || payment.status === 'PAID'} 
                                    active={payment.status === 'WAITING_SEFIN_SIGNATURE'} 
                                />
                                <ProgressLine active={payment.status === 'PAID'} />
                                <StatusStep 
                                    label="Baixa SIAFE" 
                                    icon={Building2} 
                                    completed={payment.status === 'PAID'} 
                                    active={payment.status === 'WAITING_PAYMENT'} 
                                />
                            </div>
                            
                            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
                                <span className="flex items-center gap-1.5"><AlertCircle size={12} /> Execução iniciada em {new Date(payment.updated_at).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1.5"><Wallet size={12} /> Fonte: Tesouro PJ</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
