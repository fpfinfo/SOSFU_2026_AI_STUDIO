import React, { useEffect, useState } from 'react';
import { Users, ArrowRightLeft, List, Loader2, AlertTriangle, Database, Copy, CheckCircle2, UserPlus, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { WorkloadModal } from './WorkloadModal';

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  dperfil?: {
    slug: string;
    name: string;
  };
  // Campos calculados
  workloadCount: number;
  capacity: number; // %
  slaAlerts: { count: number; type: 'none' | 'warning' | 'delayed' };
  tasks: any[];
}

export const TeamTable: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnalyst, setSelectedAnalyst] = useState<{id: string, name: string, avatar_url: string | null} | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<any[]>([]);

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Buscar Membros
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            avatar_url,
            dperfil!inner (name, slug)
        `)
        .in('dperfil.slug', ['SOSFU', 'ADMIN'])
        .order('full_name');

      if (profileError) throw profileError;

      // 2. Buscar Solicitações Ativas (Não Finalizadas)
      // Consideramos carga de trabalho tudo que não foi Pago ou Rejeitado (ou seja, está em análise/trâmite)
      const { data: solicitations, error: solError } = await supabase
        .from('solicitations')
        .select('id, analyst_id, process_number, beneficiary, status, created_at')
        .not('analyst_id', 'is', null)
        .in('status', ['WAITING_SOSFU_ANALYSIS', 'WAITING_SEFIN_SIGNATURE', 'WAITING_SOSFU_PAYMENT']); // Status que dependem da SOSFU

      if (solError) throw solError;

      // 3. Buscar Prestação de Contas Ativas (Em Análise)
      const { data: accountabilities, error: accError } = await supabase
        .from('accountabilities')
        .select('id, analyst_id, process_number, status, deadline, profiles:requester_id(full_name)')
        .eq('status', 'WAITING_SOSFU')
        .not('analyst_id', 'is', null);

      if (accError) throw accError;

      // 4. Processar e Combinar Dados
      const teamData: TeamMember[] = (profiles || []).map((m: any) => {
          const memberId = m.id;
          
          // Tarefas de Solicitação
          const mySols = (solicitations || []).filter((s: any) => s.analyst_id === memberId).map((s: any) => {
              // SLA Lógica: Mais de 3 dias em análise é atraso
              const daysSinceCreation = Math.floor((new Date().getTime() - new Date(s.created_at).getTime()) / (1000 * 3600 * 24));
              const isLate = s.status === 'WAITING_SOSFU_ANALYSIS' && daysSinceCreation > 3;
              
              return {
                  id: s.id,
                  type: 'SOLICITATION',
                  process_number: s.process_number,
                  beneficiary: s.beneficiary,
                  status: s.status,
                  date_ref: s.created_at,
                  is_late: isLate
              };
          });

          // Tarefas de PC
          const myAccs = (accountabilities || []).filter((a: any) => a.analyst_id === memberId).map((a: any) => {
              // SLA Lógica: Passou do deadline
              const isLate = new Date() > new Date(a.deadline);
              
              return {
                  id: a.id,
                  type: 'ACCOUNTABILITY',
                  process_number: a.process_number,
                  beneficiary: a.profiles?.full_name || 'Desconhecido',
                  status: a.status,
                  date_ref: a.deadline,
                  is_late: isLate
              };
          });

          const allTasks = [...mySols, ...myAccs];
          const totalCount = allTasks.length;
          
          // Cálculo de Capacidade (Ex: Max 20 processos simultâneos)
          const MAX_CAPACITY = 20;
          const capacity = Math.min(100, Math.round((totalCount / MAX_CAPACITY) * 100));

          // Contagem de SLA
          const lateCount = allTasks.filter(t => t.is_late).length;
          let slaType: 'none' | 'warning' | 'delayed' = 'none';
          if (lateCount > 0) slaType = 'delayed';
          else if (capacity > 80) slaType = 'warning';

          return {
              ...m,
              dperfil: Array.isArray(m.dperfil) ? m.dperfil[0] : m.dperfil,
              workloadCount: totalCount,
              capacity: capacity,
              slaAlerts: { count: lateCount, type: slaType },
              tasks: allTasks
          };
      });

      setMembers(teamData);

    } catch (err: any) {
      console.error('Erro ao buscar equipe:', err);
      setError(err.message || 'Erro desconhecido ao carregar equipe.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWorkload = (member: TeamMember) => {
      setSelectedAnalyst({ id: member.id, name: member.full_name, avatar_url: member.avatar_url });
      setSelectedTasks(member.tasks);
      setIsModalOpen(true);
  };

  const copySQL = () => {
    const sql = `ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dperfil DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.profiles TO anon, authenticated, service_role;
