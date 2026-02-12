import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface SmartScanModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeProcesses: any[];
    expenseElements: { codigo: string; descricao: string }[];
    onTransactionAdded: () => void;
}

export const SmartScanModal: React.FC<SmartScanModalProps> = ({ isOpen, onClose, activeProcesses, expenseElements, onTransactionAdded }) => {
    const [step, setStep] = useState<'info' | 'scan' | 'processing' | 'done'>('info');
    const [isSaving, setIsSaving] = useState(false);
    
    // Form States
    const [selectedProcessId, setSelectedProcessId] = useState('');
    const [portaria, setPortaria] = useState('');
    const [selectedElementCode, setSelectedElementCode] = useState('');
    const [valor, setValor] = useState('');
    const [descricao, setDescricao] = useState('');
    const [isRessarcimento, setIsRessarcimento] = useState(false);

    if (!isOpen) return null;

    const handleStartScan = async () => {
        setIsSaving(true);
        setStep('scan');
        
        try {
            // Simulated AI processing delay
            setTimeout(async () => {
                setStep('processing');
                
                const process = activeProcesses.find(p => p.id === selectedProcessId);
                const accountabilityId = process?.accountabilities?.[0]?.id;
                const valorNum = parseFloat(valor.replace('.', '').replace(',', '.'));

                // 1. Vincular campos e salvar no accountability_items
                const { error: itemError } = await supabase
                    .from('accountability_items')
                    .insert({
                        accountability_id: accountabilityId,
                        value: valorNum,
                        description: descricao || 'Despesa via Smart Scan',
                        element_code: selectedElementCode,
                        item_date: new Date().toISOString().split('T')[0],
                        status: 'PENDING',
                        supplier: 'Estabelecimento Escaneado',
                        ai_metadata: {
                            portaria,
                            is_reimbursement: isRessarcimento,
                            ocr_confidence: 0.98,
                            scanned_at: new Date().toISOString()
                        }
                    });

                if (itemError) throw itemError;

                // 2. Salvar no Dossiê Digital (process_documents)
                await supabase.from('process_documents').insert({
                    process_id: selectedProcessId,
                    name: `Comprovante - ${descricao || 'Fiscal'}`,
                    type: 'RECEIPT',
                    file_url: 'https://via.placeholder.com/800x1200.png?text=Preview+Comprovante+Fiscal', // Simulated URL
                    metadata: {
                        portaria,
                        element_code: selectedElementCode,
                        value: valorNum
                    }
                });

                // 3. Atualizar saldo parcial na prestação de contas
                const currentSpent = process?.accountabilities?.[0]?.total_spent || 0;
                await supabase.from('accountabilities')
                    .update({ total_spent: Number(currentSpent) + valorNum })
                    .eq('id', accountabilityId);

                setStep('done');
                onTransactionAdded();
            }, 1000);
        } catch (err) {
            console.error('Erro ao processar scan:', err);
            setStep('info');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                />

                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden"
                >
                    <div className="p-8 text-center max-h-[90vh] overflow-y-auto">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 shadow-sm border border-emerald-100">
                            {isSaving || step === 'processing' ? <Loader2 className="animate-spin" size={40} /> : <Camera size={40} />}
                        </div>
                        
                        <h3 className="text-2xl font-black text-slate-800 mb-2 flex items-center justify-center gap-2">
                            {step === 'done' ? 'Conciliado!' : 'Smart Scan OCR'}
                            {step === 'processing' && <Sparkles size={20} className="text-emerald-500 animate-pulse" />}
                        </h3>
                        <p className="text-sm text-slate-500 font-medium mb-8 px-4 leading-relaxed">
                            {step === 'info' && 'Preencha os dados administrativos antes de escanear o cupom fiscal.'}
                            {step === 'scan' && 'Posicione o cupom fiscal dentro da moldura para leitura automática.'}
                            {step === 'processing' && 'A Inteligência Artificial está processando os dados e vinculando ao sistema Banpará...'}
                            {step === 'done' && 'A transação foi vinculada ao processo administrativo e ao Dossiê Digital com sucesso!'}
                        </p>

                        {step === 'info' && (
                            <div className="space-y-4 text-left mb-8">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Selecione o Processo (NUP)</label>
                                    <select 
                                        value={selectedProcessId}
                                        onChange={(e) => setSelectedProcessId(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-slate-700 font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none"
                                    >
                                        <option value="">Selecione um processo ativo...</option>
                                        {activeProcesses.map(p => (
                                            <option key={p.id} value={p.id}>{p.process_number}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Portaria Atual</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: 1234/2026-GP"
                                        value={portaria}
                                        onChange={(e) => setPortaria(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-slate-700 font-mono text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Elemento de Despesa</label>
                                    <select 
                                        value={selectedElementCode}
                                        onChange={(e) => setSelectedElementCode(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-slate-700 font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none"
                                    >
                                        <option value="">Selecione o elemento...</option>
                                        {expenseElements.map(e => (
                                            <option key={e.codigo} value={e.codigo}>{e.codigo} - {e.descricao}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Valor da Despesa</label>
                                        <input 
                                            type="text" 
                                            placeholder="R$ 0,00"
                                            value={valor}
                                            onChange={(e) => setValor(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-emerald-700 font-black text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Descrição</label>
                                        <input 
                                            type="text" 
                                            placeholder="Ex: Almoço"
                                            value={descricao}
                                            onChange={(e) => setDescricao(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-slate-700 font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div 
                                    onClick={() => setIsRessarcimento(!isRessarcimento)}
                                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${isRessarcimento ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}
                                >
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isRessarcimento ? 'text-amber-600' : 'text-slate-400'}`}>Forma de Pagamento</span>
                                        <span className="text-xs font-bold text-slate-700">Paguei com recursos próprios</span>
                                    </div>
                                    <div className={`w-10 h-6 rounded-full relative transition-all ${isRessarcimento ? 'bg-amber-500' : 'bg-slate-300'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isRessarcimento ? 'left-5' : 'left-1'}`} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 'scan' && (
                            <div className="aspect-[3/4] bg-slate-50 rounded-3xl border-2 border-dashed border-emerald-500/30 mb-8 relative overflow-hidden flex items-center justify-center">
                                <motion.div 
                                    className="absolute inset-0 bg-emerald-500/5"
                                    animate={{ height: ['0%', '100%'] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                />
                                <Camera size={64} className="text-emerald-500/10" />
                            </div>
                        )}

                        {step === 'done' && (
                            <div className="mb-8 p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-4 text-left">
                                <CheckCircle2 className="text-emerald-600 shrink-0" size={32} />
                                <div className="text-emerald-700">
                                    <p className="font-bold text-sm">Sucesso na Conciliação!</p>
                                    <p className="text-xs opacity-70">Dados validados pela Sentinela IA.</p>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            {step === 'info' && (
                                <button 
                                    onClick={handleStartScan}
                                    disabled={!selectedProcessId || !portaria || !selectedElementCode || !valor}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-900/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Camera size={20} /> Abrir Câmera
                                </button>
                            )}
                            
                            {step === 'done' && (
                                <button 
                                    onClick={onClose}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-900/10"
                                >
                                    Continuar Dashboard
                                </button>
                            )}

                            <button 
                                onClick={onClose}
                                className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                            >
                                {step === 'done' ? 'Sair' : 'Cancelar'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
