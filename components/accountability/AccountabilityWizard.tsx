import React, { useState, useEffect } from 'react';
import { 
    Receipt, Plus, Trash2, Save, Send, AlertTriangle, 
    FileCheck, CheckCircle2, DollarSign, Calendar, Upload, 
    Loader2, ArrowRight, Wallet, UserCheck, Stamp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AccountabilityWizardProps {
    processId: string;
    accountabilityId: string;
    role: 'SUPRIDO' | 'GESTOR' | 'SOSFU';
    onClose: () => void;
    onSuccess: () => void;
}

interface ExpenseItem {
    id?: string;
    item_date: string;
    description: string;
    supplier: string;
    doc_number: string;
    element_code: string;
    value: number;
    status?: string;
}

export const AccountabilityWizard: React.FC<AccountabilityWizardProps> = ({ processId, accountabilityId, role, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Dados Principais
    const [pcData, setPcData] = useState<any>(null);
    const [items, setItems] = useState<ExpenseItem[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    
    // Formulário de Item
    const [newItem, setNewItem] = useState<ExpenseItem>({
        item_date: '',
        description: '',
        supplier: '',
        doc_number: '',
        element_code: '3.3.90.30.01',
        value: 0
    });

    // Totais
    const [grantedValue, setGrantedValue] = useState(0);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);

            // 1. Buscar dados da PC e do Processo
            const { data: pc, error: pcError } = await supabase
                .from('accountabilities')
                .select(`
                    *,
                    solicitation:solicitation_id (value, process_number, beneficiary, user_id)
                `)
                .eq('id', accountabilityId)
                .single();
            
            if (pcError) throw pcError;
            setPcData(pc);
            setGrantedValue(pc.solicitation.value);

            // 2. Buscar Itens
            const { data: itemsData, error: itemsError } = await supabase
                .from('accountability_items')
                .select('*')
                .eq('accountability_id', accountabilityId)
                .order('item_date');

            if (itemsError) throw itemsError;
            setItems(itemsData || []);

        } catch (error) {
            console.error(error);
            alert('Erro ao carregar dados da prestação de contas.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async () => {
        if (!newItem.description || !newItem.value || !newItem.item_date) return;
        
        // Optimistic UI Update
        const tempItem = { ...newItem, id: 'temp-' + Date.now() };
        setItems([...items, tempItem]);
        
        // Reset form
        setNewItem({ ...newItem, description: '', value: 0, doc_number: '', supplier: '' });

        // Save to DB
        const { data, error } = await supabase.from('accountability_items').insert({
            accountability_id: accountabilityId,
            ...newItem
        }).select().single();

        if (!error && data) {
            setItems(prev => prev.map(i => i.id === tempItem.id ? data : i));
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm('Remover este item?')) return;
        setItems(prev => prev.filter(i => i.id !== id));
        await supabase.from('accountability_items').delete().eq('id', id);
    };

    const calculateTotals = () => {
        const totalSpent = items.reduce((acc, curr) => acc + Number(curr.value), 0);
        const balance = grantedValue - totalSpent;
        return { totalSpent, balance };
    };

    const { totalSpent, balance } = calculateTotals();

    // AÇÕES DE ENVIO (SUPRIDO OU GESTOR-COMO-SUPRIDO)
    const handleSubmitPC = async () => {
        if (balance < 0) {
            alert('Atenção: O valor gasto excede o concedido. Verifique os lançamentos.');
            return;
        }
        if (items.length === 0) {
            alert('Adicione pelo menos um item de despesa.');
            return;
        }
        if (!confirm(`Confirmar envio da Prestação de Contas?\n\nTotal Gasto: R$ ${totalSpent.toFixed(2)}\nSaldo a Devolver: R$ ${balance.toFixed(2)}`)) return;

        setSubmitting(true);
        try {
            // LÓGICA DE DESTINO
            // Se o usuário atual for o DONO e for GESTOR, ele auto-atesta e manda para SOSFU.
            // Se for SUPRIDO comum, manda para WAITING_MANAGER.
            const isOwner = pcData.solicitation.user_id === currentUser.id;
            const nextStatus = (role === 'GESTOR' && isOwner) ? 'WAITING_SOSFU' : 'WAITING_MANAGER';

            // Atualiza totais na tabela pai
            await supabase.from('accountabilities').update({
                total_spent: totalSpent,
                balance: balance,
                status: nextStatus
            }).eq('id', accountabilityId);

            // Gera documento automático: Balancete
            await supabase.from('process_documents').insert({
                solicitation_id: pcData.solicitation_id,
                title: 'BALANCETE DE PRESTAÇÃO DE CONTAS',
                description: `Relatório financeiro gerado pelo suprido.\nItens: ${items.length}\nTotal: R$ ${totalSpent}`,
                document_type: 'OTHER', 
                status: 'GENERATED'
            });

            // Se for Gestor Auto-Atestando, gera também o atesto da PC
            if (nextStatus === 'WAITING_SOSFU') {
                 await supabase.from('process_documents').insert({
                    solicitation_id: pcData.solicitation_id,
                    title: 'CERTIDÃO DE ATESTO DE APLICAÇÃO (AUTO)',
                    description: 'O Gestor (Solicitante) atesta que os recursos foram aplicados corretamente.',
                    document_type: 'ATTESTATION', 
                    status: 'SIGNED'
                });
            }

            onSuccess();
        } catch (e) {
            console.error(e);
            alert('Erro ao enviar.');
        } finally {
            setSubmitting(false);
        }
    };

    // AÇÕES DE APROVAÇÃO (GESTOR APROVANDO TERCEIRO)
    const handleGestorApprove = async () => {
        if (!confirm('Confirma a regularidade das despesas e emite o Atesto?')) return;
        setSubmitting(true);
        try {
            await supabase.from('accountabilities').update({ status: 'WAITING_SOSFU' }).eq('id', accountabilityId);
            
            // Gera Certidão de Atesto da PC
            await supabase.from('process_documents').insert({
                solicitation_id: pcData.solicitation_id,
                title: 'CERTIDÃO DE ATESTO DE APLICAÇÃO (PC)',
                description: 'O Gestor atesta que os recursos foram aplicados conforme a finalidade pública.',
                document_type: 'ATTESTATION', 
                status: 'SIGNED'
            });

            onSuccess();
        } catch (e) { alert('Erro ao aprovar.'); } finally { setSubmitting(false); }
    };

    // AÇÕES DA SOSFU
    const handleSOSFUApprove = async () => {
        if (!confirm('Aprovar as contas definitivamente?')) return;
        setSubmitting(true);
        try {
            await supabase.from('accountabilities').update({ status: 'APPROVED' }).eq('id', accountabilityId);
            
            await supabase.from('process_documents').insert({
                solicitation_id: pcData.solicitation_id,
                title: 'PARECER DE APROVAÇÃO DE CONTAS',
                description: 'Análise técnica conclusiva pela regularidade.',
                document_type: 'REGULARITY',
                status: 'SIGNED'
            });

            onSuccess();
        } catch (e) { alert('Erro ao aprovar.'); } finally { setSubmitting(false); }
    };

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

    // Determina se pode editar:
    // 1. É Suprido comum em modo rascunho
    // 2. É Gestor editando sua PRÓPRIA conta em modo rascunho
    const isOwner = currentUser && pcData && pcData.solicitation.user_id === currentUser.id;
    const canEdit = (role === 'SUPRIDO' || (role === 'GESTOR' && isOwner)) && (pcData.status === 'DRAFT' || pcData.status === 'CORRECTION');

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Wallet className="text-blue-600" /> 
                        Prestação de Contas
                    </h2>
                    <p className="text-sm text-gray-500">Processo: {pcData?.solicitation?.process_number} • {pcData?.solicitation?.beneficiary}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase">Valor Concedido</p>
                    <p className="text-2xl font-bold text-gray-800 text-emerald-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grantedValue)}
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                
                {/* Lado Esquerdo: Lista de Itens */}
                <div className="flex-1 overflow-y-auto p-8">
                    
                    {/* Formulário de Adição */}
                    {canEdit && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6 animate-in slide-in-from-top-4">
                            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><Plus size={16}/> Adicionar Despesa</h3>
                            <div className="grid grid-cols-12 gap-4 items-end">
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-gray-500">Data</label>
                                    <input type="date" value={newItem.item_date} onChange={e => setNewItem({...newItem, item_date: e.target.value})} className="w-full p-2 border rounded text-sm" />
                                </div>
                                <div className="col-span-4">
                                    <label className="text-xs font-bold text-gray-500">Descrição do Item/Serviço</label>
                                    <input type="text" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} className="w-full p-2 border rounded text-sm" placeholder="Ex: Refeição Almoço" />
                                </div>
                                <div className="col-span-3">
                                    <label className="text-xs font-bold text-gray-500">Fornecedor</label>
                                    <input type="text" value={newItem.supplier} onChange={e => setNewItem({...newItem, supplier: e.target.value})} className="w-full p-2 border rounded text-sm" placeholder="Restaurante X" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-gray-500">Valor (R$)</label>
                                    <input type="number" step="0.01" value={newItem.value} onChange={e => setNewItem({...newItem, value: parseFloat(e.target.value)})} className="w-full p-2 border rounded text-sm" placeholder="0,00" />
                                </div>
                                <div className="col-span-1">
                                    <button onClick={handleAddItem} className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex justify-center"><Plus size={20}/></button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Lista */}
                    <div className="space-y-3">
                        {items.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                                <Receipt size={32} className="mx-auto mb-2 opacity-50"/>
                                <p>Nenhuma despesa lançada.</p>
                            </div>
                        ) : (
                            items.map((item, idx) => (
                                <div key={item.id || idx} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center hover:shadow-sm transition-all group">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 font-bold text-xs">
                                            {new Date(item.item_date).getDate()}/{new Date(item.item_date).getMonth()+1}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">{item.description}</p>
                                            <p className="text-xs text-gray-500">{item.supplier} • Doc: {item.doc_number || 'S/N'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="font-bold text-gray-800">R$ {item.value.toFixed(2)}</p>
                                            <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                                ND: {item.element_code}
                                            </span>
                                        </div>
                                        {canEdit && (
                                            <button onClick={() => item.id && handleDeleteItem(item.id)} className="text-red-400 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Lado Direito: Resumo e Ações */}
                <div className="w-full md:w-80 bg-white border-l border-gray-200 p-6 flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-gray-800 mb-6 uppercase text-sm tracking-wider">Resumo Financeiro</h3>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Valor Recebido</span>
                                <span className="font-bold text-gray-800">{grantedValue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Total Gasto</span>
                                <span className="font-bold text-red-600">- {totalSpent.toFixed(2)}</span>
                            </div>
                            <div className="h-px bg-gray-200 my-2"></div>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-gray-800">Saldo Final</span>
                                <span className={`font-bold text-lg ${balance < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                    {balance.toFixed(2)}
                                </span>
                            </div>
                            
                            {balance > 0 && (
                                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs text-yellow-800 mt-4">
                                    <p className="font-bold flex items-center gap-1 mb-1"><AlertTriangle size={12}/> Devolução Necessária</p>
                                    <p>O saldo restante deve ser devolvido via GRU. Anexe o comprovante antes de enviar.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 space-y-3">
                        {/* Botão de Envio (Habilitado para Suprido E Gestor-Dono) */}
                        {canEdit && (
                            <button 
                                onClick={handleSubmitPC} 
                                disabled={submitting}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="animate-spin"/> : <Send size={18}/>} 
                                {role === 'GESTOR' ? 'Enviar para SOSFU' : 'Enviar p/ Gestor'}
                            </button>
                        )}

                        {/* Botão de Aprovação (Apenas Gestor aprovando Terceiro) */}
                        {role === 'GESTOR' && !isOwner && pcData.status === 'WAITING_MANAGER' && (
                            <button 
                                onClick={handleGestorApprove}
                                disabled={submitting}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="animate-spin"/> : <Stamp size={18}/>} Atestar e Enviar
                            </button>
                        )}

                        {role === 'SOSFU' && pcData.status === 'WAITING_SOSFU' && (
                            <button 
                                onClick={handleSOSFUApprove}
                                disabled={submitting}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="animate-spin"/> : <FileCheck size={18}/>} Aprovar Contas
                            </button>
                        )}

                        <button onClick={onClose} className="w-full py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};