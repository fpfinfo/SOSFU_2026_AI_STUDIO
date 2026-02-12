import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SefinHeader } from './SefinHeader';
import type { SefinViewType } from './SefinHeader';
import { SefinDashboard } from './SefinDashboard';
import { SefinExplorerView } from './SefinExplorerView';
import { SefinIntelligenceView } from './SefinIntelligenceView';
import { SefinTeamView } from './SefinTeamView';
import { SefinSettings } from './SefinSettings';
import { ReportsView } from '../ReportsView';
import { supabase } from '../../lib/supabase';

const SEEN_COUNT_KEY = 'sefin_last_seen_count';
const DARK_MODE_KEY = 'sefin_dark_mode';

interface SefinCockpitProps {
    onNavigate: (page: string, processId?: string) => void;
    userProfile: any;
    darkMode?: boolean;
    onToggleDarkMode?: () => void;
}

export const SefinCockpit: React.FC<SefinCockpitProps> = ({ onNavigate, userProfile, darkMode = false, onToggleDarkMode }) => {
    const [activeView, setActiveView] = useState<SefinViewType>('control');
    const [lastSeenCount, setLastSeenCount] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);
    const [urgentCount, setUrgentCount] = useState(0);

    // Load preferences
    useEffect(() => {
        const savedCount = localStorage.getItem(SEEN_COUNT_KEY);
        if (savedCount) setLastSeenCount(parseInt(savedCount, 10) || 0);
    }, []);

    // Fetch counts
    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const { data } = await supabase
                    .from('sefin_signing_tasks')
                    .select('id, created_at, status')
                    .eq('status', 'PENDING');

                if (data) {
                    setPendingCount(data.length);
                    const now = Date.now();
                    const urgent = data.filter(t => {
                        const hours = (now - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
                        return hours > 24;
                    }).length;
                    setUrgentCount(urgent);
                }
            } catch (err) {
                console.error('Sefin fetch counts error:', err);
            }
        };

        fetchCounts();
        const interval = setInterval(fetchCounts, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const newCount = Math.max(0, pendingCount - lastSeenCount);

    const handleAcknowledgeNew = useCallback(() => {
        localStorage.setItem(SEEN_COUNT_KEY, pendingCount.toString());
        setLastSeenCount(pendingCount);
    }, [pendingCount]);



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

    const renderActiveView = () => {
        switch (activeView) {
            case 'control':
                const isGestor = userProfile?.dperfil?.slug === 'SEFIN_GESTOR';
                return <SefinDashboard onNavigate={onNavigate} darkMode={darkMode} isGestor={isGestor} />;
            case 'explorer':
                return <SefinExplorerView darkMode={darkMode} onNavigate={onNavigate} />;
            case 'intelligence':
                return <SefinIntelligenceView darkMode={darkMode} />;
            case 'mapa':
                return <ReportsView />;
            case 'team':
                return <SefinTeamView darkMode={darkMode} />;
            case 'settings':
                return <SefinSettings darkMode={darkMode} userProfile={userProfile} />;
            default:
                return <SefinDashboard onNavigate={onNavigate} darkMode={darkMode} />;
        }
    };

    return (
        <div className={`min-h-[calc(100vh-64px)] flex flex-col transition-colors duration-300 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
            {/* Internal Navigation */}
            <SefinHeader
                activeView={activeView}
                onNavigate={setActiveView}
                pendingCount={pendingCount}
                urgentCount={urgentCount}
                newCount={newCount}
                onAcknowledgeNew={handleAcknowledgeNew}
                darkMode={darkMode}
                onToggleDarkMode={onToggleDarkMode}
            />

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {renderActiveView()}
            </main>
        </div>
    );
};
