import React, { useState, useEffect } from 'react';
import { Shield, Crown, Gavel, Scale, FileBadge, User, Search, Filter, Edit3, Check, X, Loader2, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Tipo para a nova tabela de perfil
interface DPerfil {
    id: string;
    slug: string;
    name: string;
    description: string;
}

// Tipo atualizado para o Profile com o relacionamento
interface Profile {
  id: string;
  full_name: string;
  email: string;
  matricula: string;
  status: string;
  avatar_url: string | null;
  perfil_id: string;
  // O Supabase retorna o objeto relacionado aqui
  dperfil?: DPerfil; 
}

// Configuração VISUAL dos Papéis (Mapeamento Slug -> Estilo)
// A lógica de negócio agora vem do banco (dperfil), aqui fica apenas o estilo.
const ROLE_STYLES: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  'ADMIN': { icon: Crown, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  'PRESIDENCIA': { icon: Gavel, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  'SEFIN': { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  'AJSEFIN': { icon: Scale, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  'SGP': { icon: User, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  'SOSFU': { icon: FileBadge, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  'SERVIDOR': { icon: User, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
};

export const RolesSettings: React.FC = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [availableRoles, setAvailableRoles] = useState<DPerfil[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [selectedRoleId, setSelectedRoleId] = useState<string>(''); // Agora armazena o UUID do perfil
    const [saving, setSaving] = useState(false);

    // 1. Fetch Perfis Disponíveis (Tabela dperfil)
    const fetchAvailableRoles = async () => {
        const { data, error } = await supabase
            .from('dperfil')
            .select('*')
            .order('name');
        
        if (data) setAvailableRoles(data);
        if (error) console.error("Erro ao buscar dperfil:", error);
    };

    // 2. Fetch Usuários com Relacionamento
    const fetchProfiles = async () => {
        setLoading(true);
        try {
            // JOIN: Traz dados da tabela dperfil associada
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

    useEffect(() => {
        fetchAvailableRoles();
        fetchProfiles();
    }, []);

    // Estatísticas Dinâmicas baseadas no slug vindo do relacionamento
    const getRoleCount = (roleSlug: string) => {
        return profiles.filter(p => p.dperfil?.slug === roleSlug).length;
    };

    // Filtragem
    const filteredProfiles = profiles.filter(profile => 
        (profile.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (profile.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (profile.matricula?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    // Ações do Modal
    const handleOpenEdit = (profile: Profile) => {
        setSelectedProfile(profile);
        setSelectedRoleId(profile.perfil_id || ''); 
        setIsModalOpen(true);
    };

    const handleSaveRole = async () => {
        if (!selectedProfile || !selectedRoleId) return;
        setSaving(true);
        try {
            // Atualiza o perfil_id, não mais uma string 'role'
            const { error } = await supabase
                .from('profiles')
                .update({ perfil_id: selectedRoleId }) 
                .eq('id', selectedProfile.id);

            if (error) throw error;
            
            // Recarrega para garantir dados frescos com o join correto
            await fetchProfiles(); 
            setIsModalOpen(false);
        } catch (error) {
            console.error('Erro ao atualizar papel:', error);
            alert('Erro ao atualizar. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    const getInitials = (name: string) => {
        return (name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };

    return (
        <div className="animate-in fade-in duration-300 relative">
             {/* Header */}
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Shield size={22} className="text-blue-600" />
                        Gestão de Perfis (RBAC)
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Gerencie os papéis, níveis de acesso e permissões através da tabela <b>dperfil</b>.</p>
                </div>
                <button 
                    onClick={() => {
                        const searchInput = document.getElementById('search-users');
                        searchInput?.focus();
                    }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                    <Search size={16} />
                    Buscar Usuário
                </button>
            </div>

            {/* Role Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
                {/* Iteramos sobre ROLE_STYLES para manter a ordem visual, mas usamos dados reais */}
                {Object.entries(ROLE_STYLES).map(([slug, style]) => {
                    const Icon = style.icon;
                    const count = getRoleCount(slug);
                    const isActive = count > 0;
                    // Encontrar o nome real no banco se disponível, senão fallback
                    const dbRole = availableRoles.find(r => r.slug === slug);
                    const displayName = dbRole ? dbRole.name : slug;
                    
                    return (
                        <div key={slug} className={`
                            border rounded-xl p-3 text-center transition-all duration-200
                            ${isActive ? 'bg-white border-gray-200 shadow-sm hover:shadow-md' : 'bg-gray-50 border-gray-100 opacity-60'}
                        `}>
                            <div className={`mx-auto w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${style.bg} ${style.color}`}>
                                <Icon size={16} />
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 truncate px-1" title={displayName}>
                                {displayName}
                            </p>
                            <p className="text-xl font-bold text-gray-800">{count}</p>
                        </div>
                    )
                })}
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white p-4 rounded-t-xl border border-gray-200 border-b-0 flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        id="search-users"
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nome, e-mail ou matrícula..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors">
                    <Filter size={16} />
                    Filtrar
                </button>
            </div>

            {/* Users List Table */}
            <div className="border border-gray-200 rounded-b-xl overflow-hidden bg-white shadow-sm">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <div className="col-span-5">Usuário / Matrícula</div>
                    <div className="col-span-4">Papel Atual (dperfil)</div>
                    <div className="col-span-2 text-center">Status</div>
                    <div className="col-span-1 text-right">Ação</div>
                </div>
                
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-8 flex justify-center items-center text-gray-500 gap-2">
                            <Loader2 size={20} className="animate-spin" />
                            Carregando usuários...
                        </div>
                    ) : filteredProfiles.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            Nenhum usuário encontrado com os termos pesquisados.
                        </div>
                    ) : (
                        filteredProfiles.map((user) => {
                            // Dados vindos do JOIN
                            const roleSlug = user.dperfil?.slug || 'SERVIDOR';
                            const roleName = user.dperfil?.name || 'Servidor';
                            
                            const style = ROLE_STYLES[roleSlug] || ROLE_STYLES['SERVIDOR'];
                            const RoleIcon = style.icon;

                            return (
                                <div key={user.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors group">
                                    {/* User Info */}
                                    <div className="col-span-5 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-white shadow-sm flex items-center justify-center text-gray-500 font-bold text-xs flex-shrink-0 overflow-hidden">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                                            ) : (
                                                getInitials(user.full_name)
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-800 text-sm truncate">{user.full_name}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="truncate max-w-[150px]">{user.email}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                <span className="font-mono">Mat. {user.matricula || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Role Badge */}
                                    <div className="col-span-4 flex items-center">
                                        <div className={`
                                            inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border text-xs font-bold uppercase transition-colors
                                            ${style.bg} ${style.color} ${style.border}
                                        `}>
                                            <RoleIcon size={14} />
                                            {roleName}
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div className="col-span-2 text-center">
                                        <span className={`
                                            inline-flex px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide
                                            ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                                        `}>
                                            {user.status === 'ACTIVE' ? 'ATIVO' : user.status || 'INATIVO'}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-1 flex justify-end">
                                        <button 
                                            onClick={() => handleOpenEdit(user)}
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Editar Papel"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* EDIT ROLE MODAL */}
            {isModalOpen && selectedProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                        
                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Editar Permissões</h3>
                                <p className="text-xs text-gray-500">Selecione um perfil da tabela <b>dperfil</b></p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6">
                            {/* User Summary */}
                            <div className="flex items-center gap-4 mb-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                                <div className="w-12 h-12 rounded-full bg-white border border-blue-100 shadow-sm flex items-center justify-center text-blue-600 font-bold text-sm overflow-hidden">
                                     {selectedProfile.avatar_url ? (
                                        <img src={selectedProfile.avatar_url} alt={selectedProfile.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        getInitials(selectedProfile.full_name)
                                    )}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">{selectedProfile.full_name}</p>
                                    <p className="text-xs text-gray-500">{selectedProfile.email}</p>
                                    <p className="text-[10px] font-bold text-blue-500 uppercase mt-1">Matrícula: {selectedProfile.matricula}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-bold text-gray-700">Selecione o Papel (dperfil)</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                    {availableRoles.map((role) => {
                                        const isSelected = selectedRoleId === role.id;
                                        // Usa o style map para cores, fallback para cinza se for um novo role sem estilo definido
                                        const style = ROLE_STYLES[role.slug] || ROLE_STYLES['SERVIDOR'];
                                        const Icon = style.icon;
                                        
                                        return (
                                            <button
                                                key={role.id}
                                                onClick={() => setSelectedRoleId(role.id)}
                                                className={`
                                                    flex items-center gap-3 p-3 rounded-xl border text-left transition-all relative overflow-hidden
                                                    ${isSelected 
                                                        ? `border-${style.color.split('-')[1]}-500 bg-${style.color.split('-')[1]}-50 ring-1 ring-${style.color.split('-')[1]}-500` 
                                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                                                `}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.bg} ${style.color} flex-shrink-0`}>
                                                    <Icon size={16} />
                                                </div>
                                                <div>
                                                    <p className={`text-xs font-bold uppercase ${isSelected ? style.color : 'text-gray-700'}`}>{role.slug}</p>
                                                    <p className="text-[10px] text-gray-500 truncate w-32">{role.name}</p>
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 text-green-500">
                                                        <Check size={14} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-800 flex gap-2">
                                <Shield size={14} className="flex-shrink-0 mt-0.5" />
                                <p>
                                    Alterar o papel deste usuário modificará imediatamente suas permissões de acesso e visualização nos módulos do sistema.
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveRole}
                                disabled={saving}
                                className={`
                                    px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg shadow-lg shadow-blue-200 
                                    hover:bg-blue-700 transition-all flex items-center gap-2
                                    ${saving ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5'}
                                `}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} />
                                        Salvar Alterações
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