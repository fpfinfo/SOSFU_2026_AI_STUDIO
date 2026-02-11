import React, { useState, useEffect } from 'react';
import { 
    Tag, 
    Plus, 
    Trash2, 
    Search, 
    Loader2, 
    Edit3,
    X,
    Save,
    Archive,
    Shield
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useExpenseElements } from '../../hooks/useExpenseElements';

interface ExpenseElementsSettingsProps {
    darkMode?: boolean;
    module: 'SOSFU' | 'SODPA';
}

export const ExpenseElementsSettings: React.FC<ExpenseElementsSettingsProps> = ({ darkMode = false, module }) => {
    const { elements, loading, refresh } = useExpenseElements(module, true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        codigo: '',
        descricao: '',
        categoria: 'Custeio',
        is_active: true,
        module: module as string
    });

    const filteredElements = elements.filter(el => 
        el.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        el.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSave = async () => {
        if (!form.codigo || !form.descricao) return;
        
        try {
            setSaving(true);
            // Clean up submission to match delemento table schema
            const { categoria, ...cleanFormData } = form;
            const submission = { ...cleanFormData, module: form.module || module };
            
            if (editingId) {
                const { error } = await supabase
                    .from('delemento')
                    .update(submission)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('delemento')
                    .insert([submission]);
                if (error) throw error;
            }
            
            setIsAdding(false);
            setEditingId(null);
            setForm({ codigo: '', descricao: '', categoria: 'Custeio', is_active: true, module: module });
            refresh();
        } catch (e: any) {
            console.error('Error saving element:', e);
            alert(`Erro ao salvar elemento: ${e.message || 'Erro desconhecido'}`);
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('delemento')
                .update({ is_active: !currentStatus })
                .eq('id', id);
            if (error) throw error;
            refresh();
        } catch (e: any) {
            console.error('Error toggling status:', e);
            alert('Erro ao alterar status do elemento.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este elemento? Isso pode afetar lançamentos existentes.')) return;
        
        try {
            const { error } = await supabase
                .from('delemento')
                .delete()
                .eq('id', id);
            if (error) throw error;
            refresh();
        } catch (e: any) {
            console.error('Error deleting element:', e);
            alert('Erro ao excluir elemento. Verifique se ele está sendo usado em alguma solicitação.');
        }
    };

    const cardClass = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
    const textClass = darkMode ? 'text-white' : 'text-slate-800';
    const subTextClass = darkMode ? 'text-slate-400' : 'text-slate-500';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className={`text-xl font-black flex items-center gap-2 ${textClass}`}>
                        <Tag className="text-blue-600" size={24} />
                        Elementos de Despesa ({module})
                    </h2>
                    <p className={`text-sm mt-1 ${subTextClass}`}>
                        Gerencie os códigos orçamentários disponíveis para lançamentos de {module === 'SODPA' ? 'diárias e passagens' : 'suprimento de fundos'}.
                    </p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setForm({ codigo: '', descricao: '', categoria: 'Custeio', is_active: true, module: module });
                            setIsAdding(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
                    >
                        <Plus size={18} /> Novo Elemento
                    </button>
                )}
            </div>

            {isAdding && (
                <div className={`p-6 rounded-2xl border-2 border-blue-100 shadow-xl ${darkMode ? 'bg-slate-800/50' : 'bg-blue-50/30'} animate-in slide-in-from-top-4`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-blue-700">
                            {editingId ? 'Editar Elemento' : 'Adicionar Novo Código'}
                        </h3>
                        <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Código</label>
                            <input 
                                type="text"
                                value={form.codigo}
                                onChange={e => setForm({...form, codigo: e.target.value})}
                                placeholder="ex: 3.3.90.30.01"
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Descrição</label>
                            <input 
                                type="text"
                                value={form.descricao}
                                onChange={e => setForm({...form, descricao: e.target.value})}
                                placeholder="ex: Material de Consumo - Combustíveis"
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Visibilidade</label>
                            <select 
                                value={form.module}
                                onChange={e => setForm({...form, module: e.target.value})}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                            >
                                <option value="SOSFU">Apenas SOSFU</option>
                                <option value="SODPA">Apenas SODPA</option>
                                <option value="AMBOS">Ambos os Módulos</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {editingId ? 'Atualizar Elemento' : 'Salvar Elemento'}
                        </button>
                    </div>
                </div>
            )}

            <div className={`relative ${darkMode ? 'text-white' : ''}`}>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search size={18} />
                </div>
                <input 
                    type="text"
                    placeholder="Pesquisar por código ou descrição..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-2xl border outline-none transition-all ${
                        darkMode 
                            ? 'bg-slate-800 border-slate-700 focus:border-blue-500' 
                            : 'bg-white border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 focus:shadow-lg'
                    }`}
                />
            </div>

            <div className={`rounded-2xl border overflow-hidden shadow-sm ${darkMode ? 'border-slate-700' : 'border-slate-200 bg-white'}`}>
                <table className="w-full text-sm text-left">
                    <thead className={darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                        <tr>
                            <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px] text-slate-500">Status</th>
                            <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px] text-slate-500">Código</th>
                            <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px] text-slate-500">Descrição</th>
                            <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px] text-slate-500">Módulo</th>
                            <th className="px-6 py-4 font-black uppercase tracking-wider text-[10px] text-slate-500 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                    <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" size={32} />
                                    <p className="text-slate-400">Carregando elementos...</p>
                                </td>
                            </tr>
                        ) : filteredElements.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                    <Archive className="mx-auto text-slate-200 mb-2" size={32} />
                                    <p className="text-slate-400">Nenhum elemento encontrado para este módulo.</p>
                                </td>
                            </tr>
                        ) : (
                            filteredElements.map(el => (
                                <tr key={el.id} className={`${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/50'} transition-colors`}>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => toggleStatus(el.id, el.is_active)}
                                            className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                                el.is_active 
                                                    ? 'bg-emerald-100 text-emerald-700' 
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}
                                        >
                                            {el.is_active ? 'Ativo' : 'Inativo'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 font-mono font-bold text-blue-600">{el.codigo}</td>
                                    <td className="px-6 py-4 font-medium text-slate-700">{el.descricao}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                            el.module === 'AMBOS' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {el.module || 'AMBOS'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 text-slate-400">
                                            <button 
                                                onClick={() => {
                                                    setEditingId(el.id);
                                                    setForm({
                                                        codigo: el.codigo,
                                                        descricao: el.descricao,
                                                        categoria: el.categoria || 'Custeio',
                                                        is_active: el.is_active,
                                                        module: el.module || module
                                                    });
                                                    setIsAdding(true);
                                                }}
                                                className="hover:text-amber-600 p-1.5 hover:bg-amber-50 rounded-lg transition-all"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(el.id)}
                                                className="hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