GRANT SELECT ON public.dperfil TO anon, authenticated, service_role;`;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (name: string) => (name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  if (error) {
      return (
        <div className="mt-8 bg-red-50 rounded-xl shadow-sm border border-red-200 p-6">
            <div className="flex flex-col items-center justify-center text-red-600 gap-2 mb-4">
                <AlertTriangle size={32} />
                <h3 className="font-bold text-lg">Erro de Permissões no Banco</h3>
                <p className="text-sm text-center max-w-md mb-2">
                    O sistema encontrou um bloqueio de segurança (RLS Recursivo).
                    <br/>
                    Para corrigir, execute o comando abaixo no painel do Supabase.
                </p>
                <div className="bg-white p-2 rounded border border-red-200 text-[10px] font-mono text-red-500 w-full max-w-lg overflow-x-auto">
                    {error}
                </div>
            </div>

            <div className="bg-white rounded-lg border border-red-200 p-4 max-w-2xl mx-auto relative shadow-inner bg-gray-50">
                <div className="flex items-center gap-2 mb-2 text-gray-800 font-bold text-sm">
                    <Database size={16} />
                    <span>SQL de Correção Automática</span>
                </div>
                
                <div className="relative">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-gray-700">
{`-- CORREÇÃO DE PERMISSÕES (RLS)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dperfil DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.profiles TO anon, authenticated, service_role;
GRANT SELECT ON public.dperfil TO anon, authenticated, service_role;`}
                    </pre>
                    <button 
                        onClick={copySQL}
                        className="absolute top-2 right-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded flex items-center gap-1 transition-colors shadow-lg"
                    >
                        {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                        {copied ? 'Copiado!' : 'Copiar SQL'}
                    </button>
                </div>
            </div>

            <div className="mt-6 flex justify-center">
                <button onClick={fetchTeamData} className="text-sm bg-white border border-red-200 hover:bg-red-50 text-red-700 px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-sm">
                    <Loader2 size={14} className={loading ? "animate-spin" : "hidden"} />
                    Tentar Recarregar
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100 flex items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
            <Users className="text-gray-400" size={20} />
            <h3 className="text-gray-800 font-bold text-lg uppercase">Gestão da Equipe Técnica</h3>
        </div>
        <button onClick={fetchTeamData} className="p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-blue-600 transition-colors" title="Atualizar Dados">
            <ArrowRightLeft size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="p-2">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50/50 rounded-t-lg border-b border-gray-100 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
          <div className="col-span-4 flex items-center gap-1 cursor-pointer hover:text-blue-600">
            Analista / Função 
          </div>
          <div className="col-span-4 flex items-center gap-1 cursor-pointer hover:text-blue-600">
            Carga de Trabalho (Processos)
          </div>
          <div className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-blue-600">
            Alertas SLA
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
                Carregando dados da equipe...
             </div>
          ) : members.length === 0 ? (
             <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400 gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                    <Users size={24} />
                </div>
                <div>
                    <p className="text-sm font-semibold text-gray-600">Nenhuma equipe técnica encontrada.</p>
                </div>
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
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${member.workloadCount > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></span>
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

                {/* Workload */}
                <div className="col-span-4">
                    <div className="flex justify-between items-end mb-1">
                        <span className={`text-[10px] font-bold ${member.workloadCount > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
                            {member.workloadCount} Processos
                        </span>
                        <span className={`text-[10px] font-bold ${member.capacity > 80 ? 'text-red-500' : 'text-blue-500'}`}>
                            {member.capacity}% Cap.
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${member.capacity > 80 ? 'bg-red-500' : member.capacity > 50 ? 'bg-yellow-500' : 'bg-blue-500'}`} 
                        style={{ width: `${member.capacity}%` }}
                    ></div>
                    </div>
                </div>

                {/* SLA Alerts */}
                <div className="col-span-2">
                    {member.slaAlerts.type === 'delayed' ? (
                        <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-1 rounded w-fit">
                            <AlertCircle size={12} />
                            <span className="text-[10px] font-bold">{member.slaAlerts.count} Atrasados</span>
                        </div>
                    ) : member.slaAlerts.type === 'warning' ? (
                        <div className="flex items-center gap-1.5 text-yellow-600 bg-yellow-50 px-2 py-1 rounded w-fit">
                            <AlertTriangle size={12} />
                            <span className="text-[10px] font-bold">Sobrecarga</span>
                        </div>
                    ) : (
                        <span className="text-gray-300 text-xs">-</span>
                    )}
                </div>

                {/* Actions */}
                <div className="col-span-2 flex justify-end gap-2">
                    <button 
                        onClick={() => handleOpenWorkload(member)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md border border-gray-200 transition-colors shadow-sm"
                        title="Ver Lista de Processos"
                    >
                        <List size={14} />
                    </button>
                </div>
                </div>
            ))
          )}
        </div>
      </div>

      <WorkloadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        analyst={selectedAnalyst} 
        tasks={selectedTasks}
      />
    </div>
  );
};