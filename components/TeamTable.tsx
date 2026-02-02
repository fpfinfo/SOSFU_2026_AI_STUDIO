import React, { useEffect, useState } from 'react';
import { Users, Clock, ArrowRightLeft, List, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  dperfil?: {
    slug: string;
    name: string;
  };
}

export const TeamTable: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      // Busca apenas usuários que tenham perfil SOSFU ou ADMIN
      // Ignora SUPRIDO, GESTOR, etc.
      const { data, error } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            avatar_url,
            dperfil!inner (name, slug)
        `)
        .in('dperfil.slug', ['SOSFU', 'ADMIN'])
        .order('full_name');

      if (error) throw error;
      
      setMembers(data || []);
    } catch (error) {
      console.error('Erro ao buscar equipe para dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => (name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100 flex items-center gap-3">
        <Users className="text-gray-400" size={20} />
        <h3 className="text-gray-800 font-bold text-lg uppercase">Gestão da Equipe Técnica</h3>
      </div>

      <div className="p-2">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50/50 rounded-t-lg border-b border-gray-100 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
          <div className="col-span-4 flex items-center gap-1 cursor-pointer hover:text-blue-600">
            Analista / Função 
            <span className="text-[8px]">⇅</span>
          </div>
          <div className="col-span-4 flex items-center gap-1 cursor-pointer hover:text-blue-600">
            Carga de Trabalho (Processos)
            <span className="text-[8px]">⇅</span>
          </div>
          <div className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-blue-600">
            Alertas SLA
            <span className="text-[8px]">⇅</span>
          </div>
          <div className="col-span-2 text-right">
            Ações
          </div>
        </div>

        {/* List Items */}
        <div className="divide-y divide-gray-50">
          {loading ? (
             <div className="p-8 flex justify-center items-center text-gray-400 gap-2">
                <Loader2 className="animate-spin" size={16} />
                Carregando equipe...
             </div>
          ) : members.length === 0 ? (
             <div className="p-8 text-center text-gray-400 text-sm">
                Nenhuma equipe técnica configurada. Acesse Configurações para adicionar.
             </div>
          ) : (
            members.map((member) => (
                <div key={member.id} className="grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-gray-50 transition-colors">
                {/* Profile */}
                <div className="col-span-4 flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs border border-white shadow-sm overflow-hidden">
                            {member.avatar_url ? (
                                <img src={member.avatar_url} className="w-full h-full object-cover" />
                            ) : getInitials(member.full_name)}
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white bg-green-500"></span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 uppercase leading-snug truncate pr-2" title={member.full_name}>
                            {member.full_name}
                        </p>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase mt-0.5">
                            {member.dperfil?.name || 'TÉCNICO'}
                        </p>
                    </div>
                </div>

                {/* Workload (Placeholder Realista - 0 por enquanto) */}
                <div className="col-span-4">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-[10px] font-bold text-gray-500">0 Processos</span>
                        <span className="text-[10px] font-bold text-blue-500">0% Cap.</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                        className="h-full rounded-full bg-blue-500" 
                        style={{ width: '0%' }}
                    ></div>
                    </div>
                </div>

                {/* SLA Alerts */}
                <div className="col-span-2">
                    <span className="text-gray-300 text-xs">-</span>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex justify-end gap-2">
                    <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md border border-gray-200 transition-colors">
                        <List size={14} />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md border border-gray-200 transition-colors">
                        <ArrowRightLeft size={14} />
                    </button>
                </div>
                </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};