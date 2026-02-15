
import React, { useState, useRef, useEffect } from 'react';
import { scanReceipt, generateJustification, auditExpense } from '../services/geminiService';
import { saveExpense } from '../services/dataService';

interface NewExpenseProps {
  onComplete: () => void;
  initialData?: {
    id?: string;
    description: string;
    amount: string;
    category: string;
    date: string;
    notes?: string;
  };
  isEditing?: boolean;
}

const NewExpense: React.FC<NewExpenseProps> = ({ onComplete, initialData, isEditing = false }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justifying, setJustifying] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<{ analysis: string, status: string } | null>(null);
  
  const [formData, setFormData] = useState({
    id: initialData?.id || undefined,
    description: '',
    amount: '',
    category: 'Alimentação',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        description: initialData.description || '',
        amount: initialData.amount || '',
        category: initialData.category || 'Alimentação',
        date: initialData.date || new Date().toISOString().split('T')[0],
        notes: initialData.notes || '',
      });
    }
  }, [initialData]);

  useEffect(() => {
    return () => {
      if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    };
  }, [attachmentPreview]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const result = await scanReceipt(base64);
      if (result) {
        setFormData(prev => ({
          ...prev,
          description: result.merchant || prev.description,
          amount: result.amount?.toString() || prev.amount,
          category: result.category || prev.category,
          date: result.date || prev.date,
        }));
        runAudit(result.amount?.toString(), result.category, result.merchant);
      }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const runAudit = async (amount: string, category: string, merchant: string) => {
    if (!amount || !category || !merchant) return;
    setAuditing(true);
    const result = await auditExpense({ amount, category, merchant });
    setAuditResult(result);
    setAuditing(false);
  };

  const handleJustify = async () => {
    if (!formData.notes || !formData.description) return;
    setJustifying(true);
    const formalText = await generateJustification(formData.notes, formData.category, formData.description);
    setFormData(prev => ({ ...prev, notes: formalText || prev.notes }));
    setJustifying(false);
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
      if (file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        setAttachmentPreview(previewUrl);
      }
    }
  };

  const removeAttachment = () => {
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    setAttachment(null);
    setAttachmentPreview(null);
    if (attachmentRef.current) attachmentRef.current.value = '';
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveExpense({
        id: formData.id,
        merchant: formData.description,
        // Fix: Expense.amount is number in types.ts
        amount: parseFloat(formData.amount) || 0,
        category: formData.category,
        date: formData.date,
        status: isEditing ? (initialData as any).status : 'Pendente',
      });
      onComplete();
    } catch (error) {
      alert("Erro ao salvar despesa no banco de dados.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <button onClick={onComplete} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-emerald-700 transition-colors shadow-sm">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-emerald-950 tracking-tight">
            {isEditing ? 'Editar Despesa' : 'Nova Despesa'}
          </h2>
          <p className="text-sm text-gray-400 font-medium">Lançamento inteligente com suporte ÁGIL AI</p>
        </div>
      </div>

      {!isEditing && (
        <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 flex items-center justify-between group hover:border-emerald-200 transition-all cursor-pointer shadow-sm shadow-emerald-50" onClick={() => fileInputRef.current?.click()}>
          <div className="space-y-1">
            <h3 className="font-black text-emerald-900 text-lg tracking-tight">Escaneamento ÁGIL AI</h3>
            <p className="text-xs text-emerald-700 font-medium">Extraia dados do recibo instantaneamente</p>
          </div>
          <button 
            disabled={loading}
            className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform disabled:opacity-50"
          >
            {loading ? <i className="fa-solid fa-circle-notch fa-spin text-xl"></i> : <i className="fa-solid fa-camera text-xl"></i>}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>
      )}

      <form className="space-y-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm" onSubmit={handleFormSubmit}>
        
        {(auditing || auditResult) && (
          <div className={`p-4 rounded-2xl border flex gap-3 items-center animate-in fade-in slide-in-from-top-2 duration-300 ${auditResult?.status === 'Rejeitado' ? 'bg-red-50 border-red-100 text-red-700' : auditResult?.status === 'Atenção' ? 'bg-yellow-50 border-yellow-100 text-yellow-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
              {auditing ? <i className="fa-solid fa-circle-notch fa-spin text-emerald-500"></i> : <i className={`fa-solid ${auditResult?.status === 'Aprovado' ? 'fa-check' : auditResult?.status === 'Atenção' ? 'fa-triangle-exclamation' : 'fa-xmark'}`}></i>}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Auditoria IA ÁGIL</p>
              <p className="text-xs font-bold leading-tight">{auditing ? "Analisando conformidade..." : auditResult?.analysis}</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição / Estabelecimento</label>
          <div className="relative">
            <i className="fa-solid fa-shop absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
            <input 
              type="text" 
              required
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              onBlur={() => runAudit(formData.amount, formData.category, formData.description)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 outline-none transition-all font-semibold text-gray-800"
              placeholder="Ex: Almoço Executivo"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor Total (R$)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">R$</span>
              <input 
                type="number" 
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                onBlur={() => runAudit(formData.amount, formData.category, formData.description)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 outline-none transition-all font-black text-gray-800"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data da Despesa</label>
            <div className="relative">
              <i className="fa-solid fa-calendar-day absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
              <input 
                type="date" 
                required
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 outline-none transition-all font-semibold text-gray-800"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoria</label>
          <div className="relative">
            <i className="fa-solid fa-tags absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"></i>
            <select 
              value={formData.category}
              onChange={(e) => {
                setFormData({...formData, category: e.target.value});
                runAudit(formData.amount, e.target.value, formData.description);
              }}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 outline-none transition-all font-semibold text-gray-800 appearance-none"
            >
              <option>Alimentação</option>
              <option>Transporte</option>
              <option>Hospedagem</option>
              <option>Outros</option>
            </select>
            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"></i>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center ml-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Justificativa / Observações</label>
            <button 
              type="button"
              onClick={handleJustify}
              disabled={justifying || !formData.notes}
              className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-800 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50 disabled:grayscale"
            >
              {justifying ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-sparkles"></i>}
              FORMATAR COM IA
            </button>
          </div>
          <div className="relative">
            <i className="fa-solid fa-comment-dots absolute left-4 top-4 text-gray-300"></i>
            <textarea 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50 outline-none transition-all font-medium text-gray-800 placeholder:text-gray-300 resize-none"
              placeholder="Ex: Descreva brevemente o motivo da despesa..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Anexo Comprobatório</label>
          <div className="flex flex-col gap-3">
            {!attachment ? (
              <button type="button" onClick={() => attachmentRef.current?.click()} className="flex flex-col items-center justify-center gap-3 w-full py-8 border-2 border-dashed border-gray-200 rounded-[2rem] text-gray-400 hover:border-emerald-300 bg-gray-50/30 transition-all">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <i className="fa-solid fa-paperclip text-lg"></i>
                </div>
                <p className="font-black text-[10px] uppercase tracking-wider">Anexar documento ou foto</p>
              </button>
            ) : (
              <div className="bg-emerald-50/30 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <i className="fa-solid fa-file-invoice text-emerald-600"></i>
                  <span 
                    className="text-xs font-bold text-gray-700 truncate cursor-help"
                    title="Para remover este arquivo, clique no ícone de lixeira à direita."
                  >
                    {attachment.name}
                  </span>
                </div>
                <button type="button" onClick={removeAttachment} className="text-red-400 hover:text-red-600 transition-colors">
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              </div>
            )}
            <input type="file" ref={attachmentRef} onChange={handleAttachmentChange} accept=".pdf,image/*" className="hidden" />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="submit" disabled={saving} className="flex-1 py-4 bg-emerald-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
            {saving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : null}
            {isEditing ? 'Atualizar Lançamento' : 'Salvar Lançamento'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewExpense;
