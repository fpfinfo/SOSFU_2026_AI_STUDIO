import React, { useState, useEffect } from 'react';
import { X, UserPlus, Search, Check, Loader2, Shield, AlertCircle, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TeamMember {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    dperfil: { slug: string; name: string } | null;
}

interface AssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Retorna true se a atribuição foi bem-sucedida, false caso contrário */
    onAssign: (analystId: string) => Promise<boolean>;
    currentAnalystId?: string;
    title?: string;
    /** Prefixos de slug para filtrar equipe. Default: ['SOSFU', 'ADMIN'] */
    departmentFilter?: string[];
}

export const AssignModal: React.FC<AssignModalProps> = ({
    isOpen,
    onClose,
    onAssign,
    currentAnalystId,
    title = 'Atribuir Processo',
    departmentFilter = ['SOSFU', 'ADMIN'],
}) => {
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            setSearchTerm('');
            fetchTeam();
        }
    }, [isOpen]);

    const fetchTeam = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);

            // Usa LIKE para capturar variantes de slug (SOSFU, SOSFU_GESTOR, SOSFU_EQUIPE, etc.)
            const orClauses = departmentFilter
                .map(slug => `slug.like.${slug}%`)
                .join(',');

            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url, dperfil:perfil_id!inner(slug, name)')
                .or(orClauses, { referencedTable: 'dperfil' })
                .order('full_name');

            if (fetchError) throw fetchError;
            setTeam((data || []) as TeamMember[]);
        } catch (err) {
            console.error('[AssignModal] Erro ao buscar equipe:', err);
            setTeam([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (analystId: string) => {
        setAssigning(true);
        setError(null);
        try {
            const success = await onAssign(analystId);
            if (success) {
                onClose();
            } else {
                setError('Falha ao atribuir processo. Verifique suas permissões ou tente novamente.');
            }
        } catch (err) {
            console.error('[AssignModal] Erro:', err);
            setError('Erro inesperado ao atribuir. Tente novamente.');
        } finally {
            setAssigning(false);
        }
    };

    const getInitials = (name: string) => (name || 'U').substring(0, 2).toUpperCase();

    const getRoleBadge = (member: TeamMember) => {
        const slug = member.dperfil?.slug || '';
        const name = member.dperfil?.name || '';

        if (slug === 'ADMIN' || slug.startsWith('ADMIN')) {
            return (
                <span className="text-[9px] bg-red-100 text-red-700 px-1.5 rounded-full font-bold flex items-center gap-0.5">
                    <Shield size={8} /> Admin
                </span>
            );
        }

        if (name) {
            return (
                <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 rounded-full font-bold">
                    {name}
                </span>
            );
        }

        return null;
    };

    if (!isOpen) return null;

    const filteredTeam = team.filter(
        (t) =>
            t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <UserPlus size={18} className="text-blue-600" /> {title}
                    </h3>
                    <button
                        onClick={onClose}
                        disabled={assigning}
                        className="p-1 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar analista..."
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-700 font-medium">{error}</p>
                    </div>
                )}

                {/* Team List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <div className="p-8 flex justify-center">
                            <Loader2 className="animate-spin text-blue-600" />
                        </div>
                    ) : (
                        <>
                            {/* Opção "Atribuir para Mim" */}
                            {currentUser && (
                                <button
                                    onClick={() => handleAssign(currentUser.id)}
                                    disabled={assigning}
                                    className="w-full flex items-center justify-between p-3 hover:bg-blue-50 rounded-lg transition-colors group border border-transparent hover:border-blue-100 disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                            EU
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-gray-800 group-hover:text-blue-700">
                                                Atribuir para Mim
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Puxar processo para minha mesa
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {currentAnalystId === currentUser.id && <Check size={16} className="text-blue-600" />}
                                        {assigning && <Loader2 size={14} className="animate-spin text-blue-500" />}
                                    </div>
                                </button>
                            )}

                            {/* Separador com contagem */}
                            <div className="flex items-center gap-2 px-3 py-2">
                                <div className="h-px flex-1 bg-gray-100" />
                                <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                                    <Users size={10} /> Colegas da Equipe ({filteredTeam.length})
                                </span>
                                <div className="h-px flex-1 bg-gray-100" />
                            </div>

                            {filteredTeam.length === 0 && (
                                <div className="p-4 text-center text-gray-400 text-xs">
                                    Nenhum membro encontrado.
                                </div>
                            )}

                            {filteredTeam.map((member) => (
                                <button
                                    key={member.id}
                                    onClick={() => handleAssign(member.id)}
                                    disabled={assigning}
                                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs overflow-hidden border border-white shadow-sm">
                                            {member.avatar_url ? (
                                                <img src={member.avatar_url} className="w-full h-full object-cover" alt={member.full_name} />
                                            ) : (
                                                getInitials(member.full_name)
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                                                    {member.full_name}
                                                </p>
                                                {getRoleBadge(member)}
                                            </div>
                                            <p className="text-xs text-gray-400">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {currentAnalystId === member.id && <Check size={16} className="text-green-600" />}
                                        {assigning && <Loader2 size={14} className="animate-spin text-gray-400" />}
                                    </div>
                                </button>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
