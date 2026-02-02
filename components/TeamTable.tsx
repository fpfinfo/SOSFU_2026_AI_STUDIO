import React from 'react';
import { Users, Clock, ArrowRightLeft, List } from 'lucide-react';
import { TEAM_MEMBERS } from '../constants';

export const TeamTable: React.FC = () => {
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
            Carga de Trabalho
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
          {TEAM_MEMBERS.map((member) => (
            <div key={member.id} className="grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-gray-50 transition-colors">
              {/* Profile */}
              <div className="col-span-4 flex items-center gap-3">
                <div className="relative">
                  <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${member.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800 uppercase leading-snug">{member.name}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mt-0.5">{member.role.replace('_', ' ')}</p>
                </div>
              </div>

              {/* Workload */}
              <div className="col-span-4">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] font-bold text-gray-500">{member.processCount} Processos</span>
                    <span className={`text-[10px] font-bold ${member.capacityPercentage > 100 ? 'text-red-500' : 'text-blue-500'}`}>
                        {member.capacityPercentage}% Cap.
                    </span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${member.capacityPercentage > 100 ? 'bg-red-500' : 'bg-blue-500'}`} 
                    style={{ width: `${Math.min(member.capacityPercentage, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* SLA Alerts */}
              <div className="col-span-2">
                {member.slaAlerts ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-100 rounded-full">
                    <Clock size={12} className="text-red-500" />
                    <span className="text-[10px] font-bold text-red-600 uppercase">{member.slaAlerts.count} Atrasados</span>
                  </div>
                ) : (
                  <span className="text-gray-300 text-xs">-</span>
                )}
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
          ))}
        </div>
      </div>
    </div>
  );
};