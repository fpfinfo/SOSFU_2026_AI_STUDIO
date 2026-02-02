import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Loader2, User, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Definição dos tipos baseados no banco de dados
interface Profile {
  id: string;
  full_name: string;
  email: string;
  matricula: string;
  role: string;
  status: string;
  avatar_url: string;
}

export const UsersSettings: React.FC = () => {
    const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Estados do Modal
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [selectedRole, setSelectedRole] = useState('ANALISTA');
    const [modalError, setModalError] = useState('');
    const [saving, setSaving] = useState(false);

    // Buscar membros da equipe (Role != SERVIDOR)
    const fetchTeamMembers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .neq('role', 'SERVIDOR') // Assume que 'SERVIDOR' é o papel padrão de quem não é da equipe
                .order('full_name');
            
            if (error) throw error;
            setTeamMembers(data || []);
        } catch (error) {
            console.error('Erro ao buscar equipe:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeamMembers();
    }, []);

    // Buscar usuários para adicionar (Role == SERVIDOR)
    const handleSearchUsers = async (query: string) => {
        setSearchQuery(query);
        setSelectedUser(null); // Limpa seleção ao pesquisar
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'SERVIDOR') // Busca apenas quem ainda não é da equipe
                .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,matricula.ilike.%${query}%`)
                .limit(5);

            if (error) throw error;
            setSearchResults(data || []);
        } catch (error) {
            console.error('Erro na busca:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // Salvar novo membro da equipe
    const handleAddUser = async () => {
        if (!selectedUser) {
            setModalError('Por favor, selecione um servidor.');
            return;
        }
        
        setSaving(true);
        setModalError('');

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: selectedRole })
                .eq('id', selectedUser.id);

            if (error) throw error;

            // Sucesso
            await fetchTeamMembers();
            closeModal();
        } catch (error) {
            console.error('Erro ao adicionar usuário:', error);
            setModalError('Erro ao salvar. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    // Remover membro (Voltar para SERVIDOR)
    const handleRemoveUser = async (userId: string) => {
        if (!confirm('Tem certeza que deseja remover este usuário da equipe? Ele voltará a ser um SERVIDOR comum.')) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: 'SERVIDOR' })
                .eq('id', userId);

            if (error) throw error;
            fetchTeamMembers(); // Recarrega lista
        } catch (error) {
            console.error('Erro ao remover usuário:', error);
            alert('Erro ao remover usuário.');
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedUser(null);
        setSelectedRole('ANALISTA');
        setModalError('');
    };

    // Utilitário para iniciais
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    // Cores baseadas no role
    const getRoleColor = (role: string) => {
        switch (role) {
            case 'ADMIN': return 'bg-red-500';
            case 'SOSFU': return 'bg-orange-500';
            case 'SEFIN': return 'bg-green-500';
            default: return 'bg-cyan-500';
        }
    };

    return (
        <div className="animate-in fade-in duration-300 relative">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-gray-800">Equipe SOSFU</h3>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                >
                    <Plus size={16} />
                    Adicionar Usuário
                </button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Nome</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Função</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                             <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-2">
                                        <Loader2 className="animate-spin" size={20} />
                                        Carregando equipe...
                                    </div>
                                </td>
                            </tr>
                        ) : teamMembers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic">
                                    Nenhum membro na equipe técnica ainda. Adicione usuários.
                                </td>
                            </tr>
                        ) : (
                            teamMembers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full ${getRoleColor(user.role)} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                                                {user.avatar_url && user.avatar_url.length > 10 ? (
                                                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    getInitials(user.full_name)
                                                )}
                                            </div>
                                            <div>
                                                <span className="font-bold text-gray-800 text-sm block">{user.full_name}</span>
                                                <span className="text-xs text-gray-400">{user.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                                            user.role === 'ADMIN' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-100 text-gray-600 border-gray-200'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                                            user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {user.status === 'ACTIVE' ? 'ATIVO' : user.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button className="text-blue-600 hover:text-blue-800 font-semibold mr-4">Editar</button>
                                        <button 
                                            onClick={() => handleRemoveUser(user.id)}
                                            className="text-red-500 hover:text-red-700 font-semibold"
                                        >
                                            Remover
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL ADICIONAR USUÁRIO */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        {/* Header Modal */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">Novo Usuário</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body Modal */}
                        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                            
                            {/* Busca */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Buscar Servidor</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="text" 
                                        value={searchQuery}
                                        onChange={(e) => handleSearchUsers(e.target.value)}
                                        placeholder="Nome, matrícula ou e-mail..." 
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                    {isSearching && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <Loader2 size={16} className="animate-spin text-blue-500" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Resultados da Busca */}
                            {searchQuery.length >= 3 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resultados da Busca</p>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                        {searchResults.length === 0 && !isSearching ? (
                                            <div className="p-4 text-center text-sm text-gray-500">Nenhum servidor encontrado.</div>
                                        ) : (
                                            searchResults.map(user => (
                                                <button 
                                                    key={user.id}
                                                    onClick={() => setSelectedUser(user)}
                                                    className={`w-full text-left p-3 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0 ${
                                                        selectedUser?.id === user.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold">
                                                        {getInitials(user.full_name)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-semibold truncate ${selectedUser?.id === user.id ? 'text-blue-700' : 'text-gray-800'}`}>
                                                            {user.full_name}
                                                        </p>
                                                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                                    </div>
                                                    {selectedUser?.id === user.id && (
                                                        <Check size={16} className="text-blue-600" />
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Seleção de Função (Aparece apenas quando um usuário é selecionado) */}
                            {selectedUser && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-sm font-semibold text-gray-700">Função</label>
                                    <div className="relative">
                                        <select 
                                            value={selectedRole}
                                            onChange={(e) => setSelectedRole(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                                        >
                                            <option value="ANALISTA">Analista</option>
                                            <option value="ADMIN">Administrador</option>
                                            <option value="SOSFU">SOSFU</option>
                                            <option value="SEFIN">SEFIN</option>
                                            <option value="PRESIDENCIA">Presidência</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start gap-2">
                                        <User size={16} className="text-blue-600 mt-0.5" />
                                        <p className="text-xs text-blue-800">
                                            O usuário <strong>{selectedUser.full_name}</strong> será adicionado à equipe com o perfil de <strong>{selectedRole}</strong>.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {modalError && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
                                    <AlertCircle size={16} />
                                    {modalError}
                                </div>
                            )}

                        </div>

                        {/* Footer Modal */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button 
                                onClick={closeModal}
                                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleAddUser}
                                disabled={!selectedUser || saving}
                                className={`
                                    px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg shadow-sm 
                                    hover:bg-blue-700 transition-all flex items-center gap-2
                                    ${(!selectedUser || saving) ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                {saving && <Loader2 size={16} className="animate-spin" />}
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};