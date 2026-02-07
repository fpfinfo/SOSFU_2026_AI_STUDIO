import React, { useState, useEffect } from 'react';
import { CheckCircle2, FileText, Filter, Search, Clock, ChevronRight, UserCheck, Loader2, Plus, Wallet, TrendingUp, AlertCircle, Stamp, FileCheck, FileSignature, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StatusBadge } from '../StatusBadge';

interface GestorDashboardProps {
    onNavigate: (page: string, processId?: string, accountabilityId?: string) => void;
}

export const GestorDashboard: React.FC<GestorDashboardProps> = ({ onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [pendingApproval, setPendingApproval] = useState<any[]>([]); // Solicitações
    const [pendingAccountability, setPendingAccountability] = useState<any[]>([]); // PCs
    const [pendingMinutas, setPendingMinutas] = useState<any[]>([]); // Minutas para assinar
    const [myRequests, setMyRequests] = useState<any[]>([]);
    const [stats, setStats] = useState({ 
        pendingCount: 0, 
        pendingPcCount: 0,
        pendingMinutasCount: 0,
        signedMinutasCount: 0,
        myActiveCount: 0,
        myCompletedCount: 0, 
        totalManagedValue: 0,
        approvedValue: 0
    });
    const [userName, setUserName] = useState('');

    useEffect(() => {
        fetchGestorData();
    }, []);

    const fetchGestorData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            // Pega nome do usuário
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
            setUserName(profile?.full_name?.split(' ')[0] || 'Gestor');

            // 1. Solicitações para APROVAR (WAITING_MANAGER) — Solicitações iniciais
            const { data: approvals, error: appError } = await supabase
                .from('solicitations')
                .select('*')
                .ilike('manager_email', user.email || '')
                .eq('status', 'WAITING_MANAGER')
                .order('created_at', { ascending: false });

            if (appError) throw appError;

            // 2. Prestações de Contas para ATESTAR (WAITING_MANAGER)
            const { data: pcApprovals, error: pcError } = await supabase
                .from('accountabilities')
                .select(`
                    *,
                    solicitation:solicitation_id!inner(manager_email, process_number, beneficiary, unit),
                    requester:requester_id(full_name)
                `)
                .eq('status', 'WAITING_MANAGER')
                .ilike('solicitation.manager_email', user.email || '');

            if (pcError) console.error("Erro ao buscar PCs:", pcError);

            // 3. Minutas pendentes de assinatura — Processos com status WAITING_MANAGER
            //    que possuem documentos is_draft: true no metadata
            const pendingList = approvals || [];
            
            // Para cada solicitação WAITING_MANAGER, buscar docs com is_draft
            const minutasData: any[] = [];
            if (pendingList.length > 0) {
                const solIds = pendingList.map(s => s.id);
                const { data: draftDocs } = await supabase
                    .from('process_documents')
                    .select('*')
                    .in('solicitation_id', solIds)
                    .eq('metadata->>is_draft', 'true');
                
                if (draftDocs && draftDocs.length > 0) {
                    // Agrupar por solicitation_id
                    const grouped: Record<string, any[]> = {};
                    draftDocs.forEach(doc => {
                        if (!grouped[doc.solicitation_id]) grouped[doc.solicitation_id] = [];
                        grouped[doc.solicitation_id].push(doc);
                    });
                    
                    // Montar lista para exibição
                    Object.entries(grouped).forEach(([solId, docs]) => {
                        const sol = pendingList.find(s => s.id === solId);
                        if (sol) {
                            minutasData.push({
                                solicitation: sol,
                                drafts: docs,
                                count: docs.length,
                            });
                        }
                    });
                }
            }
            
            // 3b. Minutas já assinadas (concluídas) — busca em TODAS as solicitações geridas
            let signedCount = 0;
            {
                // Buscar todos os IDs de solicitações geridas por este gestor
                const { data: allManaged } = await supabase
                    .from('solicitations')
                    .select('id')
                    .ilike('manager_email', user.email || '');
                
                if (allManaged && allManaged.length > 0) {
                    const allIds = allManaged.map(s => s.id);
                    const { data: signedDocs } = await supabase
                        .from('process_documents')
                        .select('id')
                        .in('solicitation_id', allIds)
                        .eq('metadata->>signed', 'true');
                    signedCount = signedDocs?.length || 0;
                }
            }
            
            // 4. Processos SOLICITADOS PELO GESTOR (Auto-suprimento)
            const { data: requests, error: reqError } = await supabase
                .from('solicitations')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (reqError) throw reqError;

            // Stats
            const pcList = pcApprovals || [];
            const myList = requests || [];
            const myActive = myList.filter(p => p.status !== 'PAID' && p.status !== 'REJECTED' && p.status !== 'ARCHIVED');
            const myCompleted = myList.filter(p => p.status === 'PAID' || p.status === 'ARCHIVED');
            const pendingValue = pendingList.reduce((acc, curr) => acc + Number(curr.value), 0);
            const approvedValue = myList.filter(p => ['PAID','ARCHIVED','WAITING_SOSFU','WAITING_SEFIN'].includes(p.status)).reduce((acc, curr) => acc + Number(curr.value), 0);
            const totalMinutas = minutasData.reduce((acc, m) => acc + m.count, 0);

            setPendingApproval(pendingList);
            setPendingAccountability(pcList);
            setPendingMinutas(minutasData);
            setMyRequests(myList);
            setStats({
                pendingCount: pendingList.length,
                pendingPcCount: pcList.length,
                pendingMinutasCount: totalMinutas,
                signedMinutasCount: signedCount,
                myActiveCount: myActive.length,
                myCompletedCount: myCompleted.length,
                totalManagedValue: pendingValue,
                approvedValue
            });

        } catch (error) {
            console.error("Erro ao carregar painel do gestor:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <Loader2 className="w-10 h-10 text-indigo-800 animate-spin" />
                <p className="text-gray-500 font-medium">Carregando gabinete...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 font-sans">
             
             {/* Header Section */}
             <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Gabinete Virtual</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Bem-vindo, <strong>{userName}</strong>. Aqui você gerencia sua equipe e seus próprios processos.
                    </p>
                </div>
                <button 
                    onClick={() => onNavigate('solicitation_emergency')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 transform hover:-translate-y-0.5"
                >
                    <Plus size={18} /> Novo Suprimento Próprio
                </button>
             </div>

             {/* Stats Overview */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                {/* Card 1: Aprovações (Solicitações + PCs) */}
                <div className={`p-5 rounded-2xl border shadow-sm transition-all ${stats.pendingCount + stats.pendingPcCount > 0 ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-100' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${stats.pendingCount > 0 ? 'text-amber-700' : 'text-gray-400'}`}>Pendências de Equipe</p>
                        <div className={`p-2.5 rounded-lg ${stats.pendingCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-50 text-gray-300'}`}>
                            <Stamp size={18} />
                        </div>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-800 mb-2">{stats.pendingCount + stats.pendingPcCount}</h3>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="text-amber-600 font-semibold flex items-center gap-1"><Clock size={10}/> {stats.pendingCount} Solicitações</span>
                            <span className="text-purple-600 font-semibold flex items-center gap-1"><FileCheck size={10}/> {stats.pendingPcCount} PCs</span>
                        </div>
                        {(stats.pendingCount + stats.pendingPcCount) > 0 && (
                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden flex">
                                <div className="bg-amber-400 h-full transition-all" style={{ width: `${stats.pendingCount / (stats.pendingCount + stats.pendingPcCount) * 100}%` }} />
                                <div className="bg-purple-400 h-full transition-all" style={{ width: `${stats.pendingPcCount / (stats.pendingCount + stats.pendingPcCount) * 100}%` }} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Card 2: Minutas — Pendentes vs Concluídas */}
                {(() => {
                    const totalMin = stats.pendingMinutasCount + stats.signedMinutasCount;
                    const pctDone = totalMin > 0 ? Math.round((stats.signedMinutasCount / totalMin) * 100) : 0;
                    return (
                        <div className={`p-5 rounded-2xl border shadow-sm transition-all ${stats.pendingMinutasCount > 0 ? 'bg-orange-50 border-orange-200 ring-1 ring-orange-100' : 'bg-white border-gray-200'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${stats.pendingMinutasCount > 0 ? 'text-orange-700' : 'text-gray-400'}`}>Minutas</p>
                                <div className={`p-2.5 rounded-lg ${stats.pendingMinutasCount > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-300'}`}>
                                    <FileSignature size={18} />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-800 mb-2">{totalMin}</h3>
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-orange-600 font-semibold flex items-center gap-1"><Clock size={10}/> {stats.pendingMinutasCount} Pendentes</span>
                                    <span className="text-green-600 font-semibold flex items-center gap-1"><CheckCircle2 size={10}/> {stats.signedMinutasCount} Assinadas</span>
                                </div>
                                {totalMin > 0 && (
                                    <div className="w-full h-1.5 bg-orange-200 rounded-full overflow-hidden">
                                        <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${pctDone}%` }} />
                                    </div>
                                )}
                                {totalMin > 0 && (
                                    <p className="text-[9px] text-gray-400 text-right font-bold">{pctDone}% concluído</p>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Card 3: Meus Processos — Ativos vs Concluídos */}
                {(() => {
                    const totalMy = stats.myActiveCount + stats.myCompletedCount;
                    return (
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Meus Processos</p>
                                <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                                    <Wallet size={18} />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-indigo-600 mb-2">{totalMy}</h3>
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-indigo-600 font-semibold flex items-center gap-1"><Clock size={10}/> {stats.myActiveCount} Ativos</span>
                                    <span className="text-green-600 font-semibold flex items-center gap-1"><CheckCircle2 size={10}/> {stats.myCompletedCount} Concluídos</span>
                                </div>
                                {totalMy > 0 && (
                                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${(stats.myCompletedCount / totalMy) * 100}%` }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Card 4: Valor Gerido — Em análise vs Aprovado */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Valores</p>
                        <div className="p-2.5 rounded-lg bg-green-50 text-green-600">
                            <TrendingUp size={18} />
                        </div>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-800 mb-2">
                        <span className="text-sm text-gray-400 font-normal align-top mr-1">R$</span>
                        {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(stats.totalManagedValue + stats.approvedValue)}
                    </h3>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="text-amber-600 font-semibold">R$ {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(stats.totalManagedValue)} em análise</span>
                            <span className="text-green-600 font-semibold">R$ {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(stats.approvedValue)} aprovado</span>
                        </div>
                        {(stats.totalManagedValue + stats.approvedValue) > 0 && (
                            <div className="w-full h-1.5 bg-amber-200 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${(stats.approvedValue / (stats.totalManagedValue + stats.approvedValue)) * 100}%` }} />
                            </div>
                        )}
                    </div>
                </div>
             </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* PAINEL 1: MESA DE DECISÃO (APROVAÇÕES) */}
                <div className="flex flex-col h-full space-y-6">
                    
                    {/* Seção A: MINUTAS PENDENTES DE ASSINATURA (Prioridade Máxima) */}
                    {pendingMinutas.length > 0 && (
                        <div className="space-y-3 animate-in slide-in-from-left-4">
                            <div className="flex items-center gap-2 px-1 text-orange-700">
                                <FileSignature size={20} />
                                <h3 className="text-sm font-bold uppercase">Minutas Pendentes de Assinatura</h3>
                                <span className="text-[10px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                    {stats.pendingMinutasCount}
                                </span>
                            </div>
                            
                            {pendingMinutas.map((item: any) => (
                                <div 
                                    key={item.solicitation.id} 
                                    onClick={() => onNavigate('process_detail', item.solicitation.id)}
                                    className="bg-white p-5 rounded-2xl border border-orange-200 border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="text-base font-bold text-gray-800 group-hover:text-orange-600 transition-colors flex items-center gap-2">
                                                {item.solicitation.process_number}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Solicitante: {item.solicitation.beneficiary}
                                            </p>
                                        </div>
                                        <span className="bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide flex items-center gap-1">
                                            <FileSignature size={12}/> {item.count} minuta(s)
                                        </span>
                                    </div>
                                    
                                    {/* Lista compacta de minutas */}
                                    <div className="space-y-1.5 mb-3">
                                        {item.drafts.slice(0, 3).map((doc: any) => (
                                            <div key={doc.id} className="flex items-center gap-2 text-xs text-gray-600">
                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                                                <span className="truncate">{doc.title}</span>
                                                <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-bold shrink-0 uppercase">
                                                    {doc.metadata?.subType || doc.document_type}
                                                </span>
                                            </div>
                                        ))}
                                        {item.count > 3 && (
                                            <p className="text-[10px] text-orange-500 font-bold pl-3.5">
                                                + {item.count - 3} mais...
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                        <span className="font-mono font-bold text-gray-800 text-sm">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.solicitation.value)}
                                        </span>
                                        <button className="text-xs font-bold text-orange-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                                            Analisar e Assinar <ChevronRight size={14}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Seção B: Prestação de Contas */}
                    {pendingAccountability.length > 0 && (
                        <div className="space-y-3 animate-in slide-in-from-left-4">
                            <div className="flex items-center gap-2 px-1 text-purple-700">
                                <FileCheck size={20} />
                                <h3 className="text-sm font-bold uppercase">Prestações de Contas para Atesto</h3>
                            </div>
                            
                            {pendingAccountability.map(pc => (
                                <div 
                                    key={pc.id} 
                                    onClick={() => onNavigate('process_accountability', pc.solicitation_id, pc.id)}
                                    className="bg-white p-5 rounded-2xl border border-purple-200 border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="text-base font-bold text-gray-800 group-hover:text-purple-600 transition-colors flex items-center gap-2">
                                                {pc.solicitation.process_number}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">Enviado por: {pc.requester?.full_name}</p>
                                        </div>
                                        <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide flex items-center gap-1">
                                            <Clock size={12}/> Aguardando Atesto
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
                                        <span className="font-mono font-bold text-gray-800 text-sm">
                                            Total Gasto: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pc.total_spent)}
                                        </span>
                                        <button className="text-xs font-bold text-purple-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                                            Revisar Contas <ChevronRight size={14}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Seção C: Solicitações Iniciais */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1 text-amber-700">
                            <Stamp size={20} />
                            <h3 className="text-sm font-bold uppercase">Solicitações de Suprimento</h3>
                        </div>

                        {pendingApproval.filter(p => !pendingMinutas.find(m => m.solicitation.id === p.id)).length === 0 ? (
                            <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-300 text-center">
                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-300">
                                    <CheckCircle2 size={24} />
                                </div>
                                <p className="text-sm text-gray-500">Nenhuma solicitação pendente.</p>
                            </div>
                        ) : (
                            pendingApproval.filter(p => !pendingMinutas.find(m => m.solicitation.id === p.id)).map(proc => (
                                <div 
                                    key={proc.id} 
                                    onClick={() => onNavigate('process_detail', proc.id)}
                                    className="bg-white p-5 rounded-2xl border border-gray-200 border-l-4 border-l-amber-400 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="text-base font-bold text-gray-800 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                                                {proc.process_number}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">{new Date(proc.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                                            Aguardando Autorização
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                                            {proc.beneficiary.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-700">{proc.beneficiary}</p>
                                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{proc.unit}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                        <span className="font-mono font-bold text-gray-800">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.value)}
                                        </span>
                                        <button className="text-sm font-bold text-indigo-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                                            Analisar <ChevronRight size={16}/>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* PAINEL 2: MEUS PROCESSOS (AUTO-GESTÃO) */}
                <div className="flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-4 px-1">
                        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shadow-sm">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Meus Processos</h3>
                            <p className="text-xs text-gray-500">Histórico de suas solicitações pessoais</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1">
                        <div className="divide-y divide-gray-100">
                            {myRequests.length === 0 ? (
                                 <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-3 text-indigo-200">
                                        <Plus size={24} />
                                    </div>
                                    <p className="text-sm text-gray-500">Você ainda não criou nenhuma solicitação.</p>
                                    <button 
                                        onClick={() => onNavigate('solicitation_emergency')}
                                        className="mt-4 text-indigo-600 text-sm font-bold hover:underline"
                                    >
                                        Criar primeira solicitação
                                    </button>
                                </div>
                            ) : (
                                myRequests.map(proc => (
                                    <div key={proc.id} onClick={() => onNavigate('process_detail', proc.id)} className="p-5 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${proc.status === 'PAID' || proc.status === 'ARCHIVED' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                                {(proc.status === 'PAID' || proc.status === 'ARCHIVED') ? <Wallet size={20} /> : <FileText size={20} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">{proc.process_number}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{new Date(proc.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <StatusBadge status={proc.status} size="sm" />
                                            <p className="text-[11px] text-gray-400 mt-1 font-mono font-medium">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.value)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};