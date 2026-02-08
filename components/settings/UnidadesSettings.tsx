import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2, Plus, Pencil, Trash2, Search, Loader2, Save, X,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Navigation, Globe, Phone, Mail, User
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ==================== TYPES ====================
interface UnidadeAdmin {
  id: number;
  nome: string;
  sigla: string | null;
  tipo: string;
  vinculacao: string | null;
  responsavel: string | null;
  responsavel_id: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  ativo: boolean;
  // Joined profile data
  profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    matricula: string | null;
    cargo: string | null;
    avatar_url: string | null;
  } | null;
}

interface ProfileOption {
  id: string;
  full_name: string;
  email: string | null;
  matricula: string | null;
  cargo: string | null;
  avatar_url: string | null;
}

const TIPO_OPTIONS = [
  'Secretaria', 'Departamento', 'Coordenadoria', 'Serviço', 'Assessoria', 'Seção', 'Gabinete', 'Outro'
];

const TIPO_COLORS: Record<string, string> = {
  'Secretaria':     'bg-purple-100 text-purple-700',
  'Departamento':   'bg-blue-100 text-blue-700',
  'Coordenadoria':  'bg-emerald-100 text-emerald-700',
  'Serviço':        'bg-amber-100 text-amber-700',
  'Assessoria':     'bg-indigo-100 text-indigo-700',
  'Seção':          'bg-cyan-100 text-cyan-700',
  'Gabinete':       'bg-rose-100 text-rose-700',
  'Outro':          'bg-gray-100 text-gray-600',
};

interface FormData {
  nome: string;
  sigla: string | null;
  tipo: string;
  vinculacao: string | null;
  responsavel: string | null;
  responsavel_id: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  ativo: boolean;
}

const EMPTY_FORM: FormData = {
  nome: '', sigla: '', tipo: 'Departamento', vinculacao: '', responsavel: '',
  responsavel_id: null, endereco: '', telefone: '', email: '',
  latitude: null, longitude: null, ativo: true,
};

const TABLE_NAME = 'dUnidadesAdmin';

