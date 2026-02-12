import React, { useState, useRef, useEffect } from 'react';
import { 
    Receipt, Plus, Trash2, Send, AlertTriangle, 
    FileCheck, CheckCircle2, Wallet, Loader2, ScanLine, X, Sparkles, FileText, CloudLightning, PenTool, Ticket, ScrollText, AlertCircle, Plane, UserCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateWithParts } from '../../lib/aiService';
import { SmartReceiptCapture } from './SmartReceiptCapture';
import { OfflineStatusBanner } from './OfflineStatusBanner';
import { JuriExceptionInlineAlert } from '../ui/JuriExceptionInlineAlert';
import { useOfflineDrafts } from '../../hooks/useOfflineDrafts';
import { useExpenseElements } from '../../hooks/useExpenseElements';
import { Tooltip } from '../ui/Tooltip';

interface AccountabilityWizardProps {
    processId: string;
    accountabilityId: string;
    role: 'USER' | 'GESTOR' | 'SOSFU';
    onClose?: () => void;
    onSuccess: () => void;
    isEmbedded?: boolean;
    darkMode?: boolean;
}

type DocumentType = 'NFE' | 'NFS' | 'CUPOM' | 'RECIBO' | 'BILHETE' | 'BOARDING_PASS' | 'REPORT' | 'OUTROS';

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
    prestador_pf_dados?: {
        cpf_cnpj: string;
        rg?: string;
        pis_nit?: string;
        endereco?: string;
        tipo_servico?: string;
    };
    inss_retido?: number;
    iss_retido?: number;
    valor_liquido?: number;
}

// --- COMPONENTES AUXILIARES PARA SUBSTITUIR ALERT/CONFIRM ---

const NotificationToast = ({ type, message, onClose, darkMode = false }: { type: 'success' | 'error', message: string, onClose: () => void, darkMode?: boolean }) => (
    <div className={`fixed bottom-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 border ${
        type === 'error' 
        ? (darkMode ? 'bg-slate-800 border-red-900/50 text-red-400' : 'bg-white border-red-200 text-red-700') 
        : (darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-gray-900 border-gray-800 text-white')
    }`}>
        {type === 'error' ? <AlertCircle size={20} className="text-red-600" /> : <CheckCircle2 size={20} className="text-emerald-400" />}
        <p className="text-sm font-bold">{message}</p>
        <button onClick={onClose} className="ml-2 hover:opacity-70"><X size={14}/></button>
    </div>
);

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, isDestructive = false, darkMode = false }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 border`}>
                <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-slate-100' : 'text-gray-900'}`}>{title}</h3>
                <p className={`text-sm mb-6 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}`}>
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

export const AccountabilityWizard: React.FC<AccountabilityWizardProps> = ({ processId, accountabilityId, role, onClose, onSuccess, isEmbedded = false, darkMode = false }) => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Offline drafts
    const { isOnline, syncStatus, pendingCount, saveLocalDraft, loadLocalDraft, markSynced } = useOfflineDrafts(accountabilityId);
    
    // Dynamic Expense Elements
    const { elements: expenseElements } = useExpenseElements();
    
    const [pcData, setPcData] = useState<any>(null);
    const [items, setItems] = useState<ExpenseItem[]>([]);
    const [grantedValue, setGrantedValue] = useState(0);
    const [isSodpa, setIsSodpa] = useState(false);
    const [itemFile, setItemFile] = useState<File | null>(null);
    
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
        doc_type: 'NFE',
        prestador_pf_dados: {
            cpf_cnpj: '',
            rg: '',
            pis_nit: '',
            endereco: '',
            tipo_servico: ''
        },
        inss_retido: 0,
        iss_retido: 0,
        valor_liquido: 0
    });

    useEffect(() => {
        fetchData();
    }, [accountabilityId]);

    useEffect(() => {
        if (pcData?.solicitation?.process_number) {
            setIsSodpa(pcData.solicitation.process_number.includes('DPA') || 
                       pcData.solicitation.process_number.includes('SDP') ||
                       pcData.solicitation.process_number.includes('DIARIA'));
        }
    }, [pcData]);

    // Auto-fechar notificações
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Initialize newItem with first available element
    useEffect(() => {
        if (expenseElements.length > 0 && newItem.element_code === '3.3.90.30.01' && !expenseElements.find(e => e.codigo === '3.3.90.30.01')) {
            setNewItem(prev => ({ ...prev, element_code: expenseElements[0].codigo }));
        }
    }, [expenseElements]);

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

    // Smart Capture handler
    const handleSmartCapture = async (file: File) => {
        setIsAnalyzing(true);
        setItemFile(file);
        try {
            const base64Data = await convertFileToBase64(file);
            const base64Content = base64Data.split(',')[1]; 

            const systemPrompt = isSodpa ? `
                Como Auditor Fiscal Virtual do TJPA (Sentinela SODPA), analise este comprovante de VIAGEM (Diárias e Passagens).
                Extraia os dados técnicos e avalie a CONFORMIDADE com as regras de deslocamento institucional.
                
                REGRAS DE CONFORMIDADE SODPA:
                1. Tipos aceitos: Bilhetes aéreos, Cartões de Embarque (Boarding Pass), Canhotos de Táxi/Uber, Recibos de Hospedagem, Relatórios de Viagem.
                2. Verificação crucial: A data do bilhete/embarque deve estar dentro do período da portaria (solicitação).
                3. Identificar se é um Cartão de Embarque (confirmação de voo).

                Retorne APENAS um JSON estrito:
                {
                    "doc_type": "BILHETE" | "BOARDING_PASS" | "REPORT" | "RECIBO" | "OTHER",
                    "date": "YYYY-MM-DD",
                    "supplier_name": "CIA AÉREA / HOTEL / EMPRESA",
                    "cnpj": "CNPJ SE IDENTIFICADO",
                    "doc_number": "LOCALIZADOR OU NÚMERO",
                    "total_value": 0.00,
                    "description": "DETALHES DO TRECHO OU SERVIÇO",
                    "suggested_element": "N/A",
                    "is_compliant": true/false,
                    "compliance_issue": "EXPLICAÇÃO CASO NÃO SEJA COMPATÍVEL"
                }
            ` : `
                Como Auditor Fiscal Virtual do TJPA (Sentinela SOSFU), analise este comprovante de despesa.
                Extraia os dados técnicos e avalie a CONFORMIDADE com as regras de Suprimento de Fundos.
                
                REGRAS DE CONFORMIDADE SOSFU:
                1. Proibido: Bebidas alcoólicas, cigarros, itens de uso pessoal, multas/juros.
                2. Limite: R$ 15.000,00 por documento.
                3. Elementos sugeridos: 3.3.90.30.01 (Combustíveis), 3.3.90.30.16 (Material de Expediente), 3.3.90.39.05 (Serviços Técnicos), 3.3.90.30.07 (Gêneros de Alimentação).

                Retorne APENAS um JSON estrito:
                {
                    "doc_type": "NFE" | "NFS" | "CUPOM" | "RECIBO" | "OUTROS",
                    "date": "YYYY-MM-DD",
                    "supplier_name": "RAZÃO SOCIAL DO ESTABELECIMENTO",
                    "cnpj": "00.000.000/0000-00",
                    "doc_number": "NÚMERO DA NOTA OU CFO",
                    "total_value": 0.00,
                    "description": "DESCRIÇÃO DOS ITENS COMPRADOS",
                    "suggested_element": "CÓDIGO DO ELEMENTO SUGERIDO",
                    "is_compliant": true/false,
                    "compliance_issue": "DESCRIÇÃO DO PROBLEMA CASO is_compliant SEJA FALSE"
                }
            `;

            const text = await generateWithParts([
                { inlineData: { mimeType: file.type, data: base64Content } },
                { text: systemPrompt }
            ]);

            // const result = await (ai as any).models.generateContent({...});
            // const text = result.text || ...
            if (text) {
                const cleanedJson = text.replace(/```json|```/g, '').trim();
                const data = JSON.parse(cleanedJson);

                if (data.is_compliant === false) {
                    showToast('error', `ATENÇÃO: Este documento pode não ser aceito.`);
                }

                setNewItem({
                    ...newItem,
                    doc_type: data.doc_type || 'OUTROS',
                    item_date: data.date || new Date().toISOString().split('T')[0],
                    supplier: data.supplier_name || '',
                    doc_number: data.doc_number || '',
                    value: parseFloat(data.total_value) || 0,
                    description: data.description || '',
                    element_code: data.suggested_element || newItem.element_code,
                    ai_metadata: { 
                        analyzed: true, 
                        cnpj: data.cnpj,
                        is_compliant: data.is_compliant,
                        compliance_issue: data.compliance_issue
                    }
                });

                if (data.is_compliant) {
                    showToast('success', 'Documento validado e dados extraídos!');
                }
            }
        } catch (error: any) {
            console.error("Erro Sentinela IA:", error);
            showToast('error', `Falha na análise inteligente: ${error?.message || 'Erro de leitura'}.`);
        } finally {
            setIsAnalyzing(false);
        }
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

        if (newItem.element_code.includes('3.3.90.36') && !itemFile) {
            showToast('error', "Anexe a Nota Fiscal de Serviço (NFS-e) obrigatória para Prestador PF.");
            return;
        }
        
        setSubmitting(true);
        try {
            let receiptUrl = newItem.receipt_url;

            if (itemFile) {
                const fileName = `item_${accountabilityId}_${Date.now()}.${itemFile.name.split('.').pop()}`;
                const { error: uploadError } = await supabase.storage
                    .from('process-documents')
                    .upload(`${processId}/${fileName}`, itemFile);
                
                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('process-documents')
                    .getPublicUrl(`${processId}/${fileName}`);
                
                receiptUrl = publicUrl;
            }

            const { data, error } = await supabase.from('accountability_items').insert({
                accountability_id: accountabilityId,
                item_date: newItem.item_date,
                description: newItem.description,
                supplier: newItem.supplier,
                doc_number: newItem.doc_number,
                element_code: newItem.element_code,
                value: newItem.value,
                doc_type: newItem.doc_type,
                receipt_url: receiptUrl,
                prestador_pf_dados: newItem.element_code.includes('3.3.90.36') ? newItem.prestador_pf_dados : null,
                inss_retido: newItem.element_code.includes('3.3.90.36') ? newItem.inss_retido : 0,
                iss_retido: newItem.element_code.includes('3.3.90.36') ? newItem.iss_retido : 0,
                valor_liquido: newItem.element_code.includes('3.3.90.36') ? newItem.valor_liquido : newItem.value
            }).select().single();

            if (error) throw error;

            if (data) {
                setItems([...items, { ...data, doc_type: newItem.doc_type }]);
                setNewItem({ 
                    item_date: '', description: '', supplier: '', doc_number: '', 
                    element_code: '3.3.90.30.01', value: 0, doc_type: 'NFE' 
                });
                setItemFile(null);
                showToast('success', 'Comprovante adicionado!');
            }
        } catch (err: any) {
            showToast('error', "Erro ao salvar: " + err.message);
        } finally {
            setSubmitting(false);
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

    const [showGdrModal, setShowGdrModal] = useState(false);
    const [gdrData, setGdrData] = useState({
        numero: '',
        valor: 0,
        data_pagamento: new Date().toISOString().split('T')[0],
        file: null as File | null
    });

    const handleGdrUpload = async () => {
        if (!gdrData.numero || !gdrData.file) {
            showToast('error', "Informe o número da GDR e anexe o comprovante.");
            return;
        }
        setSubmitting(true);
        try {
            // Upload file
            const fileName = `gdr_${accountabilityId}_${Date.now()}.pdf`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('process-documents')
                .upload(`${processId}/${fileName}`, gdrData.file);
            
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('process-documents')
                .getPublicUrl(`${processId}/${fileName}`);

            const total = items.reduce((acc, i) => acc + i.value, 0);
            const totalInss = items.reduce((acc, i) => acc + (i.inss_retido || 0), 0);
            const totalInssPatronal = items.reduce((acc, i) => acc + (i.element_code.includes('3.3.90.36') ? i.value * 0.20 : 0), 0);
            const totalIss = items.reduce((acc, i) => acc + (i.iss_retido || 0), 0);

            const { error } = await supabase.from('prestacao_contas').update({ 
                status: 'WAITING_MANAGER', 
                valor_gasto: total,
                valor_devolvido: grantedValue - total,
                total_inss_retido: totalInss,
                total_inss_patronal: totalInssPatronal,
                total_iss_retido: totalIss,
                gdr_saldo_numero: gdrData.numero,
                gdr_saldo_valor: grantedValue - total,
                gdr_saldo_data_pagamento: gdrData.data_pagamento,
                gdr_saldo_arquivo_url: publicUrl,
                updated_at: new Date().toISOString()
            }).eq('id', accountabilityId);

            if (error) throw error;
            
            // Sync with gestao_devolucoes
            await supabase.from('gestao_devolucoes').insert({
                solicitacao_id: processId,
                prestacao_contas_id: accountabilityId,
                data_referencia: new Date().toISOString(),
                suprido_nome: pcData?.solicitation?.user_id, // Profile will be handled by trigger normally, but let's be explicit
                numero_gdr: gdrData.numero,
                valor_concedido: grantedValue,
                valor_gasto: total,
                valor_devolvucao: grantedValue - total,
                status_gdr: 'PENDENTE'
            });

            // Also sync INSS items to gestao_inss
            const inssItems = items.filter(i => i.element_code.includes('3.3.90.36'));
            if (inssItems.length > 0) {
                const inssEntries = inssItems.map(item => ({
                    solicitacao_id: processId,
                    prestacao_contas_id: accountabilityId,
                    comprovante_id: item.id,
                    cpf: item.prestador_pf_dados?.cpf_cnpj,
                    nome: item.supplier,
                    pis_nit: item.prestador_pf_dados?.pis_nit,
                    valor_bruto: item.value,
                    inss_retido_11: item.inss_retido || 0,
                    inss_patronal_20: item.value * 0.20,
                    iss_retido_5: item.iss_retido || 0,
                    nup: pcData?.solicitation?.nup,
                    comarca: pcData?.solicitation?.unit,
                    atividade: item.description,
                    data_prestacao: item.item_date
                }));
                await supabase.from('gestao_inss').insert(inssEntries);
            }

            onSuccess();
        } catch (e: any) {
            showToast('error', 'Erro ao processar GDR: ' + e.message);
        } finally {
            setSubmitting(false);
            setShowGdrModal(false);
        }
    };

    const requestSubmitPC = () => {
        if (items.length === 0) {
            showToast('error', "Adicione pelo menos um comprovante antes de enviar.");
            return;
        }

        const total = items.reduce((acc, i) => acc + i.value, 0);
        const currentBalance = grantedValue - total;

        if (currentBalance > 0.01) {
            setShowGdrModal(true);
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
                    const totalInss = items.reduce((acc, i) => acc + (i.inss_retido || 0), 0);
                    const totalInssPatronal = items.reduce((acc, i) => acc + (i.element_code.includes('3.3.90.36') ? i.value * 0.20 : 0), 0);
                    const totalIss = items.reduce((acc, i) => acc + (i.iss_retido || 0), 0);

                    const { error } = await supabase.from('prestacao_contas').update({ 
                        status: 'WAITING_MANAGER', 
                        valor_gasto: total,
                        valor_devolvido: 0,
                        total_inss_retido: totalInss,
                        total_inss_patronal: totalInssPatronal,
                        total_iss_retido: totalIss,
                        updated_at: new Date().toISOString()
                    }).eq('id', accountabilityId);

                    if (error) throw error;

                    // Sync INSS items to gestao_inss if any
                    const inssItems = items.filter(i => i.element_code.includes('3.3.90.36'));
                    if (inssItems.length > 0) {
                        const inssEntries = inssItems.map(item => ({
                            solicitacao_id: processId,
                            prestacao_contas_id: accountabilityId,
                            comprovante_id: item.id,
                            cpf: item.prestador_pf_dados?.cpf_cnpj,
                            nome: item.supplier,
                            pis_nit: item.prestador_pf_dados?.pis_nit,
                            valor_bruto: item.value,
                            inss_retido_11: item.inss_retido || 0,
                            inss_patronal_20: item.value * 0.20,
                            nup: pcData?.solicitation?.nup,
                            comarca: pcData?.solicitation?.unit,
                            atividade: item.description,
                            data_prestacao: item.item_date
                        }));
                        await supabase.from('gestao_inss').insert(inssEntries);
                    }

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
            case 'NFS': return { label: 'Nota Serviço', icon: FileText, color: 'text-teal-600', bg: 'bg-teal-50' };
            case 'CUPOM': return { label: 'Cupom Fiscal', icon: ScrollText, color: 'text-orange-600', bg: 'bg-orange-50' };
            case 'RECIBO': return { label: 'Recibo', icon: PenTool, color: 'text-gray-600', bg: 'bg-gray-100' };
            case 'BILHETE': return { label: 'Passagem', icon: Ticket, color: 'text-sky-600', bg: 'bg-sky-50' };
            case 'BOARDING_PASS': return { label: 'Emb.', icon: Plane, color: 'text-emerald-600', bg: 'bg-emerald-50' };
            case 'REPORT': return { label: 'Relatório', icon: FileText, color: 'text-teal-600', bg: 'bg-teal-50' };
            default: return { label: 'Outros', icon: Receipt, color: 'text-slate-600', bg: 'bg-slate-50' };
        }
    };

    const totalSpent = items.reduce((acc, curr) => acc + Number(curr.value), 0);
    const balance = grantedValue - totalSpent;
    const SelectedDocIcon = getDocTypeInfo(newItem.doc_type).icon;

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    const canEdit = (role === 'USER' || role === 'GESTOR') && (pcData.status === 'DRAFT' || pcData.status === 'CORRECTION');

    return (
        <div className={`flex flex-col h-full ${darkMode ? 'bg-slate-900' : 'bg-[#F8FAFC]'} ${isEmbedded ? 'rounded-xl' : ''} relative`}>
            
            {/* Componentes de Overlay */}
            {notification && <NotificationToast type={notification.type} message={notification.message} onClose={() => setNotification(null)} darkMode={darkMode} />}
            
            <ConfirmationModal 
                isOpen={confirmModal.isOpen} 
                title={confirmModal.title} 
                message={confirmModal.message} 
                onConfirm={confirmModal.action} 
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                isDestructive={confirmModal.isDestructive}
                darkMode={darkMode}
            />

            {!isEmbedded && (
                <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-b px-8 py-5 flex justify-between items-center shadow-sm sticky top-0 z-20`}>
                    <div>
                        <h2 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-gray-800'}`}>
                            <Sparkles className="text-blue-600" size={24} /> 
                            Prestação de Contas {isSodpa && '(SODPA)'}
                        </h2>
                    </div>
                    {onClose && <button onClick={onClose} className={darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500'}><X size={20}/></button>}
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
                            <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-2xl shadow-sm border overflow-hidden p-5`}>
                                <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center justify-between ${darkMode ? 'text-slate-400' : 'text-gray-700'}`}>
                                    <div className="flex items-center gap-2">
                                        <FileText size={14} /> Dados do Lançamento
                                    </div>
                                    {newItem.ai_metadata?.analyzed && (
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] border border-blue-100 animate-pulse">
                                            <CloudLightning size={10} /> Extração Sentinela IA
                                        </div>
                                    )}
                                </h3>

                                {/* Sentinela Compliance Alert */}
                                {newItem.ai_metadata?.analyzed && newItem.ai_metadata?.is_compliant === false && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                        <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
                                        <div>
                                            <p className="text-xs font-bold text-red-800">Alerta de Não-Conformidade</p>
                                            <p className="text-[11px] text-red-600 mt-0.5 leading-relaxed">
                                                {newItem.ai_metadata.compliance_issue || "Este documento pode violar as regras de prestação de contas do TJPA."}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-12 gap-4 items-end">
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Tipo</label>
                                        <div className="relative">
                                            <select 
                                                value={newItem.doc_type} 
                                                onChange={e => setNewItem({...newItem, doc_type: e.target.value as DocumentType})}
                                                className={`w-full px-3 py-2 border rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all appearance-none cursor-pointer ${
                                                    darkMode 
                                                    ? 'bg-slate-900 border-slate-700 text-slate-100' 
                                                    : 'bg-white border-gray-300 text-gray-900'
                                                }`}
                                            >
                                                {!isSodpa ? (
                                                    <>
                                                        <option value="NFE">Nota Fiscal (NF-e)</option>
                                                        <option value="NFS">Nota de Serviço (NFS-e)</option>
                                                        <option value="CUPOM">Cupom Fiscal</option>
                                                        <option value="RECIBO">Recibo Manual</option>
                                                        <option value="OUTROS">Outros</option>
                                                    </>
                                                ) : (
                                                    <>
                                                        <option value="BILHETE">Bilhete de Passagem</option>
                                                        <option value="BOARDING_PASS">Cartão de Embarque</option>
                                                        <option value="REPORT">Relatório de Viagem</option>
                                                        <option value="RECIBO">Recibo (Táxi/Uber/Hotel)</option>
                                                        <option value="OUTROS">Outros</option>
                                                    </>
                                                )}
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
                                            className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all ${
                                                darkMode 
                                                ? 'bg-slate-900 border-slate-700 text-slate-100' 
                                                : 'bg-white border-gray-300 text-gray-900'
                                            }`} 
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-4">
                                        <label htmlFor="item-value" className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Valor Total</label>
                                        <div className="relative">
                                            <input 
                                                id="item-value"
                                                type="number" 
                                                step="0.01" 
                                                value={newItem.value} 
                                                onChange={e => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    const isPF = newItem.element_code.includes('3.3.90.36');
                                                    const inss = isPF ? val * 0.11 : 0;
                                                    const iss = isPF ? val * 0.05 : 0;
                                                    setNewItem({
                                                        ...newItem, 
                                                        value: val,
                                                        inss_retido: inss,
                                                        iss_retido: iss,
                                                        valor_liquido: val - inss - iss
                                                    });
                                                }} 
                                                className={`w-full px-3 py-2 pl-8 border rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all ${
                                                    darkMode 
                                                    ? 'bg-slate-900 border-slate-700 text-slate-100' 
                                                    : 'bg-white border-gray-300 text-gray-900'
                                                }`} 
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">R$</span>
                                        </div>
                                    </div>

                                    <div className="col-span-12 md:col-span-6">
                                        <div className="flex items-center justify-between mb-1">
                                            <label htmlFor="item-supplier" className="text-[10px] font-bold text-gray-500 uppercase block">Fornecedor / Razão Social</label>
                                            {newItem.ai_metadata?.cnpj && (
                                                <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1.5 rounded">{newItem.ai_metadata.cnpj}</span>
                                            )}
                                        </div>
                                        <input 
                                            id="item-supplier"
                                            type="text" 
                                            value={newItem.supplier} 
                                            onChange={e => setNewItem({...newItem, supplier: e.target.value})} 
                                            className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder-gray-400 ${
                                                darkMode 
                                                ? 'bg-slate-900 border-slate-700 text-slate-100' 
                                                : 'bg-white border-gray-300 text-gray-900'
                                            }`} 
                                            placeholder="Nome da empresa ou pessoa" 
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-6">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Descrição do Item</label>
                                        <input 
                                            type="text" 
                                            value={newItem.description} 
                                            onChange={e => setNewItem({...newItem, description: e.target.value})} 
                                            className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder-gray-400 ${
                                                darkMode 
                                                ? 'bg-slate-900 border-slate-700 text-slate-100' 
                                                : 'bg-white border-gray-300 text-gray-900'
                                            }`} 
                                            placeholder="Ex: Almoço, Passagem, Material..." 
                                        />
                                    </div>

                                    <div className="col-span-12 md:col-span-6">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Elemento de Despesa</label>
                                        <select 
                                            value={newItem.element_code}
                                            onChange={e => {
                                                const code = e.target.value;
                                                const isPF = code.includes('3.3.90.36');
                                                const grossValue = newItem.value || 0;
                                                const inss = isPF ? grossValue * 0.11 : 0;
                                                const iss = isPF ? grossValue * 0.05 : 0;
                                                setNewItem({
                                                    ...newItem, 
                                                    element_code: code,
                                                    inss_retido: inss,
                                                    iss_retido: iss,
                                                    valor_liquido: grossValue - inss - iss
                                                });
                                            }}
                                            className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium ${
                                                darkMode 
                                                ? 'bg-slate-900 border-slate-700 text-slate-100' 
                                                : 'bg-white border-gray-300 text-gray-900'
                                            }`}
                                        >
                                            {expenseElements.map(el => (
                                                <option key={el.id} value={el.codigo}>
                                                    {el.codigo} - {el.descricao}
                                                </option>
                                            ))}
                                            {expenseElements.length === 0 && (
                                                <option value="3.3.90.30.01">3.3.90.30.01 - Material de Consumo</option>
                                            )}
                                        </select>
                                    </div>

                                    {/* Campos Extras para Pessoa Física (3.3.90.36) */}
                                    {newItem.element_code.includes('3.3.90.36') && (
                                        <div className={`col-span-12 grid grid-cols-12 gap-4 p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 ${
                                            darkMode ? 'bg-amber-900/10 border-amber-900/50' : 'bg-amber-50/50 border-amber-100'
                                        }`}>
                                            <div className="col-span-12 flex items-center gap-2 mb-2">
                                                <UserCheck size={16} className="text-amber-600" />
                                                <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">Dados do Prestador PF</h4>
                                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Retenção na Fonte</span>
                                            </div>
                                            
                                            <div className="col-span-12 md:col-span-4">
                                                <label className="text-[10px] font-bold text-amber-700 uppercase mb-1 block">CPF do Prestador</label>
                                                <input 
                                                    type="text" 
                                                    value={newItem.prestador_pf_dados?.cpf_cnpj}
                                                    onChange={e => setNewItem({...newItem, prestador_pf_dados: {...newItem.prestador_pf_dados!, cpf_cnpj: e.target.value}})}
                                                    className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-200 ${
                                                        darkMode ? 'bg-slate-900 border-amber-900/30 text-amber-200' : 'bg-white border-amber-200 text-slate-900'
                                                    }`}
                                                    placeholder="000.000.000-00"
                                                />
                                            </div>
                                            <div className="col-span-12 md:col-span-4">
                                                <label className="text-[10px] font-bold text-amber-700 uppercase mb-1 block">RG / CNH</label>
                                                <input 
                                                    type="text" 
                                                    value={newItem.prestador_pf_dados?.rg}
                                                    onChange={e => setNewItem({...newItem, prestador_pf_dados: {...newItem.prestador_pf_dados!, rg: e.target.value}})}
                                                    className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-200 ${
                                                        darkMode ? 'bg-slate-900 border-amber-900/30 text-amber-200' : 'bg-white border-amber-200 text-slate-900'
                                                    }`}
                                                />
                                            </div>
                                            <div className="col-span-12 md:col-span-4">
                                                <label className="text-[10px] font-bold text-amber-700 uppercase mb-1 block">PIS / NIT</label>
                                                <input 
                                                    type="text" 
                                                    value={newItem.prestador_pf_dados?.pis_nit}
                                                    onChange={e => setNewItem({...newItem, prestador_pf_dados: {...newItem.prestador_pf_dados!, pis_nit: e.target.value}})}
                                                    className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-200 ${
                                                        darkMode ? 'bg-slate-900 border-amber-900/30 text-amber-200' : 'bg-white border-amber-200 text-slate-900'
                                                    }`}
                                                    placeholder="000.00000.00-0"
                                                />
                                            </div>
                                            
                                            <div className="col-span-12 md:col-span-8">
                                                <label className="text-[10px] font-bold text-amber-700 uppercase mb-1 block">Endereço Completo</label>
                                                <input 
                                                    type="text" 
                                                    value={newItem.prestador_pf_dados?.endereco}
                                                    onChange={e => setNewItem({...newItem, prestador_pf_dados: {...newItem.prestador_pf_dados!, endereco: e.target.value}})}
                                                    className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-200 ${
                                                        darkMode ? 'bg-slate-900 border-amber-900/30 text-amber-200' : 'bg-white border-amber-200 text-slate-900'
                                                    }`}
                                                    placeholder="Rua, Número, Bairro, Cidade - UF"
                                                />
                                            </div>

                                            <div className="col-span-12 md:col-span-4">
                                                <label className="text-[10px] font-bold text-amber-700 uppercase mb-1 block">Anexar NFS-e (PDF/IMG)</label>
                                                <input 
                                                    type="file" 
                                                    accept=".pdf,image/*"
                                                    onChange={e => setItemFile(e.target.files?.[0] || null)}
                                                    className="w-full text-[10px] text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 cursor-pointer"
                                                />
                                                {itemFile && (
                                                    <p className="text-[9px] text-emerald-600 mt-1 font-bold flex items-center gap-1">
                                                        <CheckCircle2 size={10} /> {itemFile.name}
                                                    </p>
                                                )}
                                                <p className="text-[9px] text-amber-600/70 mt-1 font-medium italic">Obrigatório para comprovação do recolhimento do ISS.</p>
                                            </div>

                                            <div className="col-span-12 pt-2 mt-2 border-t border-amber-100">
                                                <div className="grid grid-cols-4 gap-4">
                                                    <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} p-2.5 rounded-lg border border-amber-100`}>
                                                        <span className="text-[9px] font-bold text-amber-600 block mb-1">INSS Prestador (11%)</span>
                                                        <span className={`text-sm font-black ${darkMode ? 'text-amber-400' : 'text-amber-900'}`}>
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newItem.inss_retido || 0)}
                                                        </span>
                                                    </div>
                                                    <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} p-2.5 rounded-lg border border-amber-100`}>
                                                        <span className="text-[9px] font-bold text-amber-600 block mb-1">ISS Retido (5%)</span>
                                                        <span className={`text-sm font-black ${darkMode ? 'text-amber-400' : 'text-amber-900'}`}>
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newItem.iss_retido || 0)}
                                                        </span>
                                                    </div>
                                                    <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                                                        <span className="text-[9px] font-bold text-emerald-600 block mb-1">Valor Líquido</span>
                                                        <span className="text-sm font-black text-emerald-700">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newItem.valor_liquido || 0)}
                                                        </span>
                                                    </div>
                                                    <div className="bg-teal-50 p-2.5 rounded-lg border border-teal-100">
                                                        <span className="text-[9px] font-bold text-teal-600 block mb-1">Cota Patronal (20%)</span>
                                                        <span className="text-sm font-black text-teal-700">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newItem.value * 0.20)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="col-span-12 pt-2">
                                        <button 
                                            onClick={handleAddItem} 
                                            className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform active:scale-95 ${
                                                darkMode ? 'bg-slate-100 text-slate-900 hover:bg-white' : 'bg-slate-900 text-white hover:bg-black'
                                            }`}
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
                                <div className={`text-center py-8 rounded-xl border border-dashed text-gray-400 ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-300'}`}>
                                    <Receipt size={24} className="mx-auto mb-2 opacity-30"/>
                                    <p className="text-xs">Nenhum comprovante lançado.</p>
                                </div>
                            ) : (
                                items.map((item) => {
                                    const typeInfo = getDocTypeInfo(item.doc_type || 'OUTROS');
                                    return (
                                        <div key={item.id} className={`${darkMode ? 'bg-slate-800 border-slate-700 hover:border-blue-500/50' : 'bg-white border-gray-200 hover:border-blue-200'} p-3 rounded-lg border shadow-sm flex justify-between items-center transition-colors`}>
                                            <div className="flex items-start gap-3">
                                                <div className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs ${typeInfo.bg} ${typeInfo.color}`}>
                                                    <typeInfo.icon size={16} />
                                                </div>
                                                <div>
                                                    <p className={`font-bold text-sm ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{item.description}</p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide">
                                                        {item.supplier} • {(() => {
                                                            const [y, m, d] = item.item_date.split('-').map(Number);
                                                            return new Date(y, m - 1, d).toLocaleDateString();
                                                        })()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className={`font-mono font-bold text-sm ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                                                </p>
                                                {canEdit && (
                                                    <button 
                                                        onClick={() => item.id && requestDeleteItem(item.id)} 
                                                        className={`p-1.5 rounded transition-colors ${darkMode ? 'text-slate-600 hover:text-red-400 hover:bg-red-900/20' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}
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
                <div className={`w-full xl:w-80 border-l p-6 shadow-sm z-10 flex flex-col ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex-1">
                        <h3 className={`font-bold mb-4 uppercase text-xs tracking-wider flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                            <Wallet size={14} className="text-blue-600"/> Balanço do Recurso
                        </h3>
                        
                        <div className={`rounded-xl p-4 border space-y-3 mb-6 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500 font-medium">Recebido</span>
                                <span className={`font-bold ${darkMode ? 'text-slate-300' : 'text-gray-800'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grantedValue)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500 font-medium">Gasto</span>
                                <span className="font-bold text-blue-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpent)}</span>
                            </div>
                            <div className={`h-px my-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                            <div className="flex justify-between items-center">
                                <span className={`font-bold text-xs ${darkMode ? 'text-slate-400' : 'text-slate-700'}`}>Saldo</span>
                                <span className={`font-bold text-base ${balance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto space-y-3">
                        {canEdit && (
                            <>
                                <button 
                                    onClick={onClose}
                                    className={`w-full py-2.5 border rounded-lg font-bold transition-all flex items-center justify-center gap-2 text-sm ${
                                        darkMode 
                                        ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600' 
                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    Continuar Depois
                                </button>
                                
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
                            </>
                        )}
                        <div className="flex items-center justify-center gap-1.5 py-1">
                            <CheckCircle2 size={10} className="text-emerald-500" />
                            <p className="text-[9px] text-gray-400">Progresso sincronizado em tempo real</p>
                        </div>
                    </div>
                </div>
                </div>

                {/* Modal de GDR (Devolução de Saldo) */}
                {showGdrModal && (
                    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-white/20'} rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border animate-in zoom-in-95 duration-300`}>
                            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white relative">
                                <button 
                                    onClick={() => setShowGdrModal(false)}
                                    className="absolute right-4 top-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                                        <CloudLightning size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black">Guia de Devolução (GDR)</h3>
                                        <p className="text-emerald-100 text-sm mt-0.5 font-medium">
                                            Identificamos um saldo residual de <b>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}</b>.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-4">
                                    <AlertCircle className="text-amber-600 shrink-0" size={20} />
                                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                                        Conforme a Resolução CNJ 169/2013, o saldo não utilizado deve ser devolvido ao erário via GDR antes do envio da prestação de contas definitiva.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="gdr-number" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Número da GDR / Autenticação</label>
                                        <input 
                                            id="gdr-number"
                                            type="text" 
                                            placeholder="Ex: 2026.0401.001"
                                            value={gdrData.numero}
                                            onChange={e => setGdrData({...gdrData, numero: e.target.value})}
                                            className={`w-full px-4 py-3 border rounded-2xl text-sm font-bold outline-none transition-all ${
                                                darkMode 
                                                ? 'bg-slate-900 border-slate-700 text-slate-100 focus:ring-emerald-500/20 focus:border-emerald-500' 
                                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500'
                                            }`}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Data de Pagamento</label>
                                            <input 
                                                type="date" 
                                                value={gdrData.data_pagamento}
                                                onChange={e => setGdrData({...gdrData, data_pagamento: e.target.value})}
                                                className={`w-full px-4 py-3 border rounded-2xl text-sm font-bold outline-none ${
                                                    darkMode 
                                                    ? 'bg-slate-900 border-slate-700 text-slate-100' 
                                                    : 'bg-slate-50 border-slate-200 text-slate-900'
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Valor Devolvido</label>
                                            <div className={`w-full px-4 py-3 border rounded-2xl text-sm font-black ${
                                                darkMode ? 'bg-slate-900 border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-500'
                                            }`}>
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Comprovante de Depósito (PDF)</label>
                                        <div className="relative group">
                                            <input 
                                                type="file" 
                                                accept=".pdf,image/*"
                                                onChange={e => setGdrData({...gdrData, file: e.target.files?.[0] || null})}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className={`w-full p-6 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 transition-all ${
                                                gdrData.file 
                                                ? (darkMode ? 'bg-emerald-900/20 border-emerald-500' : 'bg-emerald-50 border-emerald-500') 
                                                : (darkMode ? 'bg-slate-900 border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-500/5' : 'bg-slate-50 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30')
                                            }`}>
                                                {gdrData.file ? (
                                                    <>
                                                        <FileCheck size={32} className="text-emerald-500" />
                                                        <span className={`text-xs font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>{gdrData.file.name}</span>
                                                        <span className="text-[10px] text-emerald-600/60 uppercase font-black">Clique para alterar</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className={`p-3 rounded-2xl shadow-sm ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                                                            <Plus size={24} className="text-slate-400" />
                                                        </div>
                                                        <span className={`text-xs font-bold mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Selecionar Arquivo</span>
                                                        <span className="text-[10px] text-slate-400 uppercase tracking-tighter">Guia ou Comprovante Pago</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={`p-6 border-t ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                <button 
                                    onClick={handleGdrUpload}
                                    disabled={submitting || !gdrData.numero || !gdrData.file}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                    Confirmar e Enviar para o Gestor
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
    );
};
