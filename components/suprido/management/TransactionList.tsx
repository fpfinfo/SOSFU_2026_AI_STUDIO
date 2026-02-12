import React from 'react';
import { motion } from 'framer-motion';
import { Fuel, Utensils, Hotel, Car, ArrowRight } from 'lucide-react';

interface Transaction {
    id: string;
    name: string;
    category: 'fuel' | 'food' | 'hotel' | 'uber';
    date: string;
    value: number;
    status: 'regularizado' | 'conciliar';
}

interface TransactionListProps {
    transactions: any[];
    onSelect: (t: any) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, onSelect }) => {
    const categoryLabels: Record<string, string> = {
        fuel: 'P',
        food: 'R',
        hotel: 'H',
        uber: 'U',
        default: 'D'
    };
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Extrato Consolidado
                </h3>
                <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-colors bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Relatório SEFIN</button>
            </div>

            <div className="space-y-3">
                {transactions.map((t, idx) => (
                    <motion.div 
                        key={t.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => onSelect(t)}
                        className="group bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-emerald-50/50 transition-all hover:border-emerald-200 shadow-sm hover:shadow-md"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all font-black text-lg ${t.receipt_url && t.status === 'conciliar' ? 'bg-amber-50 border-amber-200 text-amber-500' : 'bg-white border-slate-200 text-slate-400 group-hover:text-emerald-600 group-hover:border-emerald-500/30'}`}>
                                {t.portaria && t.is_reimbursement ? <span className="text-amber-600">₿</span> : (categoryLabels[t.category as keyof typeof categoryLabels] || categoryLabels.default)}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors flex items-center gap-2">
                                    {t.name}
                                    {t.status === 'regularizado' && <span className="w-2.5 h-2.5 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center text-[6px]">✔</span>}
                                </h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.date}</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 text-right">
                            <span className="text-sm font-black text-slate-900 leading-none">R$ {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            {t.status === 'regularizado' ? (
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider px-2 py-0.5 border border-emerald-500/30 rounded-full bg-emerald-50 leading-none">
                                    Regularizado
                                </span>
                            ) : (
                                <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider px-2 py-0.5 border border-amber-500/30 rounded-full bg-amber-50 leading-none flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-amber-500"></span> Conciliar
                                </span>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
