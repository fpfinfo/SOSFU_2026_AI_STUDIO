import React from 'react';
import { X, FileText, CheckSquare, Clock, Calendar, AlertCircle } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface Task {
    id: string;
    type: 'SOLICITATION' | 'ACCOUNTABILITY';
    process_number: string;
    beneficiary: string;
    status: string;
    date_ref: string; // created_at ou deadline
    is_late: boolean;
}

interface Analyst {
    id: string;
    name: string;
    avatar_url: string | null;
}

interface WorkloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    analyst: Analyst | null;
    tasks: Task[];
}

export const WorkloadModal: React.FC<WorkloadModalProps> = ({ isOpen, onClose, analyst, tasks }) => {
    if (!isOpen || !analyst) return null;

    const solicitations = tasks.filter(t => t.type === 'SOLICITATION');
    const accountabilities = tasks.filter(t => t.type === 'ACCOUNTABILITY');

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm overflow-hidden border-2 border-white shadow-sm">
                            {analyst.avatar_url ? (
                                <img src={analyst.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                                analyst.name.charAt(0)
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">Carga de Trabalho</h3>
                            <p className="text-xs text-gray-500 uppercase">{analyst.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto bg-slate-50 space-y-6">
                    
                    {/* Solicitações */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                            <FileText size={14} /> Solicitações ({solicitations.length})
                        </h4>
                        {solicitations.length === 0 ? (
                            <div className="text-sm text-gray-400 italic bg-white p-4 rounded-lg border border-gray-100">Nenhuma solicitação atribuída.</div>
                        ) : (
                            <div className="space-y-2">
                                {solicitations.map(task => (
                                    <div key={task.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-gray-800">{task.process_number}</span>
                                                {task.is_late && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded flex items-center gap-1"><AlertCircle size={10}/> Atrasado</span>}
                                            </div>
                                            <p className="text-xs text-gray-500 truncate max-w-[250px]">{task.beneficiary}</p>
                                        </div>
                                        <div className="text-right">
                                            <StatusBadge status={task.status} size="sm" />
                                            <p className="text-[10px] text-gray-400 mt-1 flex items-center justify-end gap-1">
                                                <Clock size={10} /> {new Date(task.date_ref).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Prestações de Contas */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                            <CheckSquare size={14} /> Prestações de Contas ({accountabilities.length})
                        </h4>
                        {accountabilities.length === 0 ? (
                            <div className="text-sm text-gray-400 italic bg-white p-4 rounded-lg border border-gray-100">Nenhuma PC atribuída.</div>
                        ) : (
                            <div className="space-y-2">
                                {accountabilities.map(task => (
                                    <div key={task.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-gray-800">{task.process_number}</span>
                                                {task.is_late && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded flex items-center gap-1"><AlertCircle size={10}/> Expirado</span>}
                                            </div>
                                            <p className="text-xs text-gray-500 truncate max-w-[250px]">{task.beneficiary}</p>
                                        </div>
                                        <div className="text-right">
                                            <StatusBadge status={task.status} size="sm" />
                                            <p className="text-[10px] text-gray-400 mt-1 flex items-center justify-end gap-1">
                                                <Calendar size={10} /> Prazo: {new Date(task.date_ref).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};