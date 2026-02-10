
import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Loader2, User, Check, AlertCircle, Trash2, Shield } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

// Definition ensures type safety
interface Profile {
  id: string;
  full_name: string;
  email: string;
  matricula: string;
  status: string;
  avatar_url: string | null;
  perfil_id: string;
  dperfil?: {
    id: string;
    slug: string;
    name: string;
  };
}

export const SodpaUsersSettings: React.FC = () => {
    const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Modal State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [modalError, setModalError] = useState('');
    const [saving, setSaving] = useState(false);

    // Role IDs Cache
    const [roleIds, setRoleIds] = useState<{ SERVIDOR: string | null, SODPA_EQUIPE: string | null }>({ SERVIDOR: null, SODPA_EQUIPE: null });

    // 1. Fetch Role IDs
    const fetchRoleIds = async () => {
        const { data } = await supabase.from('dperfil').select('id, slug');
        if (data) {
            const servidor = data.find(r => r.slug === 'SERVIDOR')?.id || null;
            const sodpaEquipe = data.find(r => r.slug === 'SODPA_EQUIPE')?.id || null;
            setRoleIds({ SERVIDOR: servidor, SODPA_EQUIPE: sodpaEquipe });
        }
    };

    // 2. Fetch SODPA Team Members
    const fetchTeamMembers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    dperfil!inner (id, slug, name)
                `)
                .in('dperfil.slug', ['SODPA_GESTOR', 'SODPA_EQUIPE', 'ADMIN', 'SODPA']) 
                .order('full_name');
            
            if (error) throw error;
            setTeamMembers(data || []);
        } catch (error) {
            console.error('Error fetching SODPA team:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoleIds();
        fetchTeamMembers();
    }, []);

    // 3. Search Users to Add (Excluding existing SODPA members)
    const handleSearchUsers = async (query: string) => {
        setSearchQuery(query);
        setSelectedUser(null);
        
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select(`*, dperfil:perfil_id(slug, name)`)
                .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,matricula.ilike.%${query}%`)
                .limit(5);

            if (error) throw error;
            
            const filtered = data?.filter(u => {
                const slug = u.dperfil?.slug || '';
                return !['SODPA_GESTOR', 'SODPA_EQUIPE', 'ADMIN', 'SODPA'].includes(slug);
            }) || [];
            
            setSearchResults(filtered);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // 4. Add User to SODPA Team
    const handleAddUserToTeam = async () => {
        if (!selectedUser || !roleIds.SODPA_EQUIPE) {
            setModalError('Configuration Error: Role "Analista SODPA" (SODPA_EQUIPE) not found.');
            return;
        }
        
        setSaving(true);
        setModalError('');

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ perfil_id: roleIds.SODPA_EQUIPE })
                .eq('id', selectedUser.id);

            if (error) throw error;

            await fetchTeamMembers();
            closeModal();
        } catch (error: any) {
            console.error('Error adding user:', error);
            setModalError(error.message || 'Error updating permissions.');
        } finally {
            setSaving(false);
        }
    };

    // 5. Remove User (Revert to SERVIDOR)
    const handleRemoveUser = async (user: Profile) => {
        if (!roleIds.SERVIDOR) {
            console.error('SERVER Role ID missing.');
            return;
        }

        if (!confirm(`Are you sure? ${user.full_name} will be removed from SODPA Team and revert to SERVIDOR role.`)) return;

        setProcessingId(user.id);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ perfil_id: roleIds.SERVIDOR })
                .eq('id', user.id);

            if (error) {
                 if (error.code === '42501') {
                     console.error('Permission denied.');
                 } else {
                     throw error;
                 }
                 return;
            }

            setTeamMembers(prev => prev.filter(p => p.id !== user.id));
        } catch (error: any) {
            console.error('Error removing user:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedUser(null);
        setModalError('');
    };

    const getInitials = (name: string) => (name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    return (
        <div className="animate-in fade-in duration-300 relative font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        Equipe Técnica SODPA
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Gerencie exclusivamente os membros com acesso ao módulo SODPA.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-pink-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-pink-700 transition-colors shadow-lg shadow-pink-200"
                >
                    <Plus size={18} />
                    Adicionar Usuário
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <div className="col-span-5">Nome / Email</div>
                    <div className="col-span-3">Função (Perfil)</div>
                    <div className="col-span-2 text-center">Status</div>
                    <div className="col-span-2 text-right">Ações</div>
                </div>

                <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-12 flex justify-center text-gray-500 gap-2 items-center">
                            <Loader2 className="animate-spin" size={20} /> Carregando equipe...
                        </div>
                    ) : teamMembers.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 italic bg-gray-50/30">
                            Nenhum membro técnico encontrado.
                        </div>
                    ) : (
                        teamMembers.map((user) => (
                            <div key={user.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors group">
                                <div className="col-span-5 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0 border-2 border-white">
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} className="w-full h-full rounded-full object-cover" />
                                        ) : getInitials(user.full_name)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-800 uppercase truncate">{user.full_name}</p>
                                        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>

                                <div className="col-span-3">
                                    <span className={`
                                        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border
                                        ${user.dperfil?.slug === 'ADMIN' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-pink-50 text-pink-700 border-pink-100'}
                                    `}>
                                        <Shield size={12} />
                                        {user.dperfil?.name || 'SODPA'}
                                    </span>
                                </div>

                                <div className="col-span-2 text-center">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                        user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {user.status === 'ACTIVE' ? 'ATIVO' : 'INATIVO'}
                                    </span>
                                </div>

                                <div className="col-span-2 flex justify-end gap-2">
                                    <button 
                                        onClick={() => handleRemoveUser(user)}
                                        disabled={processingId === user.id}
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors text-xs font-medium flex items-center gap-1 group-hover:opacity-100 opacity-60"
                                        title="Remover da Equipe"
                                    >
                                        {processingId === user.id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <>
                                                <Trash2 size={16} />
                                                <span className="hidden md:inline">Remover</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                        <div className="bg-pink-600 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-white">
                                <Shield size={20} className="text-pink-100" />
                                <h3 className="text-base font-bold">Adicionar à Equipe SODPA</h3>
                            </div>
                            <button onClick={closeModal} className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-pink-50 border border-pink-100 rounded-lg p-3 text-sm text-pink-800 flex gap-2">
                                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Atenção!</p>
                                    <p>O usuário selecionado terá seu perfil alterado para <strong>Analista SODPA</strong>.</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Buscar Usuário</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="text" 
                                        value={searchQuery}
                                        onChange={(e) => handleSearchUsers(e.target.value)}
                                        placeholder="Nome, matrícula ou e-mail..." 
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                                    />
                                    {isSearching && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <Loader2 size={16} className="animate-spin text-pink-500" />
                                        </div>
                                    )}
                                </div>

                                {searchQuery.length >= 3 && !selectedUser && (
                                    <div className="absolute z-10 w-[calc(100%-3rem)] mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                        {searchResults.length === 0 && !isSearching ? (
                                            <div className="p-4 text-center text-sm text-gray-500">Nenhum usuário disponível.</div>
                                        ) : (
                                            searchResults.map(user => (
                                                <button 
                                                    key={user.id}
                                                    onClick={() => setSelectedUser(user)}
                                                    className="w-full text-left p-3 flex items-center gap-3 hover:bg-pink-50 transition-colors border-b border-gray-50 last:border-0"
                                                >
                                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold">
                                                        {getInitials(user.full_name)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-800">{user.full_name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-500">{user.email}</span>
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 border border-gray-200 uppercase">{user.dperfil?.name || 'S/ Perfil'}</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedUser && (
                                <div className="flex items-center justify-between p-3 bg-pink-50 border border-pink-100 rounded-lg animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white text-pink-600 border border-pink-100 flex items-center justify-center font-bold text-sm overflow-hidden">
                                            {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} className="w-full h-full object-cover" /> : getInitials(selectedUser.full_name)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-pink-900 line-clamp-1">{selectedUser.full_name}</p>
                                            <p className="text-xs text-pink-600">{selectedUser.email}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => { setSelectedUser(null); setSearchQuery(''); }} className="text-pink-400 hover:text-pink-600 p-1">
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            {modalError && (
                                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                                    <AlertCircle size={16} />
                                    {modalError}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={closeModal} className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                                Cancelar
                            </button>
                            <button 
                                onClick={handleAddUserToTeam}
                                disabled={!selectedUser || saving}
                                className={`
                                    px-6 py-2 text-sm font-bold text-white bg-pink-600 rounded-lg shadow-sm 
                                    hover:bg-pink-700 transition-all flex items-center gap-2
                                    ${saving || !selectedUser ? 'opacity-70 cursor-not-allowed' : ''}
                                `}
                            >
                                {saving ? <Loader2 className="animate-spin" size={16} /> : (
                                    <>
                                        <Check size={16} />
                                        Confirmar Inclusão
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
