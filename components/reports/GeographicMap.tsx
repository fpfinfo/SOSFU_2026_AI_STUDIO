import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import { supabase } from '../../lib/supabase';
import { 
    Search, 
    MapPin, 
    Landmark, 
    Filter, 
    X, 
    Loader2, 
    Map as MapIcon, 
    BarChart3, 
    TrendingUp,
    ChevronRight,
    Mail,
    ShieldCheck,
    CheckCircle2
} from 'lucide-react';

// ── Deterministic pseudo-random ──
function seededRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// ── Constants ──
const INITIAL_CENTER: [number, number] = [-1.45502, -48.50240];
const UNIDADE_COLORS: Record<string, string> = {
    'Secretaria': '#9333ea',
    'Departamento': '#2563eb',
    'Coordenadoria': '#059669',
    'Serviço': '#d97706',
    'Assessoria': '#4f46e5',
    'Seção': '#0891b2',
    'Gabinete': '#e11d48',
    'Outro': '#6b7280',
};

const CURRENCY_COMPACT = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' });
const CURRENCY_FULL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

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

// ── Map Controller (FlyTo) ──
const MapController = memo(({ center, zoom }: { center: [number, number] | null; zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, zoom, { duration: 0.8 });
    }, [center, zoom, map]);
    return null;
});

// ── Markers ──
const ComarcaMarker = memo(({ stat, isSelected, radius, color, onClick }: {
    stat: ComarcaStats;
    isSelected: boolean;
    radius: number;
    color: string;
    onClick: () => void;
}) => (
    <CircleMarker
        center={[stat.lat, stat.lng]}
        radius={radius}
        pathOptions={{
            fillColor: color,
            fillOpacity: isSelected ? 0.9 : 0.6,
            color: isSelected ? '#fff' : color,
            weight: isSelected ? 3 : 1,
        }}
        eventHandlers={{ click: onClick }}
    >
        <Tooltip direction="top" offset={[0, -radius]} opacity={1}>
            <div className="font-bold text-xs">{stat.comarca}</div>
            <div className="text-[10px] text-slate-500 font-mono">{CURRENCY_COMPACT.format(stat.totalConcedido)}</div>
        </Tooltip>
        <Popup className="umap-popup" minWidth={240}>
             <ComarcaPopupContent stat={stat} />
        </Popup>
    </CircleMarker>
));

