import React, { useState, useEffect, useCallback } from 'react';
import { SodpaHeader } from './SodpaHeader';
import type { SodpaViewType } from './SodpaHeader';
import { SodpaDashboard } from './SodpaDashboard';
import { SodpaProcessManagement } from './SodpaProcessManagement';
import { SodpaAccountability } from './SodpaAccountability';
import { SodpaSettings } from './SodpaSettings';
import { SodpaGeoMap } from './SodpaGeoMap'; // Imported Map
import { SodpaArchiveView } from './SodpaArchiveView';
import { supabase } from '../../lib/supabase';

const SEEN_COUNT_KEY = 'sodpa_last_seen_count';
const DARK_MODE_KEY = 'sodpa_dark_mode';

interface SodpaCockpitProps {
    onNavigate: (page: string, processId?: string) => void;
    userProfile: any;
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN COCKPIT COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

export const SodpaCockpit: React.FC<SodpaCockpitProps> = ({ onNavigate, userProfile }) => {
    const [activeView, setActiveView] = useState<SodpaViewType>('control');
    const [lastSeenCount, setLastSeenCount] = useState(0);
    const [darkMode, setDarkMode] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [urgentCount, setUrgentCount] = useState(0);

    // Load preferences from localStorage
    useEffect(() => {
        const savedCount = localStorage.getItem(SEEN_COUNT_KEY);
        if (savedCount) setLastSeenCount(parseInt(savedCount, 10) || 0);

        const savedDark = localStorage.getItem(DARK_MODE_KEY);
        if (savedDark) setDarkMode(savedDark === 'true');
    }, []);

    // Fetch pending counts
    useEffect(() => {
        const fetchCounts = async () => {
            try {
                // Buscar solicitações pendentes SODPA
                const { data } = await supabase
                    .from('solicitations')
                    .select('id, created_at, status')
                    .eq('status', 'WAITING_SODPA_ANALYSIS');

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
                console.error('SODPA fetch counts error:', err);
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

    const handleToggleDarkMode = useCallback(() => {
        setDarkMode(prev => {
            const next = !prev;
            localStorage.setItem(DARK_MODE_KEY, next.toString());
            return next;
        });
    }, []);

    // Keyboard shortcut for dark mode (D)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === 'd' || e.key === 'D') {
                handleToggleDarkMode();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleToggleDarkMode]);

    const renderActiveView = () => {
        switch (activeView) {
            case 'control':
                return <SodpaDashboard onNavigate={onNavigate} darkMode={darkMode} userProfile={userProfile} />;
            case 'processes':
                return <SodpaProcessManagement darkMode={darkMode} onNavigate={onNavigate} />;
            case 'accountability':
                return <SodpaAccountability darkMode={darkMode} onNavigate={onNavigate} />;
            case 'archive':
                return <SodpaArchiveView onNavigate={onNavigate} />;
            case 'reports':
                return <SodpaGeoMap darkMode={darkMode} />; // Updated to Map
            case 'settings':
                return <SodpaSettings darkMode={darkMode} userProfile={userProfile} />;
            default:
                return <SodpaDashboard onNavigate={onNavigate} darkMode={darkMode} userProfile={userProfile} />;
        }
    };

    return (
        <div className={`min-h-[calc(100vh-64px)] flex flex-col transition-colors duration-300 ${
            darkMode ? 'bg-slate-900' : 'bg-slate-50'
        }`}>
            {/* Internal Navigation */}
            <SodpaHeader
                activeView={activeView}
                onNavigate={setActiveView}
                pendingCount={pendingCount}
                urgentCount={urgentCount}
                newCount={newCount}
                onAcknowledgeNew={handleAcknowledgeNew}
                darkMode={darkMode}
                onToggleDarkMode={handleToggleDarkMode}
            />

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {renderActiveView()}
            </main>
        </div>
    );
};
