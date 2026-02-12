import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Loader2, Map as MapIcon, DollarSign, Search, Navigation, 
    BarChart3, Mail, Scale, TrendingUp, Building2, MapPin, 
    ChevronRight, Filter, X
} from 'lucide-react';
import { GoogleMapPremium } from '../ui/Map/GoogleMapPremium';
import { MapDetailCard } from '../reports/MapDetailCard';
import { useExpenseElements } from '../../hooks/useExpenseElements';
import { CURRENCY_COMPACT, CURRENCY_FULL } from '../../lib/utils';

// ==================== SIDEBAR ITEM ====================
const SidebarItem = memo(({ stat, isSelected, onClick }: {
    stat: ComarcaStats; isSelected: boolean; onClick: () => void;
}) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all text-left group ${
            isSelected
                ? 'bg-sky-50 border-sky-200 ring-1 ring-sky-100'
                : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
        }`}
    >
        <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-7 h-7 flex items-center justify-center rounded-full text-[9px] font-bold shrink-0 ${
                stat.totalConcedido > 50000 ? 'bg-red-100 text-red-600' :
                    stat.totalConcedido > 20000 ? 'bg-amber-100 text-amber-600' :
                        'bg-sky-100 text-sky-600'
            }`}>
                {stat.comarca.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
                <p className={`text-xs font-bold truncate ${isSelected ? 'text-sky-700' : 'text-gray-700'}`}>{stat.comarca}</p>
                <p className="text-[10px] text-gray-400 truncate">{stat.entrancia} · {stat.processCount} proc.</p>
            </div>
        </div>
        <div className="text-right shrink-0 ml-2">
            <span className="text-xs font-bold text-gray-600 block">{CURRENCY_COMPACT.format(stat.totalConcedido)}</span>
            <Navigation size={10} className={`ml-auto mt-0.5 ${isSelected ? 'text-sky-500' : 'text-gray-300 group-hover:text-sky-400'}`} />
        </div>
    </button>
));

// ==================== TYPES ====================
interface ElementoDespesa {
    codigo: string;
    descricao: string;
    valor: number;
}

interface ComarcaStats {
    comarca: string;
    lat: number;
    lng: number;
    entrancia: string;
    polo: string;
    regiao: string;
    totalConcedido: number;
    totalPrestado: number;
    processCount: number;
    elementos: ElementoDespesa[];
    juiz: {
        name: string;
        email: string;
        avatar_url: string | null;
        matricula: string;
    } | null;
}

interface UnidadeAdmin {
    id: number;
    nome: string;
    sigla: string | null;
    tipo: string;
    vinculacao: string | null;
    responsavel: string | null;
    lat: number;
    lng: number;
}

const TIPO_MARKER_COLORS: Record<string, string> = {
    'Secretaria': '#4F46E5',
    'Departamento': '#2563eb',
    'Coordenadoria': '#059669',
    'Serviço': '#d97706',
    'Assessoria': '#4f46e5',
    'Seção': '#0891b2',
    'Gabinete': '#e11d48',
    'Outro': '#6b7280',
};

interface SodpaGeoMapProps {
    darkMode?: boolean;
    onNavigate?: (page: string, processId?: string) => void;
}

// ==================== CONSTANTS ====================
const INITIAL_CENTER: [number, number] = [-3.5, -52];

const ENTRANCIA_RANGES: Record<string, [number, number]> = {
    '3ª Entrância': [40_000, 150_000],
    '2ª Entrância': [15_000, 60_000],
    '1ª Entrância': [2_000, 25_000],
};

function seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// Remoção do MapController Leaflet

