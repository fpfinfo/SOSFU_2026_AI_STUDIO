import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, Clock, AlertTriangle, Info, CheckCircle2, AlertCircle, ChevronRight, X, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Tooltip } from './ui/Tooltip';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'ACTION_REQUIRED';
    is_read: boolean;
    link: string | null;
    process_number: string | null;
    created_at: string;
}

interface NotificationPanelProps {
    userId?: string;
    onNavigate?: (page: string, processId?: string) => void;
}

const TYPE_CONFIG = {
    INFO: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50', ring: 'ring-blue-100' },
    SUCCESS: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', ring: 'ring-green-100' },
    WARNING: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', ring: 'ring-amber-100' },
    ERROR: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', ring: 'ring-red-100' },
    ACTION_REQUIRED: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50', ring: 'ring-orange-100' },
};

function timeAgo(dateStr: string): string {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now.getTime() - then.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return then.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ userId, onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const fetchNotifications = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        const { data } = await supabase
            .from('system_notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(30);
        setNotifications(data || []);
        setLoading(false);
    }, [userId]);

    // Initial fetch
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Real-time subscription
    useEffect(() => {
        if (!userId) return;
        const channel = supabase
            .channel('notifications')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'system_notifications',
                filter: `user_id=eq.${userId}`,
            }, (payload) => {
                setNotifications(prev => [payload.new as Notification, ...prev]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [userId]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id: string) => {
        await supabase.from('system_notifications').update({ is_read: true }).eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const markAllRead = async () => {
        if (!userId) return;
        await supabase.from('system_notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.id);
        
        if (onNavigate) {
            if (notification.link && notification.link.includes('/process/')) {
                const processId = notification.link.split('/process/')[1];
                onNavigate('process_detail', processId);
            } else if (notification.process_number) {
                // Fallback (though ideally everything should have a link now)
                onNavigate('process_detail', notification.process_number);
            }
        }
        
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <Tooltip content={unreadCount > 0 ? `${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''}` : 'Nenhuma notificação pendente'} position="bottom">
            <button 
                onClick={() => { setIsOpen(!isOpen); if (!isOpen) fetchNotifications(); }}
                className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-full bg-white shadow-sm transition-all relative hover:bg-gray-50 hover:scale-105 active:scale-95"
                aria-label={unreadCount > 0 ? `Notificações — ${unreadCount} não lidas` : 'Notificações'}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white shadow-sm animate-in zoom-in duration-200">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>
            </Tooltip>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-3 w-96 max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden z-[60] animate-in fade-in slide-in-from-top-3 duration-200">
                    
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <Bell size={18} className="text-gray-700" />
                            <h3 className="text-sm font-bold text-gray-800">Notificações</h3>
                            {unreadCount > 0 && (
                                <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                            <Tooltip content="Marcar todas as notificações como lidas" position="bottom">
                                <button 
                                    onClick={markAllRead}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                                >
                                    <CheckCheck size={14} />
                                    Ler todas
                                </button>
                                </Tooltip>
                            )}
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                                aria-label="Fechar painel de notificações"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto max-h-[calc(70vh-65px)] divide-y divide-gray-50">
                        {loading && notifications.length === 0 ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 size={20} className="text-gray-300 animate-spin" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <Bell size={32} className="mb-3 opacity-30" />
                                <p className="text-sm font-medium">Nenhuma notificação</p>
                                <p className="text-xs mt-1">Você será notificado quando algo acontecer</p>
                            </div>
                        ) : (
                            notifications.map((notification) => {
                                const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.INFO;
                                const TypeIcon = config.icon;
                                
                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`
                                            px-5 py-3.5 flex items-start gap-3.5 cursor-pointer transition-all hover:bg-gray-50
                                            ${!notification.is_read ? 'bg-blue-50/30 border-l-2 border-l-blue-400' : 'border-l-2 border-l-transparent'}
                                        `}
                                    >
                                        {/* Type Icon */}
                                        <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                                            <TypeIcon size={14} className={config.color} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs leading-relaxed ${!notification.is_read ? 'text-gray-900 font-semibold' : 'text-gray-600 font-medium'}`}>
                                                {notification.title}
                                            </p>
                                            {notification.process_number && (
                                                <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                                                    Processo {notification.process_number}
                                                </p>
                                            )}
                                        </div>

                                        {/* Timestamp + Unread Dot */}
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                                                {timeAgo(notification.created_at)}
                                            </span>
                                            {!notification.is_read && (
                                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
