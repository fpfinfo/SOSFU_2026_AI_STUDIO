import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Loader2, User, Check, AlertCircle, Trash2, Shield, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Definição dos tipos
interface TeamMember {
  id: string; // user_id
  full_name: string;
  email: string;
  matricula: string;
  avatar_url: string | null;
  funcao: string; // From team_members
  role_slug: string; // From profiles or sys_roles
}

const MODULE_CONFIGS: Record<string, { label: string; roles: string[]; color: string; funcoes: string[] }> = {
    'SOSFU': {
        label: 'Equipe Técnica SOSFU',
        roles: ['SOSFU_GESTOR', 'SOSFU_EQUIPE', 'ADMIN'],
        color: 'blue',
        funcoes: ['Analista SOSFU', 'Chefe SOSFU', 'Técnico de Contas', 'Estagiário']
    },
    'SODPA': {
        label: 'Equipe SODPA',
        roles: ['SODPA_GESTOR', 'SODPA_EQUIPE'],
        color: 'sky',
        funcoes: ['Analista SODPA', 'Chefe SODPA', 'Técnico de Diárias', 'Estagiário']
    },
    'RESSARCIMENTO': {
        label: 'Equipe de Ressarcimento',
        roles: ['RESSARCIMENTO_GESTOR', 'RESSARCIMENTO_EQUIPE'],
        color: 'emerald',
        funcoes: ['Analista de Ressarcimento', 'Chefe de Divisão', 'Técnico Financeiro', 'Estagiário']
    },
    'AJSEFIN': {
        label: 'Equipe Jurídica (AJSEFIN)',
        roles: ['AJSEFIN_GESTOR', 'AJSEFIN_EQUIPE'],
        color: 'teal',
        funcoes: ['Assessor Jurídico', 'Analista Judiciário', 'Técnico Judiciário', 'Estagiário']
    },
    'SEFIN': {
        label: 'Equipe Financeira (SEFIN)',
        roles: ['SEFIN_GESTOR', 'SEFIN_EQUIPE'],
        color: 'indigo',
        funcoes: ['Secretário de Finanças', 'Diretor Financeiro', 'Técnico Financeiro', 'Analista de Contas']
    }
};

