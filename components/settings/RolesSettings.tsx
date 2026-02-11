import React, { useState, useEffect } from 'react';
import { Shield, Crown, Gavel, Scale, FileBadge, User, Search, Filter, Edit3, Check, X, Loader2, DollarSign, Plus, RefreshCw, AlertCircle, ChevronDown, UserCircle2, FileText, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Tipo para a nova tabela de perfil
interface DPerfil {
    id: string;
    slug: string;
    name: string;
    description: string;
}

// Tipo atualizado para o Profile
interface Profile {
  id: string;
  full_name: string;
  email: string;
  matricula: string;
  status: string;
  avatar_url: string | null;
  perfil_id: string;
  dperfil?: DPerfil; 
}

const ROLE_STYLES: Record<string, { label: string; color: string; ring: string }> = {
  'ADMIN': { label: 'Admin', color: 'text-red-600', ring: 'ring-red-100' },
  
  // SOSFU
  'SOSFU_GESTOR': { label: 'Diretor SOSFU', color: 'text-blue-700', ring: 'ring-blue-200' },
  'SOSFU_EQUIPE': { label: 'Analista SOSFU', color: 'text-blue-600', ring: 'ring-blue-100' },

  // SEFIN
  'SEFIN_GESTOR': { label: 'Sec. Finanças', color: 'text-emerald-700', ring: 'ring-emerald-200' },
  'SEFIN_EQUIPE': { label: 'Analista Fin.', color: 'text-emerald-600', ring: 'ring-emerald-100' },

  // AJSEFIN
  'AJSEFIN_GESTOR': { label: 'Consultor Jur.', color: 'text-orange-700', ring: 'ring-orange-200' },
  'AJSEFIN_EQUIPE': { label: 'Analista Jur.', color: 'text-orange-600', ring: 'ring-orange-100' },

  // SGP
  'SGP_GESTOR': { label: 'Diretor SGP', color: 'text-teal-700', ring: 'ring-teal-200' },
  'SGP_EQUIPE': { label: 'Analista SGP', color: 'text-teal-600', ring: 'ring-teal-100' },

  // SODPA
  'SODPA_GESTOR': { label: 'Diretor SODPA', color: 'text-pink-700', ring: 'ring-pink-200' },
  'SODPA_EQUIPE': { label: 'Analista SODPA', color: 'text-pink-600', ring: 'ring-pink-100' },

  // SEAD
  'SEAD_GESTOR': { label: 'Sec. Admin', color: 'text-cyan-700', ring: 'ring-cyan-200' },
  'SEAD_EQUIPE': { label: 'Analista SEAD', color: 'text-cyan-600', ring: 'ring-cyan-100' },

  // PRESIDENCIA
  'PRESIDENCIA_GESTOR': { label: 'Chefe Gabinete', color: 'text-slate-800', ring: 'ring-slate-300' },
  'PRESIDENCIA_EQUIPE': { label: 'Assessor Pres.', color: 'text-slate-600', ring: 'ring-slate-200' },

  // STANDARD
  'GESTOR': { label: 'Gestor Unidade', color: 'text-teal-600', ring: 'ring-teal-100' },
  'USER': { label: 'Usuário', color: 'text-gray-600', ring: 'ring-gray-100' },
  'SERVIDOR': { label: 'Servidor', color: 'text-gray-500', ring: 'ring-gray-100' },
};

export const RolesSettings: React.FC = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [availableRoles, setAvailableRoles] = useState<DPerfil[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [selectedRoleId, setSelectedRoleId] = useState<string>(''); 
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Search inside Modal
    const [modalSearchQuery, setModalSearchQuery] = useState('');
    const [modalSearchResults, setModalSearchResults] = useState<Profile[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const fetchAvailableRoles = async () => {
        try {
            const { data, error } = await supabase.from('dperfil').select('*').order('name');
            if (error) console.error('Erro ao buscar papéis:', error);
            if (data) setAvailableRoles(data);
        } catch (err) {
            console.error('Erro inesperado roles:', err);
        }
    };

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 600)); // Delay para UX

            // SELECT Seguro: Traz todos os perfis, mesmo que dperfil seja null
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    dperfil:perfil_id (
                        id,
                        slug,
                        name,
                        description
                    )
                `)
                .order('full_name');
            
            if (error) throw error;
            setProfiles(data || []);
        } catch (error) {
            console.error('Erro ao buscar perfis:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchAvailableRoles(); 
        fetchProfiles(); 
    };

    useEffect(() => {
        fetchAvailableRoles();
        fetchProfiles();
    }, []);

    const getRoleCount = (roleSlug: string) => {
        return profiles.filter(p => (p.dperfil?.slug || 'SERVIDOR') === roleSlug).length;
    };

    const filteredProfiles = profiles.filter(profile => {
        const matchesSearch = (profile.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                              (profile.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                              (profile.matricula?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        
        const currentRole = profile.dperfil?.slug || 'SERVIDOR';
        const matchesRole = selectedRoleFilter === 'ALL' || currentRole === selectedRoleFilter;

        return matchesSearch && matchesRole;
    });

    const handleSearchUsers = async (query: string) => {
        setModalSearchQuery(query);
        if (selectedUser) {
            setSelectedUser(null);
            setSelectedRoleId('');
        }
        if (query.length < 3) {
            setModalSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const { data } = await supabase
                .from('profiles')
                .select(`*, dperfil:perfil_id (id, slug, name)`)
                .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,matricula.ilike.%${query}%`)
                .limit(5);
            setModalSearchResults(data || []);
        } catch (error) {
            console.error('Erro busca:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleOpenModal = (userToEdit?: Profile) => {
        setSaveError(null);
        fetchAvailableRoles();
        if (userToEdit) {
            setSelectedUser(userToEdit);
            setSelectedRoleId(userToEdit.perfil_id || '');
            setModalSearchQuery(userToEdit.full_name);
        } else {
            setSelectedUser(null);
            setSelectedRoleId('');
            setModalSearchQuery('');
            setModalSearchResults([]);
        }
        setIsModalOpen(true);
    };

    const handleSaveRole = async () => {
        if (!selectedUser || !selectedRoleId) return;
        setSaving(true);
        setSaveError(null);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ perfil_id: selectedRoleId }) 
                .eq('id', selectedUser.id);

            if (error) {
                if (error.code === '42501') throw new Error('Permissão negada. Verifique se você é Administrador ou SOSFU.');
                throw error;
            }
            await fetchProfiles();
            setIsModalOpen(false);
        } catch (error: any) {
            console.error('Erro update:', error);
            setSaveError(error.message || 'Erro ao atualizar.');
        } finally {
            setSaving(false);
        }
    };

    const getInitials = (name: string) => (name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    return (
        <div className="animate-in fade-in duration-300 relative font-sans">
             


             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            Gestão de Perfis (RBAC)
                        </h3>
                        <button 
                            onClick={handleRefresh} 
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                            title="Recarregar lista"
                            disabled={loading}
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin text-blue-600' : ''} />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-500">Controle de papéis e permissões dos usuários</p>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <p className="text-xs font-bold text-gray-600">Total: {profiles.length} cadastrados</p>
                    </div>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus size={16} />
                    Conceder Papel
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mb-6">
                {[
                    { group: 'ADMIN', label: 'Admin', icon: Shield },
                    { group: 'SOSFU', label: 'SOSFU', icon: FileBadge }, 
                    { group: 'SEFIN', label: 'SEFIN', icon: DollarSign },
                    { group: 'AJSEFIN', label: 'Jurídico', icon: Scale },
                    { group: 'SGP', label: 'RH', icon: User },
                    { group: 'SODPA', label: 'SODPA', icon: FileText },
                    { group: 'SEAD', label: 'SEAD', icon: Briefcase },
                    { group: 'PRESIDENCIA', label: 'Presid.', icon: Crown },
                    { group: 'GESTOR', label: 'Gestor', icon: UserCircle2 },
                    { group: 'USER', label: 'Usuário', icon: User }
                ].map((item) => {
                    // Count includes both GESTOR and EQUIPE for the group
                    const count = profiles.filter(p => {
                       const role = p.dperfil?.slug || 'SERVIDOR';
                       return role.startsWith(item.group); 
                    }).length;
                    
                    const isActive = selectedRoleFilter === item.group;

                    return (
                        <button 
                            key={item.group} 
                            onClick={() => setSelectedRoleFilter(isActive ? 'ALL' : item.group)}
                            className={`
                                flex flex-col items-center justify-center p-3 rounded-xl border transition-all
                                ${isActive 
                                    ? 'bg-blue-50 border-blue-200 shadow-sm' 
                                    : 'bg-white border-gray-100 hover:border-blue-100 hover:shadow-sm'
                                }
                            `}
                        >
                            <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors
                                ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'}
                            `}>
                                <item.icon size={16} />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-blue-700' : 'text-gray-500'}`}>
                                {item.label}
                            </span>
                             <span className={`text-[10px] font-bold bg-gray-100 px-1.5 rounded-full mt-1 ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-400'}`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* List */}
            <div className="space-y-2">
                {loading ? (
                    <div className="p-12 flex justify-center items-center text-gray-500 gap-2 bg-white rounded-xl border border-gray-100 animate-pulse">
                        <Loader2 size={20} className="animate-spin text-blue-600" /> Carregando usuários...
                    </div>
                ) : filteredProfiles.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 text-sm bg-white rounded-xl border border-gray-100">
                        Nenhum usuário encontrado.
                    </div>
                ) : (
                    filteredProfiles.map((user) => {
                        // Fallback para SERVIDOR se dperfil for null (usuário órfão)
                        const roleSlug = user.dperfil?.slug || 'SERVIDOR';
                        const style = ROLE_STYLES[roleSlug] || ROLE_STYLES['SERVIDOR'];
                        const initials = getInitials(user.full_name);

                        return (
                            <div key={user.id} className="group bg-white border border-gray-100 rounded-lg p-3 flex items-center justify-between hover:border-blue-200 hover:shadow-sm transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                                        {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : initials}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-gray-800 text-sm uppercase truncate">{user.full_name}</p>
                                        <p className="text-xs text-gray-500 truncate flex items-center gap-1.5">
                                            {user.email} 
                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                            <span className="font-mono text-gray-400">{user.matricula || 'SEM MATRÍCULA'}</span>
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleOpenModal(user)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wide transition-colors bg-white border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${style.color.replace('text-', 'bg-')}`}></span>
                                    {user.dperfil?.name || 'Servidor (Sem Perfil)'}
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-white">
                                <Shield size={20} className="text-blue-100" />
                                <h3 className="text-base font-bold">Conceder Novo Papel</h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            {saveError && <div className="p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 text-xs font-medium flex items-center gap-2"><AlertCircle size={14} />{saveError}</div>}
                            
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Buscar Servidor</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input type="text" value={modalSearchQuery} onChange={(e) => handleSearchUsers(e.target.value)} placeholder="Digite nome, matrícula ou email..." className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                                    {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 size={16} className="animate-spin text-blue-500" /></div>}
                                </div>
                                {modalSearchQuery.length >= 3 && !selectedUser && (
                                    <div className="absolute z-10 w-[calc(100%-3rem)] mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                        {modalSearchResults.map(user => (
                                            <button key={user.id} onClick={() => { setSelectedUser(user); setModalSearchQuery(''); setModalSearchResults([]); if (user.perfil_id) setSelectedRoleId(user.perfil_id); }} className="w-full text-left p-3 flex items-center gap-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0">
                                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold">{getInitials(user.full_name)}</div>
                                                <div><p className="text-sm font-semibold text-gray-800">{user.full_name}</p><p className="text-xs text-gray-500">{user.email}</p></div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedUser && (
                                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 font-bold border border-blue-100">{getInitials(selectedUser.full_name)}</div>
                                        <div><p className="text-sm font-bold text-blue-900 line-clamp-1">{selectedUser.full_name}</p><p className="text-xs text-blue-600">{selectedUser.email}</p></div>
                                    </div>
                                    <button onClick={() => { setSelectedUser(null); setModalSearchQuery(''); setSelectedRoleId(''); }} className="text-blue-400 hover:text-blue-600 p-1"><X size={16} /></button>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Papel a Conceder</label>
                                <div className="relative">
                                    <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)} disabled={!selectedUser} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 font-medium text-gray-700">
                                        <option value="">Selecione um papel...</option>
                                        {availableRoles.map(role => (<option key={role.id} value={role.id}>{role.name}</option>))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={16} />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">Cancelar</button>
                            <button onClick={handleSaveRole} disabled={saving || !selectedUser || !selectedRoleId} className={`px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-all flex items-center gap-2 ${(saving || !selectedUser || !selectedRoleId) ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                {saving ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
