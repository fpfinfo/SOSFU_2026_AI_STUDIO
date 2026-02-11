import React from 'react';
import { Briefcase, FileText, CheckCircle, BarChart3, Users, DollarSign, LayoutGrid } from 'lucide-react';

export const FilterBar: React.FC = () => {
  return (
    <div className="w-full bg-transparent py-4">
        {/* Main Title Area */}
        <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Briefcase size={20} />
            </div>
            <div>
                <h2 className="text-gray-800 font-bold text-xl leading-none uppercase">Mesa Técnica SOSFU</h2>
                <p className="text-gray-400 text-xs font-semibold uppercase mt-1">Visão Geral Unificada</p>
            </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-4">
            {/* Primary Control Panel Button */}
            <button className="bg-gray-900 text-white px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wide shadow-md hover:bg-gray-800 transition-colors">
                Painel de Controle
            </button>
            
            <div className="h-8 w-px bg-gray-300 mx-2"></div>

            {/* Operational Group */}
            <div className="flex items-center bg-white rounded-lg p-1 shadow-sm border border-gray-100">
                <span className="px-3 text-[10px] font-bold text-blue-500 uppercase tracking-wider">Operacional</span>
                <div className="flex space-x-1">
                    <button className="px-4 py-1.5 text-blue-600 bg-blue-50 rounded-md text-xs font-bold hover:bg-blue-100 transition-colors">
                        Concessão
                    </button>
                    <button className="flex items-center gap-1 px-4 py-1.5 text-blue-600 bg-transparent hover:bg-blue-50 rounded-md text-xs font-semibold transition-colors border border-blue-100">
                        <CheckCircle size={12} />
                        PC
                    </button>
                </div>
            </div>

            {/* Financial Group */}
            <div className="flex items-center bg-white rounded-lg p-1 shadow-sm border border-gray-100">
                <span className="px-3 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Financeiro</span>
                <div className="flex space-x-1">
                    <button className="flex items-center gap-1 px-4 py-1.5 text-emerald-600 bg-emerald-50 rounded-md text-xs font-bold hover:bg-emerald-100 transition-colors">
                        <BarChart3 size={12} />
                        INSS/Dev
                    </button>
                    <button className="flex items-center gap-1 px-4 py-1.5 text-teal-600 bg-transparent hover:bg-teal-50 rounded-md text-xs font-semibold transition-colors">
                         <LayoutGrid size={12} />
                        Orçamento
                    </button>
                     <button className="flex items-center gap-1 px-4 py-1.5 text-cyan-600 bg-transparent hover:bg-cyan-50 rounded-md text-xs font-semibold transition-colors">
                        <DollarSign size={12} />
                        SIAFE
                    </button>
                </div>
            </div>

            {/* Management Group */}
            <div className="flex items-center bg-white rounded-lg p-1 shadow-sm border border-gray-100">
                <span className="px-3 text-[10px] font-bold text-orange-500 uppercase tracking-wider">Gestão</span>
                <div className="flex space-x-1">
                    <button className="flex items-center gap-1 px-4 py-1.5 text-orange-600 bg-transparent hover:bg-orange-50 rounded-md text-xs font-semibold transition-colors">
                         <Users size={12} />
                        Supridos
                    </button>
                    <button className="flex items-center gap-1 px-4 py-1.5 text-teal-600 bg-teal-50 rounded-md text-xs font-semibold transition-colors">
                         <FileText size={12} />
                        Ordinário
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};
