
import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { SystemNotification } from '../types';

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTypeStyles = (type: SystemNotification['type']) => {
    switch (type) {
      case 'ERROR': return 'bg-red-50 text-red-500 border-red-100';
      case 'WARNING': return 'bg-amber-50 text-amber-500 border-amber-100';
      case 'SUCCESS': return 'bg-emerald-50 text-emerald-500 border-emerald-100';
      default: return 'bg-blue-50 text-blue-500 border-blue-100';
    }
  };

  const getTypeIcon = (type: SystemNotification['type']) => {
    switch (type) {
      case 'ERROR': return 'fa-circle-exclamation';
      case 'WARNING': return 'fa-triangle-exclamation';
      case 'SUCCESS': return 'fa-circle-check';
      default: return 'fa-bell';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-100 dark:hover:border-blue-900 transition-all relative group shadow-sm"
      >
        <i className={`fa-solid fa-bell text-xl ${unreadCount > 0 ? 'animate-bounce-subtle' : ''}`}></i>
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-slate-950 shadow-lg">
            {unreadCount > 9 ? '+9' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-[11px]">Centro de Alertas</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAllAsRead()}
                className="text-[9px] font-black text-blue-500 uppercase tracking-tighter hover:underline"
              >
                Limpar Tudo
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-10 text-center space-y-3">
                <i className="fa-solid fa-spinner fa-spin text-slate-200 text-2xl"></i>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carregando...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-10 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                   <i className="fa-solid fa-bell-slash text-slate-200 dark:text-slate-700 text-2xl"></i>
                </div>
                <p className="text-xs font-medium text-slate-400">Nenhum alerta novo por aqui.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => !notif.is_read && markAsRead(notif.id)}
                    className={`p-5 flex gap-4 transition-colors cursor-pointer group ${!notif.is_read ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${getTypeStyles(notif.type)}`}>
                       <i className={`fa-solid ${getTypeIcon(notif.type)}`}></i>
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <p className={`text-xs font-black uppercase tracking-tight ${!notif.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        {notif.message}
                      </p>
                      <p className="text-[9px] text-slate-300 dark:text-slate-600 font-bold uppercase">
                        {new Date(notif.created_at).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
             <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                Ver Todas as Notificações
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
