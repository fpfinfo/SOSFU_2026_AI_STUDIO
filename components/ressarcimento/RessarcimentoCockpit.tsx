import React, { useState, useEffect, useCallback } from 'react';
import { RessarcimentoHeader } from './RessarcimentoHeader';
import type { RessarcimentoViewType } from './RessarcimentoHeader';
import { RessarcimentoDashboard } from './RessarcimentoDashboard';
import { RessarcimentoPayments } from './RessarcimentoPayments';
import { RessarcimentoArchive } from './RessarcimentoArchive';
import { RessarcimentoReports } from './RessarcimentoReports';
import { RessarcimentoSettings } from './RessarcimentoSettings';
import { supabase } from '../../lib/supabase';

const SEEN_COUNT_KEY = 'ressarcimento_last_seen_count';
const DARK_MODE_KEY = 'ressarcimento_dark_mode';

interface RessarcimentoCockpitProps {
    onNavigate: (page: string, processId?: string) => void;
    userProfile: any;
    darkMode?: boolean;
    onToggleDarkMode?: () => void;
}

export const RessarcimentoCockpit: React.FC<RessarcimentoCockpitProps> = ({ onNavigate, userProfile, darkMode = false, onToggleDarkMode }) => {
    const [activeView, setActiveView] = useState<RessarcimentoViewType>('control');
    const [lastSeenCount, setLastSeenCount] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);
    const [urgentCount, setUrgentCount] = useState(0);

    // Load preferences
    useEffect(() => {
        const savedCount = localStorage.getItem(SEEN_COUNT_KEY);
        if (savedCount) setLastSeenCount(parseInt(savedCount, 10) || 0);
    }, []);

    // Fetch pending counts
    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const { data } = await supabase
                    .from('solicitations')
                    .select('id, created_at, status')
                    .or('status.eq.WAITING_RESSARCIMENTO_ANALYSIS,status.eq.WAITING_RESSARCIMENTO_EXECUTION'); // Include execution phase as pending? Or just analysis

                if (data) {
                    setPendingCount(data.length);
                    const now = Date.now();
                    const urgent = data.filter(t => {
                        const hours = (now - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
                        return hours > 48; // 48h deadline example
                    }).length;
                    setUrgentCount(urgent);
                }
            } catch (err) {
                console.error('Ressarcimento fetch counts error:', err);
            }
        };

        fetchCounts();
        const interval = setInterval(fetchCounts, 60000);
        return () => clearInterval(interval);
    }, []);

    const newCount = Math.max(0, pendingCount - lastSeenCount);

    // Keyboard shortcut for dark mode (D)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === 'd' || e.key === 'D') {
                onToggleDarkMode?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onToggleDarkMode]);

    const handleAcknowledgeNew = useCallback(() => {
        localStorage.setItem(SEEN_COUNT_KEY, pendingCount.toString());
        setLastSeenCount(pendingCount);
    }, [pendingCount]);

    const renderActiveView = () => {
        switch (activeView) {
            case 'control':
                return <RessarcimentoDashboard onNavigate={onNavigate} darkMode={darkMode} userProfile={userProfile} />;
            case 'requests':
                // Reusing Dashboard view but could be just the Inbox component full screen
                // For simplicity, let's keep Dashboard as main entry and allow navigation to specific full views if needed
                // But usually 'requests' tab implies a more detailed list or the inbox component.
                // In context of this request, I'll render the Inbox focused view or just the Dashboard
                return <RessarcimentoDashboard onNavigate={onNavigate} darkMode={darkMode} userProfile={userProfile} />; 
            case 'payments':
                return <RessarcimentoPayments onNavigate={onNavigate} />;
            case 'archive':
                return <RessarcimentoArchive onNavigate={onNavigate} />;
            case 'reports':
                return <RessarcimentoReports />;
            case 'settings':
                return <RessarcimentoSettings darkMode={darkMode} userProfile={userProfile} />;
            default:
                return <RessarcimentoDashboard onNavigate={onNavigate} darkMode={darkMode} userProfile={userProfile} />;
        }
    };

    return (
        <div className={`min-h-[calc(100vh-64px)] flex flex-col transition-colors duration-300 ${
            darkMode ? 'bg-slate-900 catch-all-dark' : 'bg-slate-50'
        }`}>
            <RessarcimentoHeader
                activeView={activeView}
                onNavigate={setActiveView}
                pendingCount={pendingCount}
                urgentCount={urgentCount}
                darkMode={darkMode}
                onToggleDarkMode={onToggleDarkMode}
            />

            <main className="flex-1 overflow-auto">
                {renderActiveView()}
            </main>
        </div>
    );
};
