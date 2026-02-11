import React from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';

interface OfflineStatusBannerProps {
  isOnline: boolean;
  syncStatus: 'idle' | 'saved' | 'syncing' | 'synced' | 'error';
  pendingCount: number;
}

export const OfflineStatusBanner: React.FC<OfflineStatusBannerProps> = ({
  isOnline,
  syncStatus,
  pendingCount,
}) => {
  // Online and no pending: show nothing (or minimal green)
  if (isOnline && syncStatus === 'idle' && pendingCount === 0) return null;

  // Config by state
  const config = !isOnline
    ? {
        bg: 'bg-amber-50 border-amber-200',
        icon: <WifiOff size={16} className="text-amber-600" />,
        title: 'Sem conexão',
        subtitle: 'Seus dados são salvos localmente e serão sincronizados automaticamente.',
        titleColor: 'text-amber-800',
        subtitleColor: 'text-amber-600',
      }
    : syncStatus === 'saved'
    ? {
        bg: 'bg-blue-50 border-blue-200',
        icon: <Cloud size={16} className="text-blue-500" />,
        title: 'Rascunho salvo localmente',
        subtitle: pendingCount > 1 ? `${pendingCount} rascunhos aguardando sincronização` : 'Será enviado ao servidor automaticamente',
        titleColor: 'text-blue-800',
        subtitleColor: 'text-blue-500',
      }
    : syncStatus === 'syncing'
    ? {
        bg: 'bg-teal-50 border-teal-200',
        icon: <Loader2 size={16} className="text-teal-500 animate-spin" />,
        title: 'Sincronizando...',
        subtitle: `Enviando ${pendingCount} rascunho(s) ao servidor`,
        titleColor: 'text-teal-800',
        subtitleColor: 'text-teal-500',
      }
    : syncStatus === 'synced'
    ? {
        bg: 'bg-emerald-50 border-emerald-200',
        icon: <CheckCircle2 size={16} className="text-emerald-500" />,
        title: 'Tudo sincronizado',
        subtitle: 'Dados salvos com sucesso no servidor',
        titleColor: 'text-emerald-800',
        subtitleColor: 'text-emerald-500',
      }
    : syncStatus === 'error'
    ? {
        bg: 'bg-red-50 border-red-200',
        icon: <AlertTriangle size={16} className="text-red-500" />,
        title: 'Erro ao salvar',
        subtitle: 'Tentaremos novamente automaticamente',
        titleColor: 'text-red-800',
        subtitleColor: 'text-red-500',
      }
    : null;

  if (!config) return null;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${config.bg} animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      {config.icon}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold ${config.titleColor}`}>{config.title}</p>
        <p className={`text-[10px] ${config.subtitleColor} truncate`}>{config.subtitle}</p>
      </div>
      {!isOnline && (
        <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold">
          <CloudOff size={12} /> Offline
        </div>
      )}
    </div>
  );
};
