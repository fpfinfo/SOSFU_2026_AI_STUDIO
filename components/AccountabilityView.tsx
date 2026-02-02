import React from 'react';
import { MOCK_ACCOUNTABILITY } from '../constants';
import { Plus, Filter, Search, MoreHorizontal, CheckSquare, AlertCircle } from 'lucide-react';

export const AccountabilityView: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded-md text-purple-600">
                <CheckSquare size={20} />
            </div>
            Prestação de Contas (PC)
          </h2>
          <p className="text-gray-500 text-sm mt-1">Controle e análise de prestação de contas</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm">
            <Filter size={16} />
            Filtros
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium shadow-sm shadow-purple-200">
            <Plus size={16} />
            Nova PC
          </button>
        </div>
      </div>

      {/* Overview Cards (Mini Stats for PC) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
             <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Aguardando Análise</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">12</p>
             </div>
             <div className="h-8 w-8 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600">
                <AlertCircle size={16} />
             </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
             <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Em Atraso</p>
                <p className="text-2xl font-bold text-red-600 mt-1">3</p>
             </div>
             <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                <AlertCircle size={16} />
             </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
             <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Concluídas (Mês)</p>
                <p className="text-2xl font-bold text-green-600 mt-1">28</p>
             </div>
             <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                <CheckSquare size={16} />
             </div>
          </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
            <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Buscar PC ou suprido..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Nº PC</th>
                <th className="px-6 py-4">Suprido</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Prazo Limite</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MOCK_ACCOUNTABILITY.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-800 text-sm">{item.processNumber}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-800">{item.requester}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-gray-700">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="text-sm text-gray-600">{new Date(item.deadline).toLocaleDateString('pt-BR')}</span>
                        <span className={`text-[10px] font-bold ${item.daysRemaining < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                            {item.daysRemaining < 0 ? `${Math.abs(item.daysRemaining)} dias atrasado` : `${item.daysRemaining} dias restantes`}
                        </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase
                      ${item.status === 'APPROVED' ? 'bg-green-100 text-green-700' : ''}
                      ${item.status === 'ANALYSIS' ? 'bg-purple-100 text-purple-700' : ''}
                      ${item.status === 'CORRECTION' ? 'bg-orange-100 text-orange-700' : ''}
                      ${item.status === 'LATE' ? 'bg-red-100 text-red-700' : ''}
                    `}>
                      {item.status === 'ANALYSIS' && 'Em Análise'}
                      {item.status === 'APPROVED' && 'Aprovado'}
                      {item.status === 'CORRECTION' && 'Correção'}
                      {item.status === 'LATE' && 'Atrasado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-purple-600 transition-colors p-1 rounded hover:bg-purple-50">
                        <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};