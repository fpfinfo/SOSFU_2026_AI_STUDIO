
import React from 'react';
import { AppTab } from '../types';

interface BottomNavProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs: { id: AppTab; label: string; icon: string }[] = [
    { id: 'inicio', label: 'Início', icon: 'fa-house' },
    { id: 'solicitacoes', label: 'Solicitações', icon: 'fa-briefcase' },
    { id: 'criar', label: 'Criar Nova', icon: 'fa-circle-plus' },
    { id: 'despesas', label: 'Despesas', icon: 'fa-wallet' },
    { id: 'mais', label: 'Perfil', icon: 'fa-user' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-50 md:hidden">
      <div className="flex justify-around items-end pb-2 pt-1 px-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isCreate = tab.id === 'criar';

          if (isCreate) {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center -top-6 relative"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${isActive ? 'bg-emerald-600 scale-110' : 'bg-white border-2 border-emerald-600 text-emerald-600'}`}>
                  <i className={`fa-solid ${tab.icon} text-2xl ${isActive ? 'text-white' : ''}`}></i>
                </div>
                <span className={`text-[10px] mt-1 font-bold ${isActive ? 'text-emerald-700' : 'text-gray-400'}`}>{tab.label}</span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center py-2 px-1 w-1/5 transition-all active:scale-90"
            >
              <i className={`fa-solid ${tab.icon} text-xl ${isActive ? 'text-emerald-600 scale-110' : 'text-gray-400'}`}></i>
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="h-1.5 w-32 bg-gray-200 mx-auto rounded-full mb-3"></div>
    </nav>
  );
};

export default BottomNav;
