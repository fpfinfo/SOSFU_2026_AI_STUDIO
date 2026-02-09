import React, { useState, useRef, useEffect } from 'react';
import { 
    Receipt, Plus, Trash2, Send, AlertTriangle, 
    FileCheck, CheckCircle2, Wallet, Loader2, ScanLine, X, Sparkles, FileText, CloudLightning, PenTool, Ticket, ScrollText, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateFromImage } from '../../lib/gemini';
import { SmartReceiptCapture } from './SmartReceiptCapture';
import { OfflineStatusBanner } from './OfflineStatusBanner';
import { JuriExceptionInlineAlert } from '../ui/JuriExceptionInlineAlert';
import { useOfflineDrafts } from '../../hooks/useOfflineDrafts';
import { Tooltip } from '../ui/Tooltip';

interface AccountabilityWizardProps {
    processId: string;
    accountabilityId: string;
    role: 'USER' | 'GESTOR' | 'SOSFU';
    onClose?: () => void;
    onSuccess: () => void;
    isEmbedded?: boolean;
}

type DocumentType = 'NFE' | 'NFS' | 'CUPOM' | 'RECIBO' | 'BILHETE' | 'OUTROS';

interface ExpenseItem {
    id?: string;
    item_date: string;
    description: string;
    supplier: string;
    doc_number: string;
    element_code: string;
    value: number;
    doc_type: DocumentType;
    receipt_url?: string;
    ai_metadata?: any;
}

// --- COMPONENTES AUXILIARES PARA SUBSTITUIR ALERT/CONFIRM ---

const NotificationToast = ({ type, message, onClose }: { type: 'success' | 'error', message: string, onClose: () => void }) => (
    <div className={`fixed bottom-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 border ${type === 'error' ? 'bg-white border-red-200 text-red-700' : 'bg-gray-900 border-gray-800 text-white'}`}>
        {type === 'error' ? <AlertCircle size={20} className="text-red-600" /> : <CheckCircle2 size={20} className="text-emerald-400" />}
        <p className="text-sm font-bold">{message}</p>
        <button onClick={onClose} className="ml-2 hover:opacity-70"><X size={14}/></button>
    </div>
);

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, isDestructive = false }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-md transition-colors ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---

export const AccountabilityWizard: React.FC<AccountabilityWizardProps> = ({ processId, accountabilityId, role, onClose, onSuccess, isEmbedded = false }) => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Offline drafts
    const { isOnline, syncStatus, pendingCount, saveLocalDraft, loadLocalDraft, markSynced } = useOfflineDrafts(accountabilityId);
    
    const [pcData, setPcData] = useState<any>(null);
    const [items, setItems] = useState<ExpenseItem[]>([]);
    const [grantedValue, setGrantedValue] = useState(0);
    
    // UI States (Substituem alerts nativos)
    const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
    const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, action: () => void, isDestructive?: boolean}>({
        isOpen: false, title: '', message: '', action: () => {}, isDestructive: false
    });

    // Formulário
    const [newItem, setNewItem] = useState<ExpenseItem>({
        item_date: '',
        description: '',
        supplier: '',
        doc_number: '',
        element_code: '3.3.90.30.01',
        value: 0,
        doc_type: 'NFE'
    });

    useEffect(() => {
        fetchData();
    }, [accountabilityId]);

    // Auto-fechar notificações
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const showToast = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: pc, error: pcError } = await supabase
                .from('accountabilities')
                .select(`*, solicitation:solicitation_id (value, process_number, manager_name)`)
                .eq('id', accountabilityId)
                .single();
            
            if (pcError) throw pcError;
            setPcData(pc);
            setGrantedValue(pc.solicitation.value);

            const { data: itemsData } = await supabase
                .from('accountability_items')
                .select('*')
                .eq('accountability_id', accountabilityId)
                .order('item_date');

            setItems(itemsData || []);
        } catch (error: any) {
            console.error(error);
            showToast('error', "Erro ao carregar dados: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    // Smart Capture handler (replaces old handleFileUpload)
    const handleSmartCapture = async (file: File) => {
        setIsAnalyzing(true);
        try {
            const base64Data = await convertFileToBase64(file);
            const base64Content = base64Data.split(',')[1]; 

            const systemPrompt = `
                Analise o comprovante. Retorne JSON estrito:
                {
                    "doc_type": "NFE" | "NFS" | "CUPOM" | "RECIBO" | "BILHETE" | "OUTROS",
                    "date": "YYYY-MM-DD",
                    "supplier_name": "Nome",
                    "doc_number": "Numero",
                    "total_value": 0.00,
                    "description": "Descricao breve"
                }
            `;

            const responseText = await generateFromImage({
                prompt: systemPrompt,
                imageBase64: base64Content,
                mimeType: file.type,
            });

            if (responseText) {
                const data = JSON.parse(responseText);
                setNewItem({
                    ...newItem,
                    doc_type: data.doc_type || 'OUTROS',
                    item_date: data.date || new Date().toISOString().split('T')[0],
                    supplier: data.supplier_name || '',
                    doc_number: data.doc_number || '',
                    value: parseFloat(data.total_value) || 0,
                    description: data.description || '',
                    ai_metadata: { analyzed: true }
                });
                showToast('success', 'Documento lido com sucesso!');
            }
        } catch (error: any) {
            console.error("Erro IA:", error);
            showToast('error', `Erro ao ler documento: ${error?.message || 'Erro desconhecido'}. Preencha manualmente.`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Legacy file input handler (for backwards compat)
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        await handleSmartCapture(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Auto-save drafts offline
    useEffect(() => {
        if (items.length > 0 && accountabilityId) {
            saveLocalDraft(items);
        }
    }, [items, accountabilityId, saveLocalDraft]);

    const handleAddItem = async () => {
        if (!newItem.value || !newItem.item_date || !newItem.supplier) {
            showToast('error', "Preencha Data, Valor e Fornecedor.");
            return;
        }
        
        try {
            const { data, error } = await supabase.from('accountability_items').insert({
                accountability_id: accountabilityId,
                item_date: newItem.item_date,
                description: newItem.description,
                supplier: newItem.supplier,
                doc_number: newItem.doc_number,
                element_code: newItem.element_code,
                value: newItem.value,
                doc_type: newItem.doc_type 
            }).select().single();

            if (error) throw error;

            if (data) {
                setItems([...items, { ...data, doc_type: newItem.doc_type }]);
                setNewItem({ 
                    item_date: '', description: '', supplier: '', doc_number: '', 
                    element_code: '3.3.90.30.01', value: 0, doc_type: 'NFE' 
                });
                showToast('success', 'Comprovante adicionado!');
            }
        } catch (err: any) {
            showToast('error', "Erro ao salvar: " + err.message);
        }
    };

    const requestDeleteItem = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Lançamento',
            message: 'Tem certeza que deseja remover este comprovante? O valor será estornado para o saldo.',
            isDestructive: true,
            action: async () => {
                setConfirmModal(prev => ({...prev, isOpen: false})); // Fecha modal
                try {
                    const { error } = await supabase.from('accountability_items').delete().eq('id', id);
                    if (error) throw error;
                    setItems(prev => prev.filter(i => i.id !== id));
                    showToast('success', 'Item removido.');
                } catch (err: any) {
                    showToast('error', "Erro ao excluir: " + err.message);
                }
            }
        });
    };

    const requestSubmitPC = () => {
        if (items.length === 0) {
            showToast('error', "Adicione pelo menos um comprovante antes de enviar.");
            return;
        }

        const managerName = pcData?.solicitation?.manager_name || 'Gestor';
        
        setConfirmModal({
            isOpen: true,
            title: 'Finalizar e Tramitar',
            message: `Confirma o envio da Prestação de Contas para o Gestor Imediato (${managerName})? Após o envio, você não poderá mais editar os lançamentos.`,
            isDestructive: false,
            action: async () => {
                setConfirmModal(prev => ({...prev, isOpen: false}));
                setSubmitting(true);
                try {
                    const total = items.reduce((acc, i) => acc + i.value, 0);
                    
                    const { error } = await supabase.from('accountabilities').update({ 
                        status: 'WAITING_MANAGER', 
                        total_spent: total,
                        balance: grantedValue - total
                    }).eq('id', accountabilityId);

                    if (error) throw error;
                    onSuccess();
                } catch (e: any) { 
                    showToast('error', 'Erro ao enviar: ' + e.message);
                    setSubmitting(false);
                }
            }
        });
    };

    const getDocTypeInfo = (type: DocumentType) => {
        switch (type) {
            case 'NFE': return { label: 'Nota Fiscal', icon: FileCheck, color: 'text-blue-600', bg: 'bg-blue-50' };
            case 'NFS': return { label: 'Nota Serviço', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' };
            case 'CUPOM': return { label: 'Cupom Fiscal', icon: ScrollText, color: 'text-orange-600', bg: 'bg-orange-50' };
            case 'RECIBO': return { label: 'Recibo', icon: PenTool, color: 'text-gray-600', bg: 'bg-gray-100' };
            default: return { label: 'Outros', icon: Receipt, color: 'text-slate-600', bg: 'bg-slate-50' };
        }
    };

    const totalSpent = items.reduce((acc, curr) => acc + Number(curr.value), 0);
    const balance = grantedValue - totalSpent;
    const SelectedDocIcon = getDocTypeInfo(newItem.doc_type).icon;

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    const canEdit = (role === 'USER' || role === 'GESTOR') && (pcData.status === 'DRAFT' || pcData.status === 'CORRECTION');

    return (
        <div className={`flex flex-col h-full bg-[#F8FAFC] ${isEmbedded ? 'rounded-xl' : ''} relative`}>
            
            {/* Componentes de Overlay */}
            {notification && <NotificationToast type={notification.type} message={notification.message} onClose={() => setNotification(null)} />}
            
            <ConfirmationModal 
                isOpen={confirmModal.isOpen} 
                title={confirmModal.title} 
                message={confirmModal.message} 
                onConfirm={confirmModal.action} 
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                isDestructive={confirmModal.isDestructive}
            />

            {!isEmbedded && (
                <div className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center shadow-sm sticky top-0 z-20">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Sparkles className="text-blue-600" size={24} /> 
                            Prestação de Contas
                        </h2>
                    </div>
                    {onClose && <button onClick={onClose}><X size={20}/></button>}
                </div>
            )}

            <div className="flex-1 overflow-hidden flex flex-col xl:flex-row">
                
                {/* ESQUERDA: Área de Trabalho */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">

                    {/* Offline Status Banner */}
                    <OfflineStatusBanner isOnline={isOnline} syncStatus={syncStatus} pendingCount={pendingCount} />

                    {/* Alert: PC delay > 30 days (Extra-Júri detection) */}
                    {(() => {
                        const grantDate = pcData?.created_at ? new Date(pcData.created_at) : null;
                        const diasDesdeConcessao = grantDate ? Math.floor((Date.now() - grantDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
                        const isJuri = pcData?.solicitation?.process_number?.includes('TJPA-JUR');
                        if (diasDesdeConcessao !== null && diasDesdeConcessao > 30) {
                            return (
                                <JuriExceptionInlineAlert
                                    diasAtraso={diasDesdeConcessao}
                                    userRole={role}
                                />
                            );
                        }
                        return null;
                    })()}

                    {canEdit && (
                        <div className="space-y-6">
                            {/* Smart Receipt Capture (Camera + Crop + AI OCR) */}
                            <SmartReceiptCapture
                                isAnalyzing={isAnalyzing}
                                onCapture={handleSmartCapture}
                                disabled={submitting}
                            />

                            {/* Editor de Lançamento */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-5">
                                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <FileText size={14} /> Dados do Lançamento
                                </h3>
                                
                                <div className="grid grid-cols-12 gap-4 items-end">
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Tipo</label>
                                        <div className="relative">
                                            <select 
                                                value={newItem.doc_type} 
                                                onChange={e => setNewItem({...newItem, doc_type: e.target.value as DocumentType})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 font-medium outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="NFE">Nota Fiscal (NF-e)</option>
                                                <option value="NFS">Nota de Serviço (NFS-e)</option>
                                                <option value="CUPOM">Cupom Fiscal</option>
                                                <option value="RECIBO">Recibo Manual</option>
                                                <option value="BILHETE">Bilhete de Passagem</option>
                                                <option value="OUTROS">Outros</option>
                                            </select>
                                            <SelectedDocIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500" />
                                        </div>
                                    </div>

                                    <div className="col-span-12 md:col-span-4">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Data Emissão</label>
                                        <input 
                                            type="date" 
                                            value={newItem.item_date} 
                                            onChange={e => setNewItem({...newItem, item_date: e.target.value})} 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" 
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Valor Total</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                value={newItem.value} 
                                                onChange={e => setNewItem({...newItem, value: parseFloat(e.target.value)})} 
                                                className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-lg text-sm font-bold text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" 
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">R$</span>
                                        </div>
                                    </div>

                                    <div className="col-span-12 md:col-span-6">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Fornecedor / Razão Social</label>
                                        <input 
                                            type="text" 
                                            value={newItem.supplier} 
                                            onChange={e => setNewItem({...newItem, supplier: e.target.value})} 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder-gray-400" 
                                            placeholder="Nome da empresa ou pessoa" 
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-6">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Descrição do Item</label>
                                        <input 
                                            type="text" 
                                            value={newItem.description} 
                                            onChange={e => setNewItem({...newItem, description: e.target.value})} 
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder-gray-400" 
                                            placeholder="Ex: Almoço, Passagem, Material..." 
                                        />
                                    </div>

                                    <div className="col-span-12 pt-2">
                                        <button 
                                            onClick={handleAddItem} 
                                            className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-black transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform active:scale-95"
                                        >
                                            <Plus size={16} /> Confirmar Lançamento
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Lista de Itens */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Receipt size={14} /> Notas Lançadas
                        </h3>
                        <div className="space-y-3">
                            {items.length === 0 ? (
                                <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
                                    <Receipt size={24} className="mx-auto mb-2 opacity-30"/>
                                    <p className="text-xs">Nenhum comprovante lançado.</p>
                                </div>
                            ) : (
                                items.map((item) => {
                                    const typeInfo = getDocTypeInfo(item.doc_type || 'OUTROS');
                                    return (
                                        <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center hover:border-blue-200 transition-colors">
                                            <div className="flex items-start gap-3">
                                                <div className={`w-8 h-8 ${typeInfo.bg} ${typeInfo.color} rounded-md flex items-center justify-center font-bold text-xs`}>
                                                    <typeInfo.icon size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800 text-sm">{item.description}</p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide">
                                                        {item.supplier} • {(() => {
                                                            const [y, m, d] = item.item_date.split('-').map(Number);
                                                            return new Date(y, m - 1, d).toLocaleDateString();
                                                        })()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className="font-mono font-bold text-gray-800 text-sm">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                                                </p>
                                                {canEdit && (
                                                    <button 
                                                        onClick={() => item.id && requestDeleteItem(item.id)} 
                                                        className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                                                        title="Excluir item"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* DIREITA: Painel de Saldo */}
                <div className="w-full xl:w-80 bg-white border-l border-gray-200 p-6 shadow-sm z-10 flex flex-col">
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-800 mb-4 uppercase text-xs tracking-wider flex items-center gap-2">
                            <Wallet size={14} className="text-blue-600"/> Balanço do Recurso
                        </h3>
                        
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 mb-6">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500 font-medium">Recebido</span>
                                <span className="font-bold text-gray-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grantedValue)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500 font-medium">Gasto</span>
                                <span className="font-bold text-blue-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpent)}</span>
                            </div>
                            <div className="h-px bg-slate-200 my-1"></div>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-700 text-xs">Saldo</span>
                                <span className={`font-bold text-base ${balance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto space-y-2">
                        {canEdit && (
                            <Tooltip content="Enviar a prestação de contas para análise. Ao enviar, você declara veracidade legal dos comprovantes." position="top">
                            <button 
                                onClick={requestSubmitPC} 
                                disabled={submitting}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>} 
                                Finalizar e Enviar
                            </button>
                            </Tooltip>
                        )}
                        <p className="text-center text-[9px] text-gray-400">
                            Ao enviar, você declara veracidade legal.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};