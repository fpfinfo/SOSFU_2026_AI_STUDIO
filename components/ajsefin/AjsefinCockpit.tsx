import React, { useState, useEffect, useCallback } from 'react';
import { AjsefinHeader } from './AjsefinHeader';
import type { AjsefinViewType } from './AjsefinHeader';
import { AjsefinDashboard } from './AjsefinDashboard';
import { AjsefinProcessView } from './AjsefinProcessView';
import { AjsefinSettings } from './AjsefinSettings';
import { supabase } from '../../lib/supabase';

const SEEN_COUNT_KEY = 'ajsefin_last_seen_count';
const DARK_MODE_KEY = 'ajsefin_dark_mode';

interface AjsefinCockpitProps {
    onNavigate: (page: string, processId?: string) => void;
    userProfile: any;
    darkMode?: boolean;
    onToggleDarkMode?: () => void;
}

export const AjsefinCockpit: React.FC<AjsefinCockpitProps> = ({ onNavigate, userProfile, darkMode = false, onToggleDarkMode }) => {
    const [activeView, setActiveView] = useState<AjsefinViewType>('painel');
    const [lastSeenCount, setLastSeenCount] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);
    const [urgentCount, setUrgentCount] = useState(0);

    // Load preferences
    useEffect(() => {
        const savedCount = localStorage.getItem(SEEN_COUNT_KEY);
        if (savedCount) setLastSeenCount(parseInt(savedCount, 10) || 0);
    }, []);

    // Fetch counts — Processos aguardando análise AJSEFIN
    useEffect(() => {
        const fetchCounts = async () => {
            try {
                // Processos que precisam de análise jurídica
                const { data } = await supabase
                    .from('solicitations')
                    .select('id, created_at, status')
                    .in('status', ['WAITING_AJSEFIN_ANALYSIS', 'WAITING_SOSFU_ANALYSIS']);

                if (data) {
                    setPendingCount(data.length);
                    const now = Date.now();
                    const urgent = data.filter(t => {
                        const hours = (now - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
                        return hours > 48; // Mais de 48h sem análise = urgente
                    }).length;
                    setUrgentCount(urgent);
                }
            } catch (err) {
                console.error('AJSEFIN fetch counts error:', err);
            }
        };

        fetchCounts();
        const interval = setInterval(fetchCounts, 60000);
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
        const isGestor = userProfile?.dperfil?.slug === 'AJSEFIN_GESTOR';
        switch (activeView) {
            case 'painel':
                return <AjsefinDashboard onNavigate={onNavigate} darkMode={darkMode} isGestor={isGestor} />;
            case 'processos':
                return <AjsefinProcessView onNavigate={onNavigate} darkMode={darkMode} />;
            case 'equipe':
                // Equipe reutiliza o painel com foco na seção de equipe
                return <AjsefinDashboard onNavigate={onNavigate} darkMode={darkMode} showTeamOnly isGestor={isGestor} />;
            case 'settings':
                return <AjsefinSettings darkMode={darkMode} userProfile={userProfile} />;
            default:
                return <AjsefinDashboard onNavigate={onNavigate} darkMode={darkMode} isGestor={isGestor} />;
        }
    };

    return (
        <div className={`min-h-[calc(100vh-64px)] flex flex-col transition-colors duration-300 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
            {/* Internal Navigation */}
            <AjsefinHeader
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
