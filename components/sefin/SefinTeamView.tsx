import React, { useState, useEffect } from 'react';
import {
    Users, Shield, Mail, Phone, Building2,
    CheckCircle2, Clock, Loader2, UserPlus, Award
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SefinTeamViewProps {
    darkMode?: boolean;
}

interface TeamMember {
    id: string;
    full_name: string;
    email: string;
    matricula: string;
    avatar_url: string;
    role: string;
    perfil_name?: string;
    tasks_signed: number;
    tasks_pending: number;
}

export const SefinTeamView: React.FC<SefinTeamViewProps> = ({ darkMode = false }) => {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTeamData();
    }, []);

    const fetchTeamData = async () => {
        setLoading(true);
        try {
            // Fetch SEFIN users
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email, matricula, avatar_url, role, dperfil:perfil_id(slug, name)')
                .or('role.eq.SEFIN,role.eq.ADMIN');

            if (profiles) {
                // Get task counts per user (SEFIN tasks signed)
                const { data: allTasks } = await supabase
                    .from('sefin_signing_tasks')
                    .select('id, status, signed_by');

                const memberData = profiles.map(p => {
                    const signed = allTasks?.filter(t => t.signed_by === p.id && t.status === 'SIGNED').length || 0;
                    const pending = allTasks?.filter(t => t.status === 'PENDING').length || 0;
                    return {
                        id: p.id,
                        full_name: p.full_name,
                        email: p.email,
                        matricula: p.matricula,
                        avatar_url: p.avatar_url,
                        role: p.role,
                        perfil_name: (p as any).dperfil?.name || p.role,
                        tasks_signed: signed,
                        tasks_pending: pending
                    };
                });

                setMembers(memberData);
            }
        } catch (err) {
            console.error('Team fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name: string) => (name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    const cardBase = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
    const textPrimary = darkMode ? 'text-white' : 'text-slate-800';
    const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-500';

    return (
        <div className="p-6 space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className={`text-xl font-black tracking-tight flex items-center gap-2 ${textPrimary}`}>
                        <Users className="text-emerald-600" size={24} />
                        Equipe SEFIN
                    </h3>
                    <p className={`text-xs font-medium ${textSecondary}`}>
                        Gerenciamento da equipe de assinatura e ordenação financeira
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-5 rounded-2xl border ${cardBase}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className={`text-2xl font-black ${textPrimary}`}>{members.length}</p>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>Membros Ativos</p>
                        </div>
                    </div>
                </div>
                <div className={`p-5 rounded-2xl border ${cardBase}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <p className={`text-2xl font-black ${textPrimary}`}>{members.reduce((s, m) => s + m.tasks_signed, 0)}</p>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>Total Assinados</p>
                        </div>
                    </div>
                </div>
                <div className={`p-5 rounded-2xl border ${cardBase}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                            <Clock size={20} />
                        </div>
                        <div>
                            <p className={`text-2xl font-black ${textPrimary}`}>{members[0]?.tasks_pending || 0}</p>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>Pendentes Agora</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Team Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map(member => (
                    <div key={member.id} className={`p-6 rounded-2xl border transition-all hover:shadow-lg group ${cardBase}`}>
                        <div className="flex items-start gap-4">
                            {member.avatar_url ? (
                                <img src={member.avatar_url} alt={member.full_name}
                                    className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-sm" />
                            ) : (
                                <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-lg">
                                    {getInitials(member.full_name)}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h4 className={`font-bold text-sm truncate ${textPrimary}`}>{member.full_name}</h4>
                                <div className="flex items-center gap-1 mt-1">
                                    <Shield size={10} className="text-emerald-500" />
                                    <span className="text-[10px] font-bold text-emerald-600">{member.perfil_name}</span>
                                </div>
                                <p className={`text-[10px] mt-1 truncate ${textSecondary}`}>
                                    <Mail size={10} className="inline mr-1" />
                                    {member.email}
                                </p>
                                <p className={`text-[10px] ${textSecondary}`}>Mat: {member.matricula}</p>
                            </div>
                        </div>
                        
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
                            <div className={`text-center p-2 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                                <p className={`text-lg font-black ${textPrimary}`}>{member.tasks_signed}</p>
                                <p className={`text-[9px] font-bold uppercase ${textSecondary}`}>Assinados</p>
                            </div>
                            <div className={`text-center p-2 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                                <p className={`text-lg font-black ${textPrimary}`}>{member.tasks_pending}</p>
                                <p className={`text-[9px] font-bold uppercase ${textSecondary}`}>Na Mesa</p>
                            </div>
                        </div>
                    </div>
                ))}

                {members.length === 0 && (
                    <div className="col-span-full text-center py-16">
                        <Users size={48} className="mx-auto mb-4 text-slate-300" />
                        <p className={`text-sm font-medium ${textSecondary}`}>Nenhum membro SEFIN encontrado</p>
                    </div>
                )}
            </div>
        </div>
    );
};
