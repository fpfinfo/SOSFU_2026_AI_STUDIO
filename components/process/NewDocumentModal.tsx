import React, { useState, useEffect } from 'react';
import { X, FileText, Save, Loader2, FileSignature, AlertCircle, Pencil, Trash2, Upload, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { FileUploader, UploadResult } from '../ui/FileUploader';

interface NewDocumentModalProps {
    processId: string;
    editingDoc?: any;
    onClose: () => void;
    onSave: () => void;
}

const DOC_SUBTYPES = [
    { value: 'MEMORANDO', label: 'Memorando' },
    { value: 'REQUERIMENTO', label: 'Requerimento' },
    { value: 'CERTIDAO', label: 'Certidão' },
    { value: 'DECLARACAO', label: 'Declaração' },
    { value: 'OFICIO', label: 'Ofício' },
    { value: 'MINUTA_JUSTIFICATIVA', label: 'Minuta de Justificativa' },
    { value: 'DESPACHO', label: 'Despacho' },
    { value: 'COMPROVANTE', label: 'Comprovante / Nota Fiscal' },
    { value: 'RECIBO', label: 'Recibo' },
    { value: 'ANEXO_PDF', label: 'Anexo (PDF Externo)' },
    { value: 'OUTRO', label: 'Outro' },
];

type InputMode = 'TEXT' | 'FILE';

export const NewDocumentModal: React.FC<NewDocumentModalProps> = ({ processId, editingDoc, onClose, onSave }) => {
    const [subType, setSubType] = useState(editingDoc?.metadata?.subType || '');
    const [title, setTitle] = useState(editingDoc?.title || '');
    const [content, setContent] = useState(editingDoc?.metadata?.content || '');
    const [isDraft, setIsDraft] = useState(editingDoc?.metadata?.is_draft ?? true);
    const [saving, setSaving] = useState(false);

    // Upload state
    const [inputMode, setInputMode] = useState<InputMode>(
        editingDoc?.metadata?.file_data || editingDoc?.metadata?.file_url ? 'FILE' : 'TEXT'
    );
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

    const isEditing = !!editingDoc;

    // Auto-fill title from subType
    useEffect(() => {
        if (!isEditing && subType) {
            const selected = DOC_SUBTYPES.find(d => d.value === subType);
            if (selected && !title) {
                setTitle(selected.label);
            }
        }
    }, [subType]);

    // Auto-switch to FILE mode for file-oriented subtypes
    useEffect(() => {
        if (['COMPROVANTE', 'RECIBO', 'ANEXO_PDF'].includes(subType)) {
            setInputMode('FILE');
        }
    }, [subType]);

    const canSave = () => {
        if (!subType || !title.trim()) return false;
        if (inputMode === 'TEXT') return content.trim().length > 0;
        if (inputMode === 'FILE') return !!uploadResult;
        return false;
    };

    const handleSave = async () => {
        if (!canSave()) return;
        setSaving(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Não autenticado');

            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
            const userName = profile?.full_name || user.email || 'Usuário';

            const auditEntry = {
                action: isEditing ? 'UPDATE' : 'CREATE',
                user_id: user.id,
                user_name: userName,
                timestamp: new Date().toISOString(),
            };

            // Build metadata based on inputMode
            const baseMetadata = {
                subType,
                is_draft: isDraft,
                editable: isDraft,
            };

            const fileMetadata = uploadResult ? {
                file_data: uploadResult.base64,
                file_url: uploadResult.storageUrl,
                storage_path: uploadResult.storagePath,
                original_filename: uploadResult.fileName,
                file_size: uploadResult.fileSize,
                mime_type: uploadResult.mimeType,
                source: 'MANUAL_UPLOAD',
            } : {};

            const textMetadata = inputMode === 'TEXT' ? { content } : {};

            if (isEditing) {
                const existingAudit = editingDoc.metadata?.audit_log || [];
                const { error } = await supabase.from('process_documents')
                    .update({
                        title,
                        metadata: {
                            ...editingDoc.metadata,
                            ...baseMetadata,
                            ...textMetadata,
                            ...fileMetadata,
                            updated_at: new Date().toISOString(),
                            audit_log: [...existingAudit, auditEntry],
                        }
                    })
                    .eq('id', editingDoc.id);

                if (error) throw error;
            } else {
                const { error } = await supabase.from('process_documents').insert({
                    solicitation_id: processId,
                    title,
                    document_type: 'GENERIC',
                    metadata: {
                        ...baseMetadata,
                        ...textMetadata,
                        ...fileMetadata,
                        created_by: user.id,
                        created_by_name: userName,
                        audit_log: [auditEntry],
                    }
                });

                if (error) throw error;
            }

            onSave();
            onClose();
        } catch (err: any) {
            console.error('Erro ao salvar documento:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/80">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        {isEditing ? <Pencil size={18} className="text-blue-600" /> : <FileSignature size={18} className="text-blue-600" />}
                        {isEditing ? 'Editar Documento' : 'Novo Documento'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-red-100 text-gray-500 hover:text-red-600 rounded-full transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Tipo */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700">Tipo de Documento *</label>
                        <select
                            value={subType}
                            onChange={e => setSubType(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white cursor-pointer"
                        >
                            <option value="">Selecione o tipo...</option>
                            {DOC_SUBTYPES.map(d => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Título */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700">Título do Documento *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Memorando de Justificativa - Contingente Policial"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                    </div>

                    {/* Input Mode Toggle */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conteúdo via:</span>
                        <div className="flex items-center bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setInputMode('TEXT')}
                                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-all ${
                                    inputMode === 'TEXT'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                <FileText size={14} /> Texto
                            </button>
                            <button
                                type="button"
                                onClick={() => setInputMode('FILE')}
                                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-all ${
                                    inputMode === 'FILE'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                <Upload size={14} /> Arquivo PDF
                            </button>
                        </div>
                    </div>

                    {/* Content: Text Mode */}
                    {inputMode === 'TEXT' && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-700">Conteúdo *</label>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                rows={10}
                                placeholder="Digite o conteúdo do documento..."
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none leading-relaxed font-serif"
                            />
                            <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                <AlertCircle size={10} /> O conteúdo será renderizado no formato de documento oficial do TJPA.
                            </p>
                        </div>
                    )}

                    {/* Content: File Upload Mode */}
                    {inputMode === 'FILE' && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-700">Arquivo PDF *</label>
                            <FileUploader
                                inputId="new-doc-upload"
                                pathPrefix={`documents/${processId}`}
                                color="blue"
                                buttonLabel="Selecionar PDF"
                                description="Arraste o PDF aqui ou clique para selecionar"
                                sizeHint="Máximo 10 MB"
                                onUpload={setUploadResult}
                                onRemove={() => setUploadResult(null)}
                                value={uploadResult}
                            />
                        </div>
                    )}

                    {/* Draft Toggle */}
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <input
                            type="checkbox"
                            id="isDraft"
                            checked={isDraft}
                            onChange={e => setIsDraft(e.target.checked)}
                            className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer"
                        />
                        <label htmlFor="isDraft" className="cursor-pointer flex-1">
                            <span className="text-sm font-bold text-amber-800">Minuta (pendente de assinatura)</span>
                            <p className="text-xs text-amber-600 mt-0.5">
                                Minutas precisam ser assinadas pelo Gestor antes de tramitar o processo.
                            </p>
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50/80">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !canSave()}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isEditing ? 'Salvar Alterações' : 'Criar Documento'}
                    </button>
                </div>
            </div>
        </div>
    );
};
