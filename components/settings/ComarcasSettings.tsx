import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MapPin, Plus, Pencil, Trash2, Search, Loader2, Save, X,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Navigation, Globe, Landmark
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Comarca {
  idcomarca: number;
  comarca: string;
  entrancia: string;
  polo: string;
  regiao: string;
  latitude: number | null;
  longitude: number | null;
  nome_banco: string | null;
  cod_banco: string | null;
  agencia: string | null;
  conta_corrente: string | null;
}

const EMPTY_COMARCA: Omit<Comarca, 'idcomarca'> = {
  comarca: '',
  entrancia: '1ª Entrância',
  polo: '',
  regiao: '',
  latitude: null,
  longitude: null,
  nome_banco: null,
  cod_banco: null,
  agencia: null,
  conta_corrente: null,
};

const ENTRANCIA_OPTIONS = ['1ª Entrância', '2ª Entrância', '3ª Entrância', 'Entrância Especial'];

export const ComarcasSettings: React.FC = () => {
  const [comarcas, setComarcas] = useState<Comarca[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Comarca>('comarca');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingComarca, setEditingComarca] = useState<Comarca | null>(null);
  const [formData, setFormData] = useState<Omit<Comarca, 'idcomarca'>>(EMPTY_COMARCA);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Comarca | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // --- FETCH ---
  const fetchComarcas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dcomarcas')
      .select('*')
      .order('comarca', { ascending: true });

    if (error) {
      console.error('Erro ao carregar comarcas:', error);
      showToast('error', 'Erro ao carregar comarcas');
    } else {
      setComarcas(data || []);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { fetchComarcas(); }, [fetchComarcas]);

  // --- SORT & FILTER ---
  const filteredComarcas = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return comarcas
      .filter(c =>
        !term ||
        c.comarca.toLowerCase().includes(term) ||
        c.polo?.toLowerCase().includes(term) ||
        c.regiao?.toLowerCase().includes(term) ||
        c.entrancia?.toLowerCase().includes(term)
      )
      .sort((a, b) => {
        const valA = String(a[sortField] ?? '').toLowerCase();
        const valB = String(b[sortField] ?? '').toLowerCase();
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
  }, [comarcas, searchTerm, sortField, sortDir]);

  const handleSort = (field: keyof Comarca) => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: keyof Comarca }) => {
    if (sortField !== field) return <ChevronDown size={12} className="text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-blue-600" /> : <ChevronDown size={12} className="text-blue-600" />;
  };

  // --- MODAL HANDLERS ---
  const openCreate = () => {
    setEditingComarca(null);
    setFormData({ ...EMPTY_COMARCA });
    setModalOpen(true);
  };

  const openEdit = (comarca: Comarca) => {
    setEditingComarca(comarca);
    setFormData({
      comarca: comarca.comarca,
      entrancia: comarca.entrancia,
      polo: comarca.polo,
      regiao: comarca.regiao,
      latitude: comarca.latitude,
      longitude: comarca.longitude,
      nome_banco: comarca.nome_banco,
      cod_banco: comarca.cod_banco,
      agencia: comarca.agencia,
      conta_corrente: comarca.conta_corrente,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingComarca(null);
    setFormData({ ...EMPTY_COMARCA });
  };

  // --- SAVE (CREATE / UPDATE) ---
  const handleSave = async () => {
    if (!formData.comarca.trim()) {
      showToast('error', 'Nome da comarca é obrigatório');
      return;
    }

    setSaving(true);
    try {
      if (editingComarca) {
        // UPDATE
        const { error } = await supabase
          .from('dcomarcas')
          .update({
            comarca: formData.comarca.trim(),
            entrancia: formData.entrancia,
            polo: formData.polo.trim(),
            regiao: formData.regiao.trim(),
            latitude: formData.latitude,
            longitude: formData.longitude,
            nome_banco: formData.nome_banco?.trim() || null,
            cod_banco: formData.cod_banco?.trim() || null,
            agencia: formData.agencia?.trim() || null,
            conta_corrente: formData.conta_corrente?.trim() || null,
          })
          .eq('idcomarca', editingComarca.idcomarca);

        if (error) throw error;
        showToast('success', 'Comarca atualizada com sucesso');
      } else {
        // CREATE
        const { error } = await supabase
          .from('dcomarcas')
          .insert({
            comarca: formData.comarca.trim(),
            entrancia: formData.entrancia,
            polo: formData.polo.trim(),
            regiao: formData.regiao.trim(),
            latitude: formData.latitude,
            longitude: formData.longitude,
            nome_banco: formData.nome_banco?.trim() || null,
            cod_banco: formData.cod_banco?.trim() || null,
            agencia: formData.agencia?.trim() || null,
            conta_corrente: formData.conta_corrente?.trim() || null,
          });

        if (error) throw error;
        showToast('success', 'Comarca criada com sucesso');
      }

      closeModal();
      fetchComarcas();
    } catch (err: any) {
      console.error('Erro ao salvar comarca:', err);
      showToast('error', err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  // --- DELETE ---
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('dcomarcas')
        .delete()
        .eq('idcomarca', deleteTarget.idcomarca);

      if (error) throw error;
      showToast('success', `Comarca "${deleteTarget.comarca}" removida`);
      setDeleteTarget(null);
      fetchComarcas();
    } catch (err: any) {
      console.error('Erro ao excluir:', err);
      showToast('error', err.message || 'Erro ao excluir');
    } finally {
      setSaving(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="animate-in fade-in duration-300">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-bold animate-in slide-in-from-top-2 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <MapPin size={20} className="text-blue-600" />
              Gestão de Comarcas
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Cadastro completo das comarcas do Pará com coordenadas geográficas.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow-sm hover:bg-blue-700 transition-colors active:scale-95"
          >
            <Plus size={16} />
            Nova Comarca
          </button>
        </div>

        {/* Search + Stats */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por nome, polo, região, entrância..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-bold">
              {filteredComarcas.length} comarcas
            </span>
            <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full font-bold flex items-center gap-1">
              <Navigation size={10} />
              {comarcas.filter(c => c.latitude && c.longitude).length} geolocalizadas
            </span>
            <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full font-bold flex items-center gap-1">
              <Landmark size={10} />
              {comarcas.filter(c => c.conta_corrente).length} com conta bancária
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  {[
                    { key: 'idcomarca' as keyof Comarca, label: 'ID', w: 'w-16' },
                    { key: 'comarca' as keyof Comarca, label: 'Comarca', w: 'w-48' },
                    { key: 'entrancia' as keyof Comarca, label: 'Entrância', w: 'w-32' },
                    { key: 'polo' as keyof Comarca, label: 'Polo', w: 'w-40' },
                    { key: 'regiao' as keyof Comarca, label: 'Região', w: 'w-40' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none ${col.w}`}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon field={col.key} />
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-44">
                    Conta Bancária
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-36">
                    Coordenadas
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredComarcas.map((c, idx) => (
                  <tr
                    key={c.idcomarca}
                    className={`hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                  >
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{c.idcomarca}</td>
                    <td className="px-4 py-3 font-bold text-gray-800">{c.comarca}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        c.entrancia === '3ª Entrância' ? 'bg-indigo-100 text-indigo-700' :
                        c.entrancia === '2ª Entrância' ? 'bg-blue-100 text-blue-700' :
                        c.entrancia === 'Entrância Especial' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {c.entrancia}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.polo}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.regiao}</td>
                    <td className="px-4 py-3">
                      {c.conta_corrente ? (
                        <div className="flex items-center gap-1.5">
                          <Landmark size={12} className="text-amber-500" />
                          <span className="text-[10px] font-mono text-gray-500">
                            {c.cod_banco || '---'} / Ag {c.agencia || '---'} / CC {c.conta_corrente}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-300 italic">Sem conta</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.latitude && c.longitude ? (
                        <div className="flex items-center gap-1.5">
                          <Globe size={12} className="text-emerald-500" />
                          <span className="text-[10px] font-mono text-gray-500">
                            {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-300 italic">Sem coordenadas</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredComarcas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                      <MapPin size={28} className="mx-auto mb-2 opacity-20" />
                      <p className="font-medium">Nenhuma comarca encontrada</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <MapPin size={18} className="text-blue-600" />
                {editingComarca ? 'Editar Comarca' : 'Nova Comarca'}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Nome */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 block">
                  Nome da Comarca *
                </label>
                <input
                  type="text"
                  value={formData.comarca}
                  onChange={(e) => setFormData({ ...formData, comarca: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Ex: Belém"
                  autoFocus
                />
              </div>

              {/* Entrância + Polo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 block">
                    Entrância
                  </label>
                  <select
                    value={formData.entrancia}
                    onChange={(e) => setFormData({ ...formData, entrancia: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                  >
                    {ENTRANCIA_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 block">
                    Polo
                  </label>
                  <input
                    type="text"
                    value={formData.polo}
                    onChange={(e) => setFormData({ ...formData, polo: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Ex: Pólo Belém"
                  />
                </div>
              </div>

              {/* Região */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 block">
                  Região Judiciária
                </label>
                <input
                  type="text"
                  value={formData.regiao}
                  onChange={(e) => setFormData({ ...formData, regiao: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Ex: 1ª Região Judiciária"
                />
              </div>

              {/* Dados Bancários da Comarca */}
              <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Landmark size={14} className="text-amber-600" />
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                    Conta Bancária da Comarca
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Nome do Banco</label>
                    <input
                      type="text"
                      value={formData.nome_banco ?? ''}
                      onChange={(e) => setFormData({ ...formData, nome_banco: e.target.value || null })}
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      placeholder="Banco do Brasil"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Código do Banco</label>
                    <input
                      type="text"
                      value={formData.cod_banco ?? ''}
                      onChange={(e) => setFormData({ ...formData, cod_banco: e.target.value || null })}
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      placeholder="001"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Agência</label>
                    <input
                      type="text"
                      value={formData.agencia ?? ''}
                      onChange={(e) => setFormData({ ...formData, agencia: e.target.value || null })}
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      placeholder="1234-5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Conta Corrente</label>
                    <input
                      type="text"
                      value={formData.conta_corrente ?? ''}
                      onChange={(e) => setFormData({ ...formData, conta_corrente: e.target.value || null })}
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      placeholder="12345-6"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-amber-600 mt-2">
                  * Conta institucional da comarca. Utilizada nos processos <strong>Extra-Júri</strong> para crédito do suprimento.
                </p>
              </div>

              {/* Coordenadas Geográficas */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Navigation size={14} className="text-blue-600" />
                  <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                    Coordenadas Geográficas
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={formData.latitude ?? ''}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="-1.44754"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={formData.longitude ?? ''}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="-48.49245"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-blue-500 mt-2">
                  * Utilize coordenadas decimais. Você pode obtê-las no Google Maps clicando com o botão direito no local.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingComarca ? 'Salvar Alterações' : 'Criar Comarca'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-800">Excluir Comarca</h4>
                <p className="text-xs text-gray-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Tem certeza que deseja excluir a comarca <strong>"{deleteTarget.comarca}"</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