const ComarcaPopupContent = memo(({ stat }: { stat: ComarcaStats }) => {
    const initials = stat.juiz?.name
        ? stat.juiz.name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
        : '?';
    const prestadoPct = stat.totalConcedido > 0 ? Math.round((stat.totalPrestado / stat.totalConcedido) * 100) : 0;

    return (
        <div className="w-full">
            <div className="flex justify-between items-start pb-2 mb-2.5 border-b border-slate-200">
                <div>
                    <h3 className="text-sm font-black text-slate-800 leading-tight">{stat.comarca}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{stat.entrancia} • {stat.regiao}</p>
                    <span className="text-[9px] font-mono text-slate-500">{stat.lat.toFixed(2)}, {stat.lng.toFixed(2)}</span>
                </div>
            </div>

            {stat.juiz && (
                <div className="bg-amber-50/80 rounded-xl p-2.5 mb-2.5 border border-amber-100">
                    <p className="text-[8px] font-black text-amber-500/80 uppercase tracking-[0.15em] mb-1.5">Magistrado Responsável</p>
                    <div className="flex items-center gap-2.5">
                        {stat.juiz.avatar_url ? (
                            <img src={stat.juiz.avatar_url} alt="" className="w-7 h-7 rounded-lg object-cover ring-2 ring-white" />
                        ) : (
                            <div className="w-7 h-7 rounded-lg bg-amber-200 text-amber-600 flex items-center justify-center text-[10px] font-black ring-2 ring-white">
                                {initials}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-700 truncate">{stat.juiz.name}</p>
                            {stat.juiz.email && (
                                <p className="text-[9px] text-slate-500 flex items-center gap-1 truncate">
                                    <Mail size={9} className="shrink-0 text-slate-400" /> {stat.juiz.email}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-50 rounded-xl p-2.5 mb-2.5 border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5">Resumo Financeiro</p>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">Concedido</p>
                        <p className="text-sm font-black text-slate-800 mt-0.5">{CURRENCY_FULL.format(stat.totalConcedido)}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">Executado</p>
                        <p className="text-sm font-black text-blue-700 mt-0.5">{CURRENCY_FULL.format(stat.totalPrestado)}</p>
                    </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${prestadoPct}%` }} />
                    </div>
                    <span className="text-[10px] font-black text-slate-600">{prestadoPct}%</span>
                </div>
                <div className="mt-2 flex justify-between text-[9px] font-bold text-slate-400">
                    <span>{stat.processCount} processos</span>
                    <span>Pendente: {CURRENCY_COMPACT.format(stat.totalConcedido - stat.totalPrestado)}</span>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-2.5 py-1 border-b border-slate-200">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.15em]">Elementos de Despesa</p>
                </div>
                <div className="divide-y divide-slate-100 max-h-24 overflow-y-auto">
                    {stat.elementos.length > 0 ? stat.elementos.map(el => (
                        <div key={el.codigo} className="px-2.5 py-1.5 flex justify-between items-center gap-2 hover:bg-slate-50 transition-colors">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-slate-700 leading-none mb-0.5">{el.codigo}</p>
                                <p className="text-[8px] text-slate-400 font-medium truncate">{el.descricao}</p>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-600 shrink-0">{CURRENCY_COMPACT.format(el.valor)}</span>
                        </div>
                    )) : (
                        <p className="px-2.5 py-3 text-[10px] text-slate-400 text-center italic">Sem itens registrados</p>
                    )}
                </div>
            </div>
        </div>
    );
});

const UnidadeAdminMarker = memo(({ unidade }: { unidade: UnidadeAdmin }) => (
    <CircleMarker
        center={[unidade.lat, unidade.lng]}
        radius={5}
        pathOptions={{
            fillColor: UNIDADE_COLORS[unidade.tipo] || UNIDADE_COLORS.Outro,
            fillOpacity: 0.8,
            color: '#fff',
            weight: 1.5,
        }}
    >
        <Tooltip direction="top" offset={[0, -5]} opacity={1}>
            <div className="font-bold text-[10px]">{unidade.sigla || unidade.nome}</div>
            <div className="text-[8px] text-slate-500">{unidade.tipo}</div>
        </Tooltip>
        <Popup className="umap-popup">
            <div className="w-full">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: UNIDADE_COLORS[unidade.tipo] || UNIDADE_COLORS.Outro }}>
                        <Landmark size={16} />
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-slate-800 leading-tight">{unidade.nome}</h3>
                        <p className="text-[9px] text-slate-500 font-bold uppercase">{unidade.tipo}</p>
                    </div>
                </div>
                <div className="space-y-2">
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Responsável</p>
                        <p className="text-[10px] font-bold text-slate-700">{unidade.responsavel || 'Não informado'}</p>
                    </div>
                    {unidade.vinculacao && (
                        <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Vinculação</p>
                            <p className="text-[10px] text-slate-600 leading-tight">{unidade.vinculacao}</p>
                        </div>
                    )}
                </div>
            </div>
        </Popup>
    </CircleMarker>
));

const SidebarItem = memo(({ stat, isSelected, onClick }: { stat: ComarcaStats; isSelected: boolean; onClick: () => void; }) => {
    const prestadoPct = stat.totalConcedido > 0 ? Math.round((stat.totalPrestado / stat.totalConcedido) * 100) : 0;
    return (
        <button
            onClick={onClick}
            className={`w-full p-2.5 rounded-xl text-left transition-all border ${
                isSelected ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50'
            }`}
        >
            <div className="flex justify-between items-start mb-1.5">
                <div className="min-w-0">
                    <h4 className={`text-xs font-black truncate ${isSelected ? 'text-emerald-800' : 'text-slate-800'}`}>{stat.comarca}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{stat.regiao}</p>
                </div>
                <span className={`text-[10px] font-black font-mono ${isSelected ? 'text-emerald-600' : 'text-slate-600'}`}>
                    {CURRENCY_COMPACT.format(stat.totalConcedido)}
                </span>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${prestadoPct}%` }} />
                </div>
                <span className="text-[8px] font-bold text-slate-400">{prestadoPct}%</span>
            </div>
        </button>
    );
});

const UnidadeSidebarItem = memo(({ unidade, isSelected, onClick }: { unidade: UnidadeAdmin; isSelected: boolean; onClick: () => void; }) => (
    <button
        onClick={onClick}
        className={`w-full p-2.5 rounded-xl text-left transition-all border ${
            isSelected ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50'
        }`}
    >
        <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-slate-100" style={{
                backgroundColor: isSelected ? UNIDADE_COLORS[unidade.tipo] + '20' : '#f8fafc',
                color: UNIDADE_COLORS[unidade.tipo] || UNIDADE_COLORS.Outro
            }}>
                <Landmark size={14} />
            </div>
            <div className="min-w-0">
                <h4 className={`text-xs font-black leading-tight ${isSelected ? 'text-indigo-800' : 'text-slate-800'}`}>{unidade.sigla || unidade.nome}</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{unidade.tipo}</p>
                {isSelected && (
                    <p className="text-[10px] text-indigo-600/70 mt-1 font-medium italic truncate">{unidade.responsavel || 'Sem responsável'}</p>
                )}
            </div>
        </div>
    </button>
));

export const GeographicMap: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<ComarcaStats[]>([]);
    const [unidadesAdmin, setUnidadesAdmin] = useState<UnidadeAdmin[]>([]);
    const [mapFocus, setMapFocus] = useState<{ center: [number, number]; zoom: number } | null>(null);
    const [selectedComarca, setSelectedComarca] = useState<string | null>(null);
    const [selectedUnidade, setSelectedUnidade] = useState<number | null>(null);
    const [sidebarTab, setSidebarTab] = useState<'todos' | 'comarcas' | 'unidades'>('todos');
    const [showComarcas, setShowComarcas] = useState(true);
    const [showUnidades, setShowUnidades] = useState(true);
    const [filterRegiao, setFilterRegiao] = useState('');
    const [filterEntrancia, setFilterEntrancia] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchInput), 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value);

    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Comarcas with their locations
                const comarcasRes = await supabase.from('comarcas_situacao').select('*').order('comarca');
                
                // 2. Fetch Aggregated solicitation stats by comarca
                const statsRes = await supabase.rpc('get_comarca_execution_stats');
                
                // 3. Fetch Admin Units
                const unidadesRes = await supabase.from('unidades_administrativas').select('*');

                // 4. Fetch Profiles for magistrado simulation
                const profilesRes = await supabase.from('profiles').select('full_name, email, avatar_url, matricula').limit(50);

                if (cancelled) return;

                const profiles = profilesRes.data || [];
                const executionData = statsRes.data || [];

                const result: ComarcaStats[] = (comarcasRes.data || []).map(c => {
                    const execution = executionData.find((e: any) => e.comarca === c.comarca) || {};
                    const totalConcedido = Number(execution.total_concedido || 0);
                    const totalPrestado = Number(execution.total_prestado || 0);
                    const processCount = Number(execution.process_count || 0);
                    const elementos = (execution.elementos || []) as ElementoDespesa[];
                    
                    const entrancia = c.entrancia || '-';
                    const seed = c.comarca.length + executionData.length;

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
                        juiz = { name: 'Servidor(a)', email: '', avatar_url: null, matricula: '' };
                    }

                    return {
                        comarca: c.comarca,
                        lat: Number(c.latitude),
                        lng: Number(c.longitude),
                        entrancia,
                        polo: c.polo || '-',
                        regiao: c.regiao || '-',
                        totalConcedido,
                        totalPrestado,
                        processCount,
                        elementos,
                        juiz,
                    };
                });

                setStats(result);

                const adminUnits: UnidadeAdmin[] = (unidadesRes.data || []).map((u: any) => ({
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
                console.error('Map fetch error:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchData();
        return () => { cancelled = true; };
    }, []);

    const regioes = useMemo(() => [...new Set(stats.map(s => s.regiao).filter(Boolean))].sort(), [stats]);
    const entrancias = useMemo(() => [...new Set(stats.map(s => s.entrancia).filter(Boolean))].sort(), [stats]);

    const filteredStats = useMemo(() => {
        const term = debouncedSearch.toLowerCase();
        return stats
            .filter(s => {
                if (term && !s.comarca.toLowerCase().includes(term) && !s.juiz?.name.toLowerCase().includes(term)) return false;
                if (filterRegiao && s.regiao !== filterRegiao) return false;
                if (filterEntrancia && s.entrancia !== filterEntrancia) return false;
                return true;
            })
            .sort((a, b) => b.totalConcedido - a.totalConcedido);
    }, [stats, debouncedSearch, filterRegiao, filterEntrancia]);

    const filteredUnidades = useMemo(() => {
        const term = debouncedSearch.toLowerCase();
        if (!term) return unidadesAdmin;
        return unidadesAdmin.filter(u =>
            u.nome.toLowerCase().includes(term) ||
            u.sigla?.toLowerCase().includes(term) ||
            u.tipo.toLowerCase().includes(term) ||
            u.vinculacao?.toLowerCase().includes(term) ||
            u.responsavel?.toLowerCase().includes(term)
        );
    }, [unidadesAdmin, debouncedSearch]);

    const totalGeral = useMemo(() => stats.reduce((sum, s) => sum + s.totalConcedido, 0), [stats]);
    const totalPrestado = useMemo(() => stats.reduce((sum, s) => sum + s.totalPrestado, 0), [stats]);
    const comarcasAtivas = useMemo(() => stats.filter(s => s.processCount > 0).length, [stats]);

    const hasActiveFilters = filterRegiao || filterEntrancia;

    const handleComarcaClick = useCallback((stat: ComarcaStats) => {
        setMapFocus({ center: [stat.lat, stat.lng], zoom: 10 });
        setSelectedComarca(stat.comarca);
        setSelectedUnidade(null);
    }, []);

    const handleUnidadeClick = useCallback((unidade: UnidadeAdmin) => {
        setMapFocus({ center: [unidade.lat, unidade.lng], zoom: 13 });
        setSelectedUnidade(unidade.id);
        setSelectedComarca(null);
    }, []);

    const calculateRadius = useCallback((value: number) => {
        if (value === 0) return 6;
        return Math.max(7, Math.min(32, 4 + Math.log(value + 1) * 2.5));
    }, []);

    const getColor = useCallback((stat: ComarcaStats) => {
        if (stat.processCount === 0) return '#94a3b8';
        if (stat.totalConcedido > 80000) return '#dc2626';
        if (stat.totalConcedido > 40000) return '#f59e0b';
        if (stat.totalConcedido > 15000) return '#3b82f6';
        return '#10b981';
    }, []);

    const clearFilters = useCallback(() => {
        setFilterRegiao('');
        setFilterEntrancia('');
        setSearchInput('');
        setDebouncedSearch('');
        setShowFilters(false);
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] bg-slate-50 rounded-2xl border border-slate-100">
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium font-bold uppercase tracking-widest text-[10px]">Portal Geográfico SOSFU</p>
                <p className="text-xs text-gray-400 mt-2">Mapeando comarcas e unidades do Estado do Pará...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500 gap-3">
            {/* Header / Stats Badge */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Concedido</p>
                        <p className="text-sm font-black text-emerald-600">{CURRENCY_COMPACT.format(totalGeral)}</p>
                    </div>
                    <div className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center"><TrendingUp size={16} /></div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Prestado</p>
                        <p className="text-sm font-black text-blue-600">{CURRENCY_COMPACT.format(totalPrestado)}</p>
                    </div>
                    <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center"><CheckCircle2 size={16} /></div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Comarcas</p>
                        <p className="text-sm font-black text-slate-800">{comarcasAtivas}</p>
                    </div>
                    <div className="w-8 h-8 bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center"><MapPin size={16} /></div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Unidades</p>
                        <p className="text-sm font-black text-purple-600">{unidadesAdmin.length}</p>
                    </div>
                    <div className="w-8 h-8 bg-purple-50 text-purple-500 rounded-lg flex items-center justify-center"><Landmark size={16} /></div>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
                {/* ═══ Sidebar ═══ */}
                <div className="w-full lg:w-80 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden shrink-0">
                    <div className="p-4 border-b border-gray-50 bg-slate-50/30 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Buscar Unidade..."
                                className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 shadow-sm font-medium"
                                value={searchInput}
                                onChange={handleSearchChange}
                            />
                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-2xl">
                            {[
                                { key: 'todos' as const, label: 'Todos', count: filteredStats.length + filteredUnidades.length },
                                { key: 'comarcas' as const, label: 'Comarcas', count: filteredStats.length },
                                { key: 'unidades' as const, label: 'Unidades', count: filteredUnidades.length },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setSidebarTab(tab.key)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
                                        sidebarTab === tab.key
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    {tab.label}
                                    <span className={`px-1.5 py-0.5 rounded-lg text-[9px] ${
                                        sidebarTab === tab.key ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-400'
                                    }`}>{tab.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {/* Comarcas Section */}
                        {(sidebarTab === 'todos' || sidebarTab === 'comarcas') && (
                            <>
                                {sidebarTab === 'todos' && filteredStats.length > 0 && (
                                    <div className="px-3 pt-3 pb-1 flex items-center gap-2 opacity-40">
                                        <div className="h-px bg-slate-200 flex-1" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Comarcas</span>
                                        <div className="h-px bg-slate-200 flex-1" />
                                    </div>
                                )}
                                {filteredStats.map(stat => (
                                    <SidebarItem
                                        key={stat.comarca}
                                        stat={stat}
                                        isSelected={selectedComarca === stat.comarca}
                                        onClick={() => handleComarcaClick(stat)}
                                    />
                                ))}
                            </>
                        )}

                        {/* Unidades Section */}
                        {(sidebarTab === 'todos' || sidebarTab === 'unidades') && (
                            <>
                                {sidebarTab === 'todos' && filteredUnidades.length > 0 && (
                                    <div className="px-3 pt-3 pb-1 flex items-center gap-2 opacity-40">
                                        <div className="h-px bg-slate-200 flex-1" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Unidades</span>
                                        <div className="h-px bg-slate-200 flex-1" />
                                    </div>
                                )}
                                {filteredUnidades.map(u => (
                                    <UnidadeSidebarItem
                                        key={`ua-${u.id}`}
                                        unidade={u}
                                        isSelected={selectedUnidade === u.id}
                                        onClick={() => handleUnidadeClick(u)}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* ═══ Map ═══ */}
                <div className="flex-1 bg-slate-100 rounded-3xl shadow-xl border border-slate-200 overflow-hidden relative z-0">
                    <MapContainer
                        center={INITIAL_CENTER}
                        zoom={6}
                        scrollWheelZoom={true}
                        zoomControl={false}
                        style={{ height: '100%', width: '100%', background: '#e2e8f0' }}
                    >
                        {mapFocus && <MapController center={mapFocus.center} zoom={mapFocus.zoom} />}
                        <TileLayer
                            attribution='&copy; CARTO'
                            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        />
                        <ZoomControl position="bottomright" />

                        {showComarcas && filteredStats.map(stat => (
                            <ComarcaMarker
                                key={stat.comarca}
                                stat={stat}
                                isSelected={selectedComarca === stat.comarca}
                                radius={calculateRadius(stat.totalConcedido)}
                                color={getColor(stat)}
                                onClick={() => handleComarcaClick(stat)}
                            />
                        ))}

                        {showUnidades && unidadesAdmin.map(u => (
                            <UnidadeAdminMarker key={`ua-${u.id}`} unidade={u} />
                        ))}
                    </MapContainer>

                    {/* Legend Floating */}
                    <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-100 z-[1000] text-xs max-w-[200px]">
                        <div className="flex items-center gap-2 mb-3">
                            <BarChart3 size={14} className="text-indigo-600" />
                            <span className="font-black text-slate-800 uppercase text-[10px] tracking-wider">Investimento</span>
                        </div>
                        <div className="space-y-2">
                            {[
                                ['#10b981', 'Até R$ 15 mil'],
                                ['#3b82f6', 'R$ 15–40 mil'],
                                ['#f59e0b', 'R$ 40–80 mil'],
                                ['#dc2626', 'Acima de R$ 80 mil'],
                            ].map(([color, label]) => (
                                <div key={label} className="flex items-center gap-3">
                                    <span className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} />
                                    <span className="text-[10px] text-slate-600 font-bold">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

