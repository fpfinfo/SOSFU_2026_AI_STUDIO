import React from 'react';
import { MOCK_SOLICITATIONS } from '../constants';
import { Plus, Filter, Search, MoreHorizontal, FileText } from 'lucide-react';

export const SolicitationsView: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-md text-blue-600">
                <FileText size={20} />
            </div>
            Gestão de Solicitações
          </h2>
          <p className="text-gray-500 text-sm mt-1">Gerencie os pedidos de suprimento de fundos</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm">
            <Filter size={16} />
            Filtros
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm shadow-blue-200">
            <Plus size={16} />
            Nova Solicitação
          </button>
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
                    placeholder="Buscar por número do processo ou beneficiário..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
            </div>
            <div className="text-xs text-gray-500 font-medium">
                Mostrando {MOCK_SOLICITATIONS.length} resultados
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Processo</th>
                <th className="px-6 py-4">Beneficiário / Unidade</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Data Sol.</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MOCK_SOLICITATIONS.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-800 text-sm">{item.processNumber}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-800">{item.beneficiary}</div>
                    <div className="text-xs text-gray-500">{item.unit}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-gray-700">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(item.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase
                      ${item.status === 'APPROVED' ? 'bg-green-100 text-green-700' : ''}
                      ${item.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : ''}
                      ${item.status === 'PAID' ? 'bg-blue-100 text-blue-700' : ''}
                      ${item.status === 'REJECTED' ? 'bg-red-100 text-red-700' : ''}
                    `}>
                      {item.status === 'PENDING' && 'Em Análise'}
                      {item.status === 'APPROVED' && 'Aprovado'}
                      {item.status === 'PAID' && 'Pago'}
                      {item.status === 'REJECTED' && 'Rejeitado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-50">
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