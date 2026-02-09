import React, { useState, useEffect } from 'react';
import { Users, MoreVertical, Plus, Circle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar_url?: string;
    active: boolean;
}

interface SodpaTeamWidgetProps {
    darkMode?: boolean;
    onManageTeam?: () => void;
}

export const SodpaTeamWidget: React.FC<SodpaTeamWidgetProps> = ({ darkMode = false, onManageTeam }) => {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeam = async () => {
            try {
                // Use the same robust query as Settings to ensure consistency
                const { data } = await supabase
                    .from('profiles')
                    .select(`
                        id, 
                        full_name, 
                        email, 
                        avatar_url,
                        dperfil!inner (slug, name)
                    `)
                    .in('dperfil.slug', ['SODPA_GESTOR', 'SODPA_EQUIPE', 'ADMIN', 'SODPA']);
                
                if (data) {
                    setMembers(data.map((p: any) => ({
                        id: p.id,
                        name: p.full_name || 'Sem nome',
                        email: p.email || '',
                        role: p.dperfil?.name || 'Membro SODPA',
                        avatar_url: p.avatar_url,
                        active: true
                    })));
                } else {
                    setMembers([]);
                }
            } catch (err) {
                console.error('Erro ao buscar equipe:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTeam();
    }, []);

    return (
        <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`px-6 py-4 flex items-center justify-between border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                <div>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Gestão de Equipe SODPA</h3>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {members.length} membro{members.length !== 1 ? 's' : ''} ativo{members.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button 
                    onClick={onManageTeam}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors"
                >
                    <Users size={14} />
                    Gerenciar
                </button>
            </div>

            <div className="p-2">
                {loading ? (
                    <div className="p-8 text-center text-slate-400">Carregando equipe...</div>
                ) : members.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <p>Nenhum membro encontrado.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {members.map(member => (
                            <div key={member.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                darkMode ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                            }`}>
                                <div className="relative shrink-0">
                                    {member.avatar_url ? (
                                        <img src={member.avatar_url} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white font-bold shadow-sm">
                                            {member.name.charAt(0)}
                                        </div>
                                    )}
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                                </div>
                                
                                <div className="min-w-0 flex-1">
                                    <h4 className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>{member.name}</h4>
                                    <p className={`text-xs truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{member.role}</p>
                                </div>

                                <button className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
                                    darkMode ? 'text-slate-400 hover:bg-slate-600' : 'text-slate-400 hover:bg-slate-100'
                                }`}>
                                    <MoreVertical size={16} />
                                </button>
                            </div>
                        ))}
                        
                        {/* Add Member Card */}
                        <button 
                            onClick={onManageTeam}
                            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-dashed transition-all ${
                                darkMode 
                                    ? 'border-slate-700 text-slate-500 hover:text-sky-400 hover:border-sky-500/50 hover:bg-slate-800' 
                                    : 'border-slate-200 text-slate-400 hover:text-sky-600 hover:border-sky-200 hover:bg-sky-50/50'
                            }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                darkMode ? 'bg-slate-800' : 'bg-slate-100'
                            }`}>
                                <Plus size={16} />
                            </div>
                            <span className="text-xs font-bold">Adicionar</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
