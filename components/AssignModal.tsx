import React, { useState, useEffect } from 'react';
import { X, UserPlus, Search, Check, Loader2, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAssign: (analystId: string) => Promise<void>;
    currentAnalystId?: string;
    title?: string;
}

export const AssignModal: React.FC<AssignModalProps> = ({ isOpen, onClose, onAssign, currentAnalystId, title = "Atribuir Processo" }) => {
    const [team, setTeam] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        if (isOpen) {
            fetchTeam();
        }
    }, [isOpen]);

    const fetchTeam = async () => {
        setLoading(true);
        try {
            // Pega usuário atual
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);

            // Busca membros da SOSFU e ADMINs
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url, dperfil!inner(slug, name)')
                .in('dperfil.slug', ['SOSFU', 'ADMIN'])
                .order('full_name');
            
            if (error) throw error;
            setTeam(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (analystId: string) => {
        setAssigning(true);
        await onAssign(analystId);
        setAssigning(false);
        onClose();
    };

    const getInitials = (name: string) => (name || 'U').substring(0, 2).toUpperCase();

    if (!isOpen) return null;

    const filteredTeam = team.filter(t => 
        t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <UserPlus size={18} className="text-blue-600"/> {title}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Buscar analista..." 
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
                    ) : (
                        <>
                            {/* Opção para mim mesmo (atalho) */}
                            {currentUser && (
                                <button 
                                    onClick={() => handleAssign(currentUser.id)}
                                    disabled={assigning}
                                    className="w-full flex items-center justify-between p-3 hover:bg-blue-50 rounded-lg transition-colors group border border-transparent hover:border-blue-100"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                            EU
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-gray-800 group-hover:text-blue-700">Atribuir para Mim</p>
                                            <p className="text-xs text-gray-500">Puxar processo para minha mesa</p>
                                        </div>
                                    </div>
                                    {currentAnalystId === currentUser.id && <Check size={16} className="text-blue-600" />}
                                </button>
                            )}
                            
                            <div className="h-px bg-gray-100 my-2 mx-3"></div>

                            {filteredTeam.map(member => (
                                <button 
                                    key={member.id}
                                    onClick={() => handleAssign(member.id)}
                                    disabled={assigning}
                                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs overflow-hidden border border-white shadow-sm">
                                            {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover"/> : getInitials(member.full_name)}
                                        </div>
                                        <div className="text-left">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{member.full_name}</p>
                                                {member.dperfil?.slug === 'ADMIN' && (
                                                    <span className="text-[9px] bg-red-100 text-red-700 px-1.5 rounded-full font-bold flex items-center gap-0.5">
                                                        <Shield size={8} /> Admin
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400">{member.email}</p>
                                        </div>
                                    </div>
                                    {currentAnalystId === member.id && <Check size={16} className="text-green-600" />}
                                </button>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};