export const UsersSettings: React.FC<{ userProfile?: any }> = ({ userProfile }) => {
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Context Determination
    const [currentModule, setCurrentModule] = useState<string | null>(null);

    // Modal State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [selectedFuncao, setSelectedFuncao] = useState<string>('');
    const [modalError, setModalError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (userProfile) {
            const slug = userProfile.dperfil?.slug || '';
            if (slug.includes('SODPA')) setCurrentModule('SODPA');
            else if (slug.includes('RESSARCIMENTO')) setCurrentModule('RESSARCIMENTO');
            else if (slug.includes('AJSEFIN')) setCurrentModule('AJSEFIN');
            else if (slug.includes('SEFIN')) setCurrentModule('SEFIN');
            else if (slug.includes('SOSFU') || slug === 'ADMIN') setCurrentModule('SOSFU');
        }
    }, [userProfile]);

    const fetchTeamMembers = async () => {
        if (!currentModule) return;
        setLoading(true);
        try {
            // Fetch from team_members
            const { data: teamRows, error } = await supabase
                .from('team_members')
                .select('user_id, funcao')
                .eq('module', currentModule);

            if (error) throw error;

            if (!teamRows || teamRows.length === 0) {
                setTeamMembers([]);
                return;
            }

            const userIds = teamRows.map(r => r.user_id);
            const { data: profiles } = await supabase
                .from('profiles')
                .select(`id, full_name, email, matricula, avatar_url, dperfil:perfil_id(slug)`)
                .in('id', userIds);

            const profileMap = new Map((profiles || []).map(p => [p.id, p]));

            const mapped: TeamMember[] = teamRows.map(r => {
                const p = profileMap.get(r.user_id);
                return {
                    id: r.user_id,
                    full_name: p?.full_name || 'Usuário Desconhecido',
                    email: p?.email || '',
                    matricula: p?.matricula || '',
                    avatar_url: p?.avatar_url || null,
                    funcao: r.funcao || 'Membro',
                    role_slug: (p as any)?.dperfil?.slug || ''
                };
            });

            setTeamMembers(mapped.sort((a, b) => a.full_name.localeCompare(b.full_name)));
        } catch (error) {
            console.error('Erro ao buscar equipe:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeamMembers();
    }, [currentModule]);

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
                .select(`id, full_name, email, matricula, avatar_url, dperfil:perfil_id(slug, name)`)
                .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,matricula.ilike.%${query}%`)
                .limit(5);

            if (error) throw error;
            
            // Filter out already added members
            const memberIds = new Set(teamMembers.map(m => m.id));
            const filtered = (data || []).filter(u => !memberIds.has(u.id));
            
            setSearchResults(filtered);
        } catch (error) {
            console.error('Erro na busca:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddUserToTeam = async () => {
        if (!selectedUser || !currentModule || !selectedFuncao) return;
        
        setSaving(true);
        setModalError('');

        try {
            // 1. Insert into team_members
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from('team_members').upsert({
                module: currentModule,
                user_id: selectedUser.id,
                added_by: user?.id,
                funcao: selectedFuncao,
            }, { onConflict: 'module,user_id' });

            if (error) throw error;

            // 2. Optional: If SOSFU, maybe update profile role (Logic preserved if strict legacy compatibility needed, but mostly relying on team_members now)
            // Ideally, we shouldn't touch profiles unless necessary for global permissions.
            // Keeping it clean: managing team_members only.

            await fetchTeamMembers();
            closeModal();
        } catch (error: any) {
            console.error('Erro ao adicionar:', error);
            setModalError(error.message || 'Erro ao salvar membro.');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveUser = async (userId: string) => {
        if (!currentModule) return;
        if (!confirm('Tem certeza que deseja remover este membro da equipe?')) return;

        setProcessingId(userId);
        try {
            const { error } = await supabase
                .from('team_members')
                .delete()
                .eq('module', currentModule)
                .eq('user_id', userId);

            if (error) throw error;

            setTeamMembers(prev => prev.filter(p => p.id !== userId));
        } catch (error: any) {
            console.error('Erro ao remover:', error);
            alert(`Erro ao remover: ${error.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedUser(null);
        setSelectedFuncao('');
        setModalError('');
    };

    const getInitials = (name: string) => (name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    if (!currentModule) return <div className="p-8 text-center text-gray-500">Módulo não identificado ou sem permissão de gestão de equipe.</div>;

    const config = MODULE_CONFIGS[currentModule] || MODULE_CONFIGS['SOSFU'];
    const themeColor = config.color;

    return (
        <div className="animate-in fade-in duration-300 relative font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h3 className={`text-xl font-bold text-${themeColor}-600 flex items-center gap-2`}>
                        {config.label}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Gerencie os membros da equipe {currentModule}.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className={`flex items-center gap-2 bg-${themeColor}-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-${themeColor}-700 transition-colors shadow-lg shadow-${themeColor}-200`}
                >
                    <Plus size={18} />
                    Adicionar Membro
                </button>
            </div>

            {/* Tabela Clean */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <div className="col-span-6">Nome / Email</div>
                    <div className="col-span-4">Função (Equipe)</div>
                    <div className="col-span-2 text-right">Ações</div>
                </div>

                <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-12 flex justify-center text-gray-500 gap-2 items-center">
                            <Loader2 className="animate-spin" size={20} /> Carregando equipe...
                        </div>
                    ) : teamMembers.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 italic bg-gray-50/30">
                            Nenhum membro encontrado. Use o botão "Adicionar Membro".
                        </div>
                    ) : (
                        teamMembers.map((member) => (
                            <div key={member.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors group">
                                {/* Nome */}
                                <div className="col-span-6 flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full bg-${themeColor}-100 flex items-center justify-center text-${themeColor}-600 font-bold text-xs shadow-sm flex-shrink-0 border-2 border-white`}>
                                        {member.avatar_url ? (
                                            <img src={member.avatar_url} className="w-full h-full rounded-full object-cover" />
                                        ) : getInitials(member.full_name)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-800 uppercase truncate">{member.full_name}</p>
                                        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                                            {member.email}
                                        </p>
                                    </div>
                                </div>

                                {/* Função */}
                                <div className="col-span-4">
                                    <span className={`
                                        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border
                                        bg-${themeColor}-50 text-${themeColor}-700 border-${themeColor}-100
                                    `}>
                                        <Briefcase size={12} />
                                        {member.funcao}
                                    </span>
                                </div>

                                {/* Ações */}
                                <div className="col-span-2 flex justify-end gap-2">
                                    <button 
                                        onClick={() => handleRemoveUser(member.id)}
                                        disabled={processingId === member.id}
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors text-xs font-medium flex items-center gap-1 group-hover:opacity-100 opacity-60"
                                        title="Remover da Equipe"
                                    >
                                        {processingId === member.id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={16} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* MODAL ADICIONAR MEMBRO */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                        
                        {/* Header */}
                        <div className={`bg-${themeColor}-600 px-6 py-4 flex items-center justify-between`}>
                            <div className="flex items-center gap-2 text-white">
                                <Shield size={20} className={`text-${themeColor}-100`} />
                                <h3 className="text-base font-bold">Adicionar Membro ({currentModule})</h3>
                            </div>
                            <button onClick={closeModal} className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Busca */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Buscar Usuário</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="text" 
                                        value={searchQuery}
                                        onChange={(e) => handleSearchUsers(e.target.value)}
                                        placeholder="Nome, matrícula ou e-mail..." 
                                        className={`w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-${themeColor}-500/20 focus:border-${themeColor}-500 transition-all`}
                                    />
                                    {isSearching && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <Loader2 size={16} className={`animate-spin text-${themeColor}-500`} />
                                        </div>
                                    )}
                                </div>

                                {/* Resultados Dropdown */}
                                {searchQuery.length >= 3 && !selectedUser && (
                                    <div className="absolute z-10 w-[calc(100%-3rem)] mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                        {searchResults.length === 0 && !isSearching ? (
                                            <div className="p-4 text-center text-sm text-gray-500">Nenhum usuário disponível encontrado.</div>
                                        ) : (
                                            searchResults.map(user => (
                                                <button 
                                                    key={user.id}
                                                    onClick={() => setSelectedUser(user)}
                                                    className={`w-full text-left p-3 flex items-center gap-3 hover:bg-${themeColor}-50 transition-colors border-b border-gray-50 last:border-0`}
                                                >
                                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold">
                                                        {getInitials(user.full_name)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-800">{user.full_name}</p>
                                                        <p className="text-xs text-gray-500">{user.email}</p>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Selecionado */}
                            {selectedUser && (
                                <div className={`flex items-center justify-between p-3 bg-${themeColor}-50 border border-${themeColor}-100 rounded-lg animate-in fade-in slide-in-from-top-2`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full bg-white text-${themeColor}-600 border border-${themeColor}-100 flex items-center justify-center font-bold text-sm overflow-hidden`}>
                                            {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} className="w-full h-full object-cover" /> : getInitials(selectedUser.full_name)}
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold text-${themeColor}-900 line-clamp-1`}>{selectedUser.full_name}</p>
                                            <p className={`text-xs text-${themeColor}-600`}>{selectedUser.email}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => { setSelectedUser(null); setSearchQuery(''); }} className={`text-${themeColor}-400 hover:text-${themeColor}-600 p-1`}>
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            {/* Função Selection */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Selecione a Função</label>
                                <select 
                                    value={selectedFuncao}
                                    onChange={(e) => setSelectedFuncao(e.target.value)}
                                    className={`w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-${themeColor}-500/20 focus:border-${themeColor}-500 transition-all`}
                                >
                                    <option value="">Selecione...</option>
                                    {config.funcoes.map(f => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            </div>

                            {modalError && (
                                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                                    <AlertCircle size={16} />
                                    {modalError}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={closeModal} className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                                Cancelar
                            </button>
                            <button 
                                onClick={handleAddUserToTeam}
                                disabled={!selectedUser || !selectedFuncao || saving}
                                className={`
                                    px-6 py-2 text-sm font-bold text-white bg-${themeColor}-600 rounded-lg shadow-sm 
                                    hover:bg-${themeColor}-700 transition-all flex items-center gap-2
                                    ${(saving || !selectedUser || !selectedFuncao) ? 'opacity-70 cursor-not-allowed' : ''}
                                `}
                            >
                                {saving ? <Loader2 className="animate-spin" size={16} /> : (
                                    <>
                                        <Check size={16} />
                                        Confirmar
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