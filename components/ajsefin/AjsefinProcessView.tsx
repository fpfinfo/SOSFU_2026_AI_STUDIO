import React, { useState, useEffect, useMemo } from 'react';
import {
    Search, Loader2, Scale, FileText, ChevronRight, Filter,
    UserPlus, Eye, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StatusBadge } from '../StatusBadge';
import { AssignModal } from '../AssignModal';

interface AjsefinProcessViewProps {
    onNavigate: (page: string, processId?: string) => void;
    darkMode?: boolean;
}

type TabType = 'all' | 'waiting' | 'analyzing' | 'minuted';

export const AjsefinProcessView: React.FC<AjsefinProcessViewProps> = ({ onNavigate, darkMode = false }) => {
    const [processes, setProcesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Assign Modal
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedProcessForAssign, setSelectedProcessForAssign] = useState<string | null>(null);

    useEffect(() => {
        const fetchProcesses = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('solicitations')
                    .select(`
                        id, process_number, beneficiary, status, created_at,
                        request_type, estimated_value, analyst_id,
                        analyst:analyst_id(full_name)
                    `)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setProcesses(data || []);
            } catch (err) {
                console.error('AJSEFIN processes error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProcesses();
    }, []);

    // Filter logic
    const filteredProcesses = useMemo(() => {
        let list = processes;

        // Tab filter
        switch (activeTab) {
            case 'waiting':
                list = list.filter(p => ['WAITING_AJSEFIN_ANALYSIS', 'WAITING_SOSFU_ANALYSIS'].includes(p.status));
                break;
            case 'analyzing':
                list = list.filter(p => p.analyst_id && !['PAID', 'REJECTED', 'WAITING_SEFIN_SIGNATURE'].includes(p.status));
                break;
            case 'minuted':
                list = list.filter(p => p.status === 'WAITING_SEFIN_SIGNATURE');
                break;
        }

        // Search filter
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            list = list.filter(p =>
                (p.process_number || '').toLowerCase().includes(term) ||
                (p.beneficiary || '').toLowerCase().includes(term)
            );
        }

        return list;
    }, [processes, activeTab, searchTerm]);

    const tabCounts = useMemo(() => ({
        all: processes.length,
        waiting: processes.filter(p => ['WAITING_AJSEFIN_ANALYSIS', 'WAITING_SOSFU_ANALYSIS'].includes(p.status)).length,
        analyzing: processes.filter(p => p.analyst_id && !['PAID', 'REJECTED', 'WAITING_SEFIN_SIGNATURE'].includes(p.status)).length,
        minuted: processes.filter(p => p.status === 'WAITING_SEFIN_SIGNATURE').length,
    }), [processes]);

    const handleAssign = async (analystId: string) => {
        if (!selectedProcessForAssign) return;
        try {
            const { error } = await supabase
                .from('solicitations')
                .update({ analyst_id: analystId, status: 'WAITING_SOSFU_ANALYSIS' })
                .eq('id', selectedProcessForAssign);

            if (error) throw error;

            // Update locally
            setProcesses(prev => prev.map(p =>
                p.id === selectedProcessForAssign ? { ...p, analyst_id: analystId, status: 'WAITING_SOSFU_ANALYSIS' } : p
            ));
            setShowAssignModal(false);
            setSelectedProcessForAssign(null);
        } catch (err) {
            console.error('Assign error:', err);
        }
    };

    const TabButton: React.FC<{ id: TabType; label: string; count: number }> = ({ id, label, count }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === id
                    ? darkMode
                        ? 'bg-teal-500/20 text-teal-300 shadow-sm'
                        : 'bg-teal-50 text-teal-700 shadow-sm'
                    : darkMode
                        ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
        >
            {label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === id
                    ? darkMode ? 'bg-teal-500/30 text-teal-300' : 'bg-teal-100 text-teal-700'
                    : darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'
            }`}>
                {count}
            </span>
        </button>
    );

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'emergency': return 'Emergência';
            case 'jury': return 'Júri';
            default: return 'Ordinário';
        }
    };

    return (
        <div className={`max-w-[1600px] mx-auto px-6 py-8 ${darkMode ? 'text-white' : ''}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${darkMode ? 'bg-teal-500/20' : 'bg-teal-50'}`}>
                        <Scale size={22} className="text-teal-600" />
                    </div>
                    <div>
                        <h2 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                            Fila de Análise Jurídica
                        </h2>
                        <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            Processos recebidos para parecer e preparação de minutas
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs + Search */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                <div className="flex items-center gap-1">
                    <TabButton id="all" label="Todos" count={tabCounts.all} />
                    <TabButton id="waiting" label="Aguardando" count={tabCounts.waiting} />
                    <TabButton id="analyzing" label="Em Análise" count={tabCounts.analyzing} />
                    <TabButton id="minuted" label="Minutados" count={tabCounts.minuted} />
                </div>

                <div className="relative">
                    <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                        type="text"
                        placeholder="Buscar NUP ou beneficiário..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`pl-9 pr-4 py-2 rounded-lg text-sm border w-64 transition-all ${
                            darkMode
                                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-teal-500'
                                : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-teal-400'
                        } outline-none`}
                    />
                </div>
            </div>

            {/* Process Table */}
            <div className={`rounded-2xl border overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
                {/* Table Header */}
                <div className={`grid grid-cols-12 gap-4 px-5 py-3 border-b text-[10px] font-bold uppercase tracking-wider ${
                    darkMode ? 'bg-slate-700/50 border-slate-700 text-teal-400' : 'bg-slate-50 border-slate-100 text-teal-600'
                }`}>
                    <div className="col-span-3">Processo / Tipo</div>
                    <div className="col-span-3">Beneficiário</div>
                    <div className="col-span-2">Analista</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2 text-right">Ações</div>
                </div>

                {/* Table Body */}
                <div className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-50'}`}>
                    {loading ? (
                        <div className="p-12 flex justify-center items-center gap-2">
                            <Loader2 size={18} className="animate-spin text-teal-500" />
                            <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Carregando processos...
                            </span>
                        </div>
                    ) : filteredProcesses.length === 0 ? (
                        <div className="p-16 text-center">
                            <Scale size={40} className={`mx-auto mb-3 ${darkMode ? 'text-slate-700' : 'text-slate-200'}`} />
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum processo nesta categoria'}
                            </p>
                        </div>
                    ) : (
                        filteredProcesses.map(proc => (
                            <div
                                key={proc.id}
                                className={`grid grid-cols-12 gap-4 px-5 py-3.5 items-center cursor-pointer transition-all ${
                                    darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-teal-50/30'
                                }`}
                                onClick={() => onNavigate('process_detail', proc.id)}
                            >
                                {/* Process Number / Type */}
                                <div className="col-span-3">
                                    <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                        {proc.process_number || 'Sem NUP'}
                                    </p>
                                    <p className={`text-[10px] font-medium mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {getTypeLabel(proc.request_type)}
                                        {proc.estimated_value && (
                                            <span className="ml-2 font-mono">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.estimated_value)}
                                            </span>
                                        )}
                                    </p>
                                </div>

                                {/* Beneficiary */}
                                <div className="col-span-3">
                                    <p className={`text-xs font-medium uppercase truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        {proc.beneficiary || '-'}
                                    </p>
                                    <p className={`text-[10px] ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                                        {new Date(proc.created_at).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>

                                {/* Analyst */}
                                <div className="col-span-2">
                                    {proc.analyst?.full_name ? (
                                        <span className={`text-xs font-medium ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
                                            {proc.analyst.full_name.split(' ').slice(0, 2).join(' ')}
                                        </span>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedProcessForAssign(proc.id);
                                                setShowAssignModal(true);
                                            }}
                                            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded transition-all ${
                                                darkMode
                                                    ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                                                    : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                                            }`}
                                        >
                                            <UserPlus size={10} />
                                            Atribuir
                                        </button>
                                    )}
                                </div>

                                {/* Status */}
                                <div className="col-span-2">
                                    <StatusBadge status={proc.status} />
                                </div>

                                {/* Actions */}
                                <div className="col-span-2 flex justify-end gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onNavigate('process_detail', proc.id);
                                        }}
                                        className={`p-1.5 rounded-md border transition-colors ${
                                            darkMode
                                                ? 'border-slate-600 text-slate-400 hover:text-teal-400 hover:bg-teal-500/10'
                                                : 'border-slate-200 text-slate-400 hover:text-teal-600 hover:bg-teal-50'
                                        }`}
                                        title="Ver Detalhes"
                                    >
                                        <Eye size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Assign Modal */}
            <AssignModal
                isOpen={showAssignModal}
                onClose={() => { setShowAssignModal(false); setSelectedProcessForAssign(null); }}
                currentAnalystId={undefined}
                onAssign={handleAssign}
                title="Atribuir para Análise Jurídica"
            />
        </div>
    );
};