// ==================== POPUP CONTENT ====================
const ComarcaPopupContent = memo(({ stat }: { stat: ComarcaStats }) => {
    const initials = stat.juiz?.name
        ? stat.juiz.name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
        : '?';

    const prestadoPct = stat.totalConcedido > 0 ? Math.round((stat.totalPrestado / stat.totalConcedido) * 100) : 0;

    return (
        <div className="w-full font-sans">
            {/* ── Header: Comarca ── */}
            <div className="flex justify-between items-start pb-2.5 mb-3 border-b border-slate-200">
                <div>
                    <h3 className="font-black text-slate-800 uppercase text-sm leading-tight tracking-wide">{stat.comarca}</h3>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold">{stat.entrancia}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{stat.polo}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg">
                    <MapPin size={10} className="text-slate-400" />
                    <span className="text-[9px] font-mono text-slate-500">{stat.lat.toFixed(2)}, {stat.lng.toFixed(2)}</span>
                </div>
            </div>

            {/* ── Magistrado Card ── */}
            {stat.juiz && (
                <div className="bg-amber-50/80 rounded-xl p-3 mb-3 border border-amber-100">
                    <p className="text-[8px] font-black text-amber-500/80 uppercase tracking-[0.15em] mb-2">Magistrado Responsável</p>
                    <div className="flex items-center gap-3">
                        {stat.juiz.avatar_url ? (
                            <img src={stat.juiz.avatar_url} alt={stat.juiz.name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-linear-to-br from-amber-300 to-amber-500 flex items-center justify-center text-sm font-black text-white border-2 border-white shadow-md">
                                {initials}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate leading-tight">{stat.juiz.name}</p>
                            {stat.juiz.email && (
                                <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                                    <Mail size={9} className="shrink-0 text-slate-400" /> {stat.juiz.email}
                                </p>
                            )}
                            {stat.juiz.matricula && (
                                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Mat: {stat.juiz.matricula}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Resumo Financeiro ── */}
            <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Resumo Financeiro — Ano 2026</p>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-2 border border-emerald-100">
                        <p className="text-[9px] text-emerald-600 flex items-center gap-1 font-semibold"><DollarSign size={9} /> Concedido</p>
                        <p className="text-base font-black text-emerald-700 mt-0.5">{CURRENCY_FULL.format(stat.totalConcedido)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-blue-100">
                        <p className="text-[9px] text-blue-600 flex items-center gap-1 font-semibold"><Scale size={9} /> Prestado</p>
                        <p className="text-base font-black text-blue-700 mt-0.5">{CURRENCY_FULL.format(stat.totalPrestado)}</p>
                    </div>
                </div>
                
                <div className="mt-3">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-[9px] font-bold text-slate-400">{stat.processCount} processos</span>
                        <span className={`text-[10px] font-black ${
                            prestadoPct >= 80 ? 'text-emerald-600' : prestadoPct >= 50 ? 'text-amber-600' : 'text-red-600'
                        }`}>{prestadoPct}% prestado</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${
                                prestadoPct >= 80 ? 'bg-emerald-500' :
                                prestadoPct >= 50 ? 'bg-amber-500' :
                                'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, prestadoPct)}%` }}
                        />
                    </div>
                    <div className="text-right mt-1">
                        <span className="text-[9px] text-slate-400">Pendente: {CURRENCY_COMPACT.format(stat.totalConcedido - stat.totalPrestado)}</span>
                    </div>
                </div>
            </div>

            {/* ── Tabela Elementos de Despesa ── */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.15em]">Elementos de Despesa</p>
                </div>
                <table className="w-full text-[10px]">
                    <tbody>
                        {stat.elementos.map((el, i) => (
                            <tr key={el.codigo} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} border-b border-slate-50 last:border-0`}>
                                <td className="py-1.5 px-3 font-mono font-bold text-teal-600 w-16">{el.codigo}</td>
                                <td className="py-1.5 px-2 text-slate-600">{el.descricao}</td>
                                <td className="py-1.5 px-3 text-right font-bold text-slate-700">{CURRENCY_FULL.format(el.valor)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-100 border-t border-slate-200">
                            <td colSpan={2} className="py-1.5 px-3 font-black text-slate-600 uppercase text-[9px]">Total</td>
                            <td className="py-1.5 px-3 text-right font-black text-emerald-700">
                                {CURRENCY_FULL.format(stat.elementos.reduce((s, e) => s + e.valor, 0))}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
});

// ==================== SIDEBAR ITEM ====================

// ==================== MAIN COMPONENT ====================
export const SodpaGeoMap: React.FC<SodpaGeoMapProps> = ({ darkMode = false }) => {
    const [loading, setLoading] = useState(true);
    const { elements: expenseElements } = useExpenseElements();
    const [stats, setStats] = useState<ComarcaStats[]>([]);
    const [unidadesAdmin, setUnidadesAdmin] = useState<UnidadeAdmin[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [mapFocus, setMapFocus] = useState<{ center: [number, number]; zoom: number } | null>(null);
    const [selectedComarca, setSelectedComarca] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'comarcas' | 'unidades'>('all');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        const fetchData = async () => {
            try {
                const [comarcasRes, profilesRes, unidadesRes] = await Promise.all([
                    supabase
                        .from('dcomarcas')
                        .select('idcomarca, comarca, entrancia, polo, regiao, latitude, longitude')
                        .not('latitude', 'is', null)
                        .not('longitude', 'is', null),
                    supabase
                        .from('profiles')
                        .select('full_name, email, avatar_url, matricula')
                        .not('full_name', 'is', null)
                        .limit(100),
                    supabase
                        .from('dUnidadesAdmin')
                        .select('id, nome, sigla, tipo, vinculacao, responsavel, latitude, longitude')
                        .eq('ativo', true)
                        .not('latitude', 'is', null)
                        .not('longitude', 'is', null),
                ]);

                if (cancelled) return;

                const comarcas = comarcasRes.data || [];
                const profiles = profilesRes.data || [];
                const unidadesData = unidadesRes.data || [];

                const result: ComarcaStats[] = comarcas.map((c: any, idx: number) => {
                    const seed = c.idcomarca || idx;
                    const entrancia = c.entrancia || '1ª Entrância';
                    const [minVal, maxVal] = ENTRANCIA_RANGES[entrancia] || [1_000, 15_000];

                    const totalConcedido = Math.round(minVal + seededRandom(seed * 7) * (maxVal - minVal));
                    const prestadoPct = 0.3 + seededRandom(seed * 13) * 0.6;
                    const totalPrestado = Math.round(totalConcedido * prestadoPct);
                    const processCount = Math.max(1, Math.round(seededRandom(seed * 19) * 12));

                    // Distribute total across specific SODPA elements
                    // 14 - Diárias (45%), 33 - Passagens (40%), 30/36 (15%)
                    const pcts = [
                        0.35 + seededRandom(seed * 23) * 0.20, // 14 Diárias
                        0.30 + seededRandom(seed * 29) * 0.20, // 33 Passagens
                        0.05 + seededRandom(seed * 31) * 0.10, // 30
                        0,                                       // 36 = remainder
                    ];
                    const sumPcts = pcts[0] + pcts[1] + pcts[2];
                    pcts[3] = Math.max(0.01, 1 - sumPcts);
                    const totalPcts = pcts.reduce((a, b) => a + b, 0);

                    const elementos: ElementoDespesa[] = (expenseElements.length > 0 ? expenseElements : [
                        { codigo: '3.3.90.14', descricao: 'Diárias - Pessoal Civil' },
                        { codigo: '3.3.90.33', descricao: 'Passagens e Desp. Locomoção' },
                        { codigo: '3.3.90.30', descricao: 'Material de Consumo' },
                        { codigo: '3.3.90.36', descricao: 'Serviços de Terceiros - PF' },
                    ]).map((el, i) => ({
                        codigo: el.codigo,
                        descricao: el.descricao,
                        valor: Math.round(totalConcedido * ((pcts[i] || 0.05) / totalPcts)),
                    }));

                    // Assign judge from profiles
                    let juiz: ComarcaStats['juiz'];
                    if (profiles.length > 0) {
                        const profile = profiles[seed % profiles.length];
                        juiz = {
                            name: profile.full_name || 'Servidor(a)',
                            email: profile.email || '',
                            avatar_url: profile.avatar_url,
                            matricula: profile.matricula || '',
                        };
                    } else {
                        juiz = {
                            name: `Magistrado ${c.comarca}`,
                            email: '',
                            avatar_url: null,
                            matricula: '',
                        };
                    }

                    return {
                        comarca: c.comarca,
                        lat: Number(c.latitude),
                        lng: Number(c.longitude),
                        entrancia,
                        polo: c.polo || '',
                        regiao: c.regiao || '',
                        totalConcedido,
                        totalPrestado,
                        processCount,
                        elementos,
                        juiz,
                    };
                });

                setStats(result);

                // Map admin units
                const adminUnits: UnidadeAdmin[] = unidadesData.map((u: any) => ({
                    id: u.id,
                    nome: u.nome,
                    sigla: u.sigla,
                    tipo: u.tipo,
                    vinculacao: u.vinculacao,
                    responsavel: u.responsavel,
                    lat: Number(u.latitude),
                    lng: Number(u.longitude),
                }));
                setUnidadesAdmin(adminUnits);

            } catch (err) {
                console.error('SodpaGeoMap fetch error:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchData();
        return () => { cancelled = true; };
    }, []);

    const handleComarcaClick = useCallback((stat: ComarcaStats) => {
        setMapFocus({ center: [stat.lat, stat.lng], zoom: 10 });
        setSelectedComarca(stat.comarca);
    }, []);

    const handleUnidadeClick = useCallback((u: UnidadeAdmin) => {
        setMapFocus({ center: [u.lat, u.lng], zoom: 12 });
        // Handle selection state for Unidades differently if needed, 
        // for now we focus on map.
    }, []);

    const filteredItems = useMemo(() => {
        const term = searchTerm.toLowerCase();
        
        let result: Array<{ type: 'comarca' | 'unidade', data: any }> = [];

        if (filterType === 'all' || filterType === 'comarcas') {
            const comarcas = stats
                .filter(s => !term || s.comarca.toLowerCase().includes(term) || (s.juiz?.name.toLowerCase().includes(term)))
                .map(s => ({ type: 'comarca' as const, data: s }));
            result = [...result, ...comarcas];
        }

        if (filterType === 'all' || filterType === 'unidades') {
            const unidades = unidadesAdmin
                .filter(u => !term || u.nome.toLowerCase().includes(term) || (u.sigla && u.sigla.toLowerCase().includes(term)))
                .map(u => ({ type: 'unidade' as const, data: u }));
            result = [...result, ...unidades];
        }

        // Sort: Comarcas first (by value), then Unidades (by name)
        return result.sort((a, b) => {
            if (a.type === 'comarca' && b.type === 'comarca') return b.data.totalConcedido - a.data.totalConcedido;
            if (a.type === 'unidade' && b.type === 'unidade') return a.data.nome.localeCompare(b.data.nome);
            return a.type === 'comarca' ? -1 : 1;
        });
    }, [stats, unidadesAdmin, searchTerm, filterType]);

    const totalGeral = useMemo(() => stats.reduce((sum, s) => sum + s.totalConcedido, 0), [stats]);
    const totalPrestado = useMemo(() => stats.reduce((sum, s) => sum + s.totalPrestado, 0), [stats]);
    const comarcasAtivas = useMemo(() => stats.filter(s => s.processCount > 0).length, [stats]);

    const calculateRadius = useCallback((value: number) => {
        if (value === 0) return 7;
        return Math.max(8, Math.min(35, 4 + Math.log(value + 1) * 2.8));
    }, []);

    const getColor = useCallback((stat: ComarcaStats) => {
        if (stat.processCount === 0) return '#94a3b8';
        if (stat.totalConcedido > 80000) return '#dc2626';
        if (stat.totalConcedido > 40000) return '#f59e0b';
        if (stat.totalConcedido > 15000) return '#3b82f6';
        return '#10b981';
    }, []);

    if (loading) {
        return (
            <div className={`flex flex-col items-center justify-center h-[600px] rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <Loader2 className="w-12 h-12 text-sky-600 animate-spin mb-4" />
                <p className={`font-medium ${darkMode ? 'text-slate-300' : 'text-gray-500'}`}>Carregando mapa de situação geográfica...</p>
                <p className={`text-xs mt-2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Processando dados de Diárias e Passagens</p>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full animate-in fade-in duration-500 gap-4 ${darkMode ? 'bg-slate-900 text-white' : ''}`}>
            {/* Header */}
            <div className={`flex flex-col md:flex-row justify-between items-center gap-4 p-4 rounded-2xl border shadow-sm shrink-0 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-sky-500/10 text-sky-400' : 'bg-sky-50 text-sky-600'}`}><MapIcon size={24} /></div>
                    <div>
                        <h2 className={`text-lg font-black leading-none ${darkMode ? 'text-white' : 'text-gray-800'}`}>Mapa de Situação Geográfica</h2>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Distribuição de despesas por comarca do Estado do Pará</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-center px-4 border-r border-slate-200">
                        <p className="text-lg font-black text-sky-600 font-mono">{CURRENCY_COMPACT.format(totalGeral)}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Total Concedido</p>
                    </div>
                    <div className="text-center px-4 border-r border-slate-200">
                        <p className="text-lg font-black text-blue-600 font-mono">{CURRENCY_COMPACT.format(totalPrestado)}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Total Prestado</p>
                    </div>
                    <div className="text-center px-4 border-r border-slate-200">
                        <p className={`text-lg font-black ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{comarcasAtivas}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Comarcas Ativas</p>
                    </div>
                    <div className="text-center px-4">
                        <p className="text-lg font-black text-teal-600">{stats.length + unidadesAdmin.length}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Unidades</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
                {/* SIDEBAR */}
                <div className={`w-full lg:w-72 rounded-2xl shadow-sm border flex flex-col overflow-hidden shrink-0 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                    <div className={`p-3 border-b ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
                        {/* Search */}
                        <div className="relative mb-3">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Buscar comarca ou unidade..."
                                className={`w-full pl-8 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 ${darkMode ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-gray-200'}`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Filters */}
                        <div className="flex bg-slate-200/50 p-0.5 rounded-lg">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-bold transition-all ${
                                    filterType === 'all' 
                                    ? 'bg-white text-sky-600 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Todos <span className="opacity-60 text-[9px]">{stats.length + unidadesAdmin.length}</span>
                            </button>
                            <button
                                onClick={() => setFilterType('comarcas')}
                                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-bold transition-all ${
                                    filterType === 'comarcas' 
                                    ? 'bg-white text-sky-600 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Comarcas <span className="opacity-60 text-[9px]">{stats.length}</span>
                            </button>
                            <button
                                onClick={() => setFilterType('unidades')}
                                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-bold transition-all ${
                                    filterType === 'unidades' 
                                    ? 'bg-white text-sky-600 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Unidades <span className="opacity-60 text-[9px]">{unidadesAdmin.length}</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                        {filteredItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <MapIcon size={28} className="mb-2 opacity-30" />
                                <p className="text-xs font-medium">Nenhum resultado encontrado</p>
                            </div>
                        ) : filteredItems.map((item, idx) => {
                            if (item.type === 'comarca') {
                                return (
                                    <SidebarItem
                                        key={`comarca-${item.data.comarca}`}
                                        stat={item.data}
                                        isSelected={selectedComarca === item.data.comarca}
                                        onClick={() => handleComarcaClick(item.data)}
                                    />
                                );
                            } else {
                                const u = item.data as UnidadeAdmin;
                                const markerColor = TIPO_MARKER_COLORS[u.tipo] || TIPO_MARKER_COLORS['Outro'];
                                return (
                                    <button
                                        key={`unidade-${u.id}`}
                                        onClick={() => handleUnidadeClick(u)}
                                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all text-left group bg-white mb-0.5 ${
                                            mapFocus?.center[0] === u.lng && mapFocus?.center[1] === u.lat ? 'border-teal-200 bg-teal-50' : 'border-transparent hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-7 h-7 flex items-center justify-center rounded-full text-[9px] font-bold shrink-0 text-white"
                                                 style={{ backgroundColor: markerColor }}>
                                                {u.sigla?.slice(0, 2) || u.nome.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold truncate text-gray-700">{u.nome}</p>
                                                <p className="text-[10px] text-gray-400 truncate">{u.tipo}</p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            }
                        })}
                    </div>
                </div>

                {/* MAP */}
                <div className="flex-1 rounded-2xl shadow-lg border border-gray-200 overflow-hidden relative z-0">
                    <GoogleMapPremium
                        center={mapFocus?.center || INITIAL_CENTER}
                        zoom={mapFocus?.zoom || 6}
                        className="h-full w-full"
                        mapType={darkMode ? 'hybrid' : 'roadmap'}
                        markers={[
                            ...((filterType === 'all' || filterType === 'comarcas') ? stats.map(s => ({
                                id: `comarca-${s.comarca}`,
                                lat: s.lat,
                                lng: s.lng,
                                title: s.comarca,
                                tooltip: `${CURRENCY_COMPACT.format(s.totalConcedido)} · ${s.processCount} processos`,
                                color: getColor(s),
                                radius: calculateRadius(s.totalConcedido) / 2, // Ajuste de escala Leaflet -> Google
                                data: s
                            })) : []),
                            ...((filterType === 'all' || filterType === 'unidades') ? unidadesAdmin.map(u => ({
                                id: `unidade-${u.id}`,
                                lat: u.lat,
                                lng: u.lng,
                                title: u.sigla || u.nome,
                                tooltip: u.tipo,
                                color: TIPO_MARKER_COLORS[u.tipo] || TIPO_MARKER_COLORS['Outro'],
                                radius: 5,
                                data: u
                            })) : [])
                        ]}
                        onMarkerClick={(marker) => {
                            if (typeof marker.id === 'string' && marker.id.startsWith('comarca-')) {
                                setSelectedComarca(marker.data.comarca);
                                setMapFocus({ center: [marker.lat, marker.lng], zoom: 10 });
                            } else {
                                setMapFocus({ center: [marker.lat, marker.lng], zoom: 12 });
                            }
                        }}
                    />

                    {/* Floating Immersive Dashboard (Modal Overlay) */}
                    {selectedComarca && (
                        <div className="absolute inset-0 z-[2000] flex items-center justify-center p-4 md:p-8 animate-in zoom-in-95 duration-300 pointer-events-none">
                            <div className="w-[95%] h-[95%] bg-white/95 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/50 flex flex-col overflow-hidden pointer-events-auto">
                                <div className="p-1.5 flex justify-end">
                                    <button 
                                        onClick={() => {
                                            setSelectedComarca(null);
                                            setMapFocus({ center: INITIAL_CENTER, zoom: 6 });
                                        }}
                                        className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto px-4 pb-8">
                                    {(() => {
                                        const stat = stats.find(s => s.comarca === selectedComarca);
                                        return stat ? (
                                            <MapDetailCard 
                                                data={stat} 
                                                onClose={() => {
                                                    setSelectedComarca(null);
                                                    setMapFocus({ center: INITIAL_CENTER, zoom: 6 });
                                                }}
                                                isDashboard={true}
                                            />
                                        ) : null;
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Legend */}
                    <div className={`absolute bottom-4 left-4 p-3 rounded-xl shadow-lg border z-[1000] text-xs ${darkMode ? 'bg-slate-800/95 border-slate-700 text-slate-300' : 'bg-white/95 border-gray-200 text-gray-600'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <BarChart3 size={13} className="text-gray-400" />
                            <span className="font-black uppercase text-[10px] tracking-wider">Legenda</span>
                        </div>
                        <div className="space-y-1.5">
                            {[
                                ['#10b981', 'Até R$ 15 mil'],
                                ['#3b82f6', 'R$ 15–40 mil'],
                                ['#f59e0b', 'R$ 40–80 mil'],
                                ['#dc2626', 'Acima de R$ 80 mil'],
                                ['#94a3b8', 'Sem processos'],
                            ].map(([color, label]) => (
                                <div key={label} className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: color }} />
                                    <span className="text-[10px]">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