// ==================== COMPONENT ====================
export const UnidadesSettings: React.FC = () => {
  const [unidades, setUnidades] = useState<UnidadeAdmin[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof UnidadeAdmin>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<UnidadeAdmin | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [profileSearch, setProfileSearch] = useState('');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<UnidadeAdmin | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // --- FETCH ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [unidadesRes, profilesRes] = await Promise.all([
      supabase
        .from(TABLE_NAME)
        .select(`
          *,
          profile:responsavel_id (
            id, full_name, email, matricula, cargo, avatar_url
          )
        `)
        .order('nome', { ascending: true }),
      supabase
        .from('profiles')
        .select('id, full_name, email, matricula, cargo, avatar_url')
        .not('full_name', 'is', null)
        .order('full_name', { ascending: true }),
    ]);

    if (unidadesRes.error) {
      console.error('Erro ao carregar unidades:', unidadesRes.error);
      showToast('error', 'Erro ao carregar unidades');
    } else {
      setUnidades(unidadesRes.data || []);
    }

    if (profilesRes.data) {
      setProfiles(profilesRes.data.filter((p: any) => p.full_name) as ProfileOption[]);
    }

    setLoading(false);
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- SORT & FILTER ---
  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return unidades
      .filter(u =>
        !term ||
        u.nome.toLowerCase().includes(term) ||
        u.sigla?.toLowerCase().includes(term) ||
        u.tipo.toLowerCase().includes(term) ||
        u.vinculacao?.toLowerCase().includes(term) ||
        u.responsavel?.toLowerCase().includes(term) ||
        u.profile?.full_name?.toLowerCase().includes(term)
      )
      .sort((a, b) => {
        const valA = String(a[sortField] ?? '').toLowerCase();
        const valB = String(b[sortField] ?? '').toLowerCase();
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
  }, [unidades, searchTerm, sortField, sortDir]);

  const handleSort = (field: keyof UnidadeAdmin) => {
    if (sortField === field) { setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc')); }
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: keyof UnidadeAdmin }) => {
    if (sortField !== field) return <ChevronDown size={12} className="text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-blue-600" />
      : <ChevronDown size={12} className="text-blue-600" />;
  };

  // --- Profile Search Filter ---
  const filteredProfiles = useMemo(() => {
    if (!profileSearch) return profiles;
    const term = profileSearch.toLowerCase();
    return profiles.filter(p =>
      p.full_name?.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term) ||
      p.matricula?.toLowerCase().includes(term)
    );
  }, [profiles, profileSearch]);

  // --- MODAL HANDLERS ---
  const openCreate = () => {
    setEditingUnidade(null);
    setFormData({ ...EMPTY_FORM });
    setProfileSearch('');
    setModalOpen(true);
  };

  const openEdit = (unidade: UnidadeAdmin) => {
    setEditingUnidade(unidade);
    setFormData({
      nome: unidade.nome, sigla: unidade.sigla, tipo: unidade.tipo,
      vinculacao: unidade.vinculacao, responsavel: unidade.responsavel,
      responsavel_id: unidade.responsavel_id,
      endereco: unidade.endereco, telefone: unidade.telefone, email: unidade.email,
      latitude: unidade.latitude, longitude: unidade.longitude, ativo: unidade.ativo,
    });
    setProfileSearch('');
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingUnidade(null); setFormData({ ...EMPTY_FORM }); };

  const selectedProfile = useMemo(() =>
    formData.responsavel_id ? profiles.find(p => p.id === formData.responsavel_id) : null
  , [formData.responsavel_id, profiles]);

  // --- SAVE ---
  const handleSave = async () => {
    if (!formData.nome.trim()) { showToast('error', 'Nome da unidade é obrigatório'); return; }
    if (!formData.tipo) { showToast('error', 'Tipo é obrigatório'); return; }

    setSaving(true);
    try {
      const payload: any = {
        nome: formData.nome.trim(),
        sigla: formData.sigla?.trim() || null,
        tipo: formData.tipo,
        vinculacao: formData.vinculacao?.trim() || null,
        responsavel: formData.responsavel?.trim() || null,
        responsavel_id: formData.responsavel_id || null,
        endereco: formData.endereco?.trim() || null,
        telefone: formData.telefone?.trim() || null,
        email: formData.email?.trim() || null,
        latitude: formData.latitude,
        longitude: formData.longitude,
        ativo: formData.ativo,
      };

      // If a profile is selected, auto-fill the text responsavel
      if (formData.responsavel_id) {
        const profile = profiles.find(p => p.id === formData.responsavel_id);
        if (profile) payload.responsavel = profile.full_name;
      }

      if (editingUnidade) {
        const { error } = await supabase.from(TABLE_NAME).update(payload).eq('id', editingUnidade.id);
        if (error) throw error;
        showToast('success', 'Unidade atualizada com sucesso');
      } else {
        const { error } = await supabase.from(TABLE_NAME).insert(payload);
        if (error) throw error;
        showToast('success', 'Unidade criada com sucesso');
      }

      closeModal();
      fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar unidade:', err);
      showToast('error', err.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  // --- DELETE ---
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const { error } = await supabase.from(TABLE_NAME).delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showToast('success', `Unidade "${deleteTarget.nome}" removida`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      console.error('Erro ao excluir:', err);
      showToast('error', err.message || 'Erro ao excluir');
    } finally { setSaving(false); }
  };

  // Helper: display name from profile or fallback text
  const getResponsavelDisplay = (u: UnidadeAdmin) => {
    if (u.profile?.full_name) return u.profile.full_name;
    if (u.responsavel) return u.responsavel;
    return null;
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
              <Building2 size={20} className="text-blue-600" />
              Gestão de Unidades Administrativas
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Cadastro das unidades administrativas do TJPA — Secretarias, Departamentos, Coordenadorias, Serviços e Assessorias.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow-sm hover:bg-blue-700 transition-colors active:scale-95"
          >
            <Plus size={16} />
            Nova Unidade
          </button>
        </div>

        {/* Search + Stats */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por nome, sigla, tipo, vinculação, responsável..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-bold">
              {filtered.length} unidades
            </span>
            <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full font-bold flex items-center gap-1">
              <Navigation size={10} />
              {unidades.filter(u => u.latitude && u.longitude).length} geolocalizadas
            </span>
            <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-full font-bold">
              {unidades.filter(u => u.ativo).length} ativas
            </span>
            <span className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full font-bold flex items-center gap-1">
              <User size={10} />
              {unidades.filter(u => u.responsavel_id).length} vinculadas
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
                    { key: 'id' as keyof UnidadeAdmin, label: 'ID', w: 'w-14' },
                    { key: 'sigla' as keyof UnidadeAdmin, label: 'Sigla', w: 'w-24' },
                    { key: 'nome' as keyof UnidadeAdmin, label: 'Nome', w: 'w-56' },
                    { key: 'tipo' as keyof UnidadeAdmin, label: 'Tipo', w: 'w-32' },
                    { key: 'vinculacao' as keyof UnidadeAdmin, label: 'Vinculação', w: 'w-28' },
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
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-60">
                    Responsável
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
                {filtered.map((u, idx) => {
                  const displayName = getResponsavelDisplay(u);
                  const profile = u.profile;
                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} ${!u.ativo ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{u.id}</td>
                      <td className="px-4 py-3">
                        {u.sigla ? (
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md tracking-wide">
                            {u.sigla}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-300 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800">{u.nome}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${TIPO_COLORS[u.tipo] || TIPO_COLORS['Outro']}`}>
                          {u.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{u.vinculacao || '—'}</td>
                      <td className="px-4 py-3">
                        {profile ? (
                          <div className="flex items-center gap-2.5">
                            {profile.avatar_url ? (
                              <img src={profile.avatar_url} alt={profile.full_name || ''}
                                className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-[10px] font-black text-white border-2 border-white shadow-sm shrink-0">
                                {(profile.full_name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-800 truncate leading-tight">{profile.full_name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {profile.cargo && (
                                  <span className="text-[9px] text-gray-400 truncate">{profile.cargo}</span>
                                )}
                                {profile.matricula && (
                                  <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">{profile.matricula}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : displayName ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500 shrink-0">
                              {displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <span className="text-xs text-gray-600 truncate">{displayName}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-300 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.latitude && u.longitude ? (
                          <div className="flex items-center gap-1.5">
                            <Globe size={12} className="text-emerald-500" />
                            <span className="text-[10px] font-mono text-gray-500">
                              {u.latitude.toFixed(4)}, {u.longitude.toFixed(4)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-300 italic">Sem coordenadas</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                      <Building2 size={28} className="mx-auto mb-2 opacity-20" />
                      <p className="font-medium">Nenhuma unidade encontrada</p>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Building2 size={18} className="text-blue-600" />
                {editingUnidade ? 'Editar Unidade' : 'Nova Unidade'}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Nome + Sigla */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 block">
                    Nome da Unidade *
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Ex: Seção de Suprimento de Fundos"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 block">
                    Sigla
                  </label>
                  <input
                    type="text"
                    value={formData.sigla ?? ''}
                    onChange={(e) => setFormData({ ...formData, sigla: e.target.value || null })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase"
                    placeholder="SOSFU"
                  />
                </div>
              </div>

              {/* Tipo + Vinculação */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 block">
                    Tipo *
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                  >
                    {TIPO_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 block">
                    Vinculação
                  </label>
                  <input
                    type="text"
                    value={formData.vinculacao ?? ''}
                    onChange={(e) => setFormData({ ...formData, vinculacao: e.target.value || null })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Ex: SEFIN"
                  />
                </div>
              </div>

              {/* Responsável — Profile Selector */}
              <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User size={14} className="text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
                    Responsável / Titular
                  </span>
                </div>

                {/* Selected Profile Preview */}
                {selectedProfile && (
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-indigo-100 mb-3">
                    {selectedProfile.avatar_url ? (
                      <img src={selectedProfile.avatar_url} alt={selectedProfile.full_name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-xs font-black text-white border-2 border-white shadow-sm">
                        {selectedProfile.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{selectedProfile.full_name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {selectedProfile.cargo && (
                          <span className="text-[10px] text-gray-500">{selectedProfile.cargo}</span>
                        )}
                        {selectedProfile.matricula && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-mono font-bold">{selectedProfile.matricula}</span>
                        )}
                        {selectedProfile.email && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Mail size={9} /> {selectedProfile.email}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setFormData({ ...formData, responsavel_id: null })}
                      className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-500"
                      title="Remover vínculo"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Profile Search */}
                {!selectedProfile && (
                  <>
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                      <input
                        type="text"
                        placeholder="Buscar servidor por nome, email ou matrícula..."
                        className="w-full pl-8 pr-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        value={profileSearch}
                        onChange={(e) => setProfileSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-0.5 rounded-lg">
                      {filteredProfiles.slice(0, 20).map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setFormData({ ...formData, responsavel_id: p.id, responsavel: p.full_name });
                            setProfileSearch('');
                          }}
                          className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white border border-transparent hover:border-indigo-200 transition-colors text-left"
                        >
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt={p.full_name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                              {p.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-700 truncate">{p.full_name}</p>
                            <div className="flex items-center gap-2">
                              {p.cargo && <span className="text-[9px] text-gray-400 truncate">{p.cargo}</span>}
                              {p.matricula && <span className="text-[9px] font-mono text-gray-400">{p.matricula}</span>}
                            </div>
                          </div>
                        </button>
                      ))}
                      {filteredProfiles.length === 0 && (
                        <p className="text-center text-[10px] text-gray-400 py-4">Nenhum servidor encontrado</p>
                      )}
                    </div>
                  </>
                )}

                {/* Fallback: manual text */}
                <div className="mt-3 pt-3 border-t border-indigo-100">
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">
                    Ou nome manual (sem vínculo)
                  </label>
                  <input
                    type="text"
                    value={formData.responsavel_id ? '' : (formData.responsavel ?? '')}
                    onChange={(e) => setFormData({ ...formData, responsavel: e.target.value || null, responsavel_id: null })}
                    disabled={!!formData.responsavel_id}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-40 disabled:bg-gray-50"
                    placeholder="Nome do responsável"
                  />
                </div>
              </div>

              {/* Contato */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Phone size={14} className="text-blue-600" />
                  <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                    Contato
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Telefone</label>
                    <input
                      type="text"
                      value={formData.telefone ?? ''}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value || null })}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="(91) 3205-0000"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">E-mail</label>
                    <input
                      type="email"
                      value={formData.email ?? ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value || null })}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="unidade@tjpa.jus.br"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Endereço</label>
                  <input
                    type="text"
                    value={formData.endereco ?? ''}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value || null })}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Av. Augusto Montenegro, 4000"
                  />
                </div>
              </div>

              {/* Coordenadas Geográficas */}
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Navigation size={14} className="text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Coordenadas Geográficas
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Latitude</label>
                    <input
                      type="number" step="0.000001"
                      value={formData.latitude ?? ''}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="-1.45502"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Longitude</label>
                    <input
                      type="number" step="0.000001"
                      value={formData.longitude ?? ''}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="-48.50240"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-emerald-500 mt-2">
                  * Estas coordenadas posicionam a unidade no Mapa de Despesas da SOSFU.
                </p>
              </div>

              {/* Status Ativo */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-bold text-gray-800">Unidade Ativa</p>
                  <p className="text-xs text-gray-500">Unidades inativas não aparecem no mapa nem em seleções.</p>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, ativo: !formData.ativo })}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${formData.ativo ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${formData.ativo ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl shrink-0">
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
                {editingUnidade ? 'Salvar Alterações' : 'Criar Unidade'}
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
                <h4 className="font-bold text-gray-800">Excluir Unidade</h4>
                <p className="text-xs text-gray-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Tem certeza que deseja excluir a unidade <strong>"{deleteTarget.nome}"</strong>
              {deleteTarget.sigla && <span className="text-gray-400"> ({deleteTarget.sigla})</span>}?
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
