import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Tag, FileText, CheckCircle2, Maximize2 } from 'lucide-react';

interface TransactionDetailProps {
    transaction: any | null;
    onClose: () => void;
}

export const TransactionDetail: React.FC<TransactionDetailProps> = ({ transaction, onClose }) => {
    if (!transaction) return null;

    const categoryLabels = {
        fuel: 'P',
        food: 'R',
        hotel: 'H',
        uber: 'U'
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-lg bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-8 pb-4">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-black text-2xl shadow-sm">
                                {categoryLabels[transaction.category as keyof typeof categoryLabels]}
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900">
                                <X size={24} />
                            </button>
                        </div>

                        <h2 className="text-2xl font-black text-slate-900 mb-1 group flex items-center gap-2">
                            {transaction.name}
                        </h2>
                        <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 opacity-80 mb-8">
                            <MapPin size={12} /> Av. Almirante Barroso, 120 - Belém, PA
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor</p>
                                <p className="text-xl font-black text-slate-900">R$ {transaction.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data</p>
                                <p className="text-xl font-black text-slate-900">{transaction.date}</p>
                            </div>
                        </div>
                    </div>

                    {/* Meta Data */}
                    <div className="p-8 pt-4 space-y-6">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-xs border-y border-slate-100 py-4">
                            <div className="flex flex-col gap-1">
                                <span className="font-bold text-slate-400 uppercase tracking-wider">Processo (NUP)</span>
                                <span className="font-mono text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100">{transaction.process_number || '---'}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="font-bold text-slate-400 uppercase tracking-wider">Portaria</span>
                                <span className="font-mono text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100">{transaction.portaria || '---'}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1 text-xs border-b border-slate-100 pb-4">
                            <span className="font-bold text-slate-400 uppercase tracking-wider">Elemento de Despesa</span>
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                                {transaction.element_descricao || '---'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-4">
                            <span className="font-bold text-slate-400 uppercase tracking-wider">Status Financeiro</span>
                            <span className={`font-black uppercase tracking-widest ${transaction.status === 'regularizado' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {transaction.status}
                            </span>
                        </div>

                        {/* Receipt Area */}
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Comprovante Digital</p>
                            <div className="relative aspect-[4/3] bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden group cursor-zoom-in">
                                <div className="absolute inset-0 flex items-center justify-center opacity-10 bg-gradient-to-br from-emerald-500/20 to-transparent">
                                    {transaction.receipt_url ? (
                                        <img src={transaction.receipt_url} className="w-full h-full object-cover opacity-100" alt="Comprovante" />
                                    ) : (
                                        <FileText size={64} className="text-slate-300" />
                                    )}
                                </div>
                                <div className="absolute inset-0 border-[16px] border-slate-50 rounded-3xl shadow-inner"></div>
                                <div className="absolute bottom-4 left-6 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">
                                    <Maximize2 size={12} /> Clique para expandir
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Status */}
                    {transaction.status === 'regularizado' && (
                        <div className="bg-emerald-50 border-t border-emerald-100 p-6 flex items-center gap-3">
                            <CheckCircle2 className="text-emerald-600" size={24} />
                            <p className="text-sm font-bold text-emerald-800">Esta transação já foi conciliada eletronicamente.</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
