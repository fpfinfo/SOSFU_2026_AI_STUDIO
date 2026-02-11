import React, { useEffect, useState, useMemo, useCallback, memo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { GoogleMapPremium } from '../ui/Map/GoogleMapPremium';
import {
    geocodeAddress,
    getRouteFromSede,
    batchRoutesFromSede,
    getIsochrones,
    TJPA_SEDE,
    ORS_TILE_LAYERS,
    type OrsRouteResult,
    type OrsGeocodingResult,
    type OrsIsochroneResult,
    type OrsTileConfig,
} from '../../lib/openRouteService';
import {
    Search,
    MapPin,
    Landmark,
    X,
    Loader2,
    Map as MapIcon,
    BarChart3,
    TrendingUp,
    ChevronRight,
    Mail,
    ShieldCheck,
    CheckCircle2,
    Navigation,
    Clock,
    // Route removed (invalid)
    Layers,
    Crosshair,
    // MapPinned removed (invalid)
    Timer,
    Car,
    Maximize2,
    Minimize2,
    Download,
    PieChart
} from 'lucide-react';
import { MapDetailCard, type ComarcaData } from './MapDetailCard';

// ── Deterministic pseudo-random ──
function seededRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// ── Constants ──
const INITIAL_CENTER: [number, number] = [-1.45502, -48.50240];
const UNIDADE_COLORS: Record<string, string> = {
    'Secretaria': '#0d9488',
    'Departamento': '#2563eb',
    'Coordenadoria': '#059669',
    'Serviço': '#d97706',
    'Assessoria': '#0891b2',
    'Seção': '#0891b2',
    'Gabinete': '#e11d48',
    'Outro': '#6b7280',
};

const CURRENCY_COMPACT = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' });
const CURRENCY_FULL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// ── Types ──
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
    // Route data (populated on-demand)
    route?: OrsRouteResult | null;
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

// Remoção do MapController Leaflet



// Remoção dos componentes de marcador do Leaflet

// ── Popup Content ──
const ComarcaPopupContent = memo(({ stat }: { stat: ComarcaStats }) => {
    const initials = stat.juiz?.name
        ? stat.juiz.name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
        : '?';
    const prestadoPct = stat.totalConcedido > 0 ? Math.round((stat.totalPrestado / stat.totalConcedido) * 100) : 0;

    return (
        <div className="w-full">
            <div className="flex justify-between items-start pb-2 mb-2.5 border-b border-slate-200">
                <div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">{stat.comarca}</h3>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{stat.entrancia} · {stat.regiao}</span>
                    <br />
                    <span className="text-[9px] font-mono text-slate-500">{stat.lat.toFixed(2)}, {stat.lng.toFixed(2)}</span>
                </div>
            </div>

            {stat.juiz && (
                <div className="bg-amber-50/80 rounded-xl p-2.5 mb-2.5 border border-amber-100">
                    <p className="text-[8px] font-black text-amber-500/80 uppercase tracking-[0.15em] mb-1.5">Magistrado Responsável</p>
                    <div className="flex items-center gap-2">
                        {stat.juiz.avatar_url ? (
                            <img src={stat.juiz.avatar_url} alt={stat.juiz.name}
                                className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-md" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-[10px] font-black text-amber-700 border-2 border-white shadow">
                                {initials}
                            </div>
                        )}
                        <div>
                            <p className="text-[11px] font-black text-slate-800">{stat.juiz.name}</p>
                            {stat.juiz.matricula && (
                                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Mat: {stat.juiz.matricula}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Route Info */}
            {stat.route && (
                <div className="bg-teal-50/80 rounded-xl p-2.5 mb-2.5 border border-teal-100">
                    <p className="text-[8px] font-black text-teal-500/80 uppercase tracking-[0.15em] mb-1.5">Distância da Sede TJPA</p>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Car size={12} className="text-teal-600" />
                            <span className="text-sm font-black text-teal-700">{stat.route.distanceKm} km</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-teal-600" />
                            <span className="text-sm font-black text-teal-700">{stat.route.durationFormatted}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-50 rounded-xl p-2.5 mb-2.5 border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5">Resumo Financeiro</p>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <p className="text-[8px] font-bold text-emerald-500">Concedido</p>
                        <p className="text-xs font-black text-emerald-700">{CURRENCY_FULL.format(stat.totalConcedido)}</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-bold text-blue-500">Prestado</p>
                        <p className="text-xs font-black text-blue-700">{CURRENCY_FULL.format(stat.totalPrestado)}</p>
                    </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${prestadoPct}%` }} />
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
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Elementos de Despesa</p>
                </div>
                <div className="divide-y divide-slate-100">
                    {stat.elementos.length > 0 ? stat.elementos.map((e) => (
                        <div key={e.codigo} className="flex justify-between items-center px-2.5 py-1.5">
                            <span className="text-[10px] text-slate-600 font-mono">{e.codigo}</span>
                            <span className="text-[10px] font-bold text-slate-700">{CURRENCY_COMPACT.format(e.valor)}</span>
                        </div>
                    )) : (
                        <p className="px-2.5 py-3 text-[10px] text-slate-400 text-center italic">Sem itens registrados</p>
                    )}
                </div>
            </div>
        </div>
    );
});

// Remoção do marcador de Unidade Admin do Leaflet

// ── Sidebar Item ──
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
            {/* Route summary line */}
            {stat.route && (
                <div className="flex items-center gap-2 mb-1.5 text-[9px] text-teal-600 font-bold">
                    <Car size={10} />
                    <span>{stat.route.distanceKm} km</span>
                    <span className="text-slate-300">·</span>
                    <Clock size={10} />
                    <span>{stat.route.durationFormatted}</span>
                </div>
            )}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${prestadoPct}%` }} />
                </div>
                <span className="text-[8px] font-bold text-slate-400">{prestadoPct}%</span>
            </div>
        </button>
    );
});

// ── Unidade Sidebar Item ──
const UnidadeSidebarItem = memo(({ unidade, isSelected, onClick }: { unidade: UnidadeAdmin; isSelected: boolean; onClick: () => void; }) => (
    <button
        onClick={onClick}
        className={`w-full p-2.5 rounded-xl text-left transition-all border ${
            isSelected ? 'bg-teal-50 border-teal-200 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50'
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
                <h4 className={`text-xs font-black leading-tight ${isSelected ? 'text-teal-800' : 'text-slate-800'}`}>{unidade.sigla || unidade.nome}</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{unidade.tipo}</p>
                {isSelected && (
                    <p className="text-[10px] text-teal-600/70 mt-1 font-medium italic truncate">{unidade.responsavel || 'Sem responsável'}</p>
                )}
            </div>
        </div>
    </button>
));

// ── Geocoding Search Box ──
const GeoSearchBox = memo(({ onSelect }: { onSelect: (result: OrsGeocodingResult) => void }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<OrsGeocodingResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const handleSearch = useCallback((value: string) => {
        setQuery(value);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (value.length < 3) { setResults([]); setOpen(false); return; }

        timeoutRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const data = await geocodeAddress(value, { limit: 5 });
                setResults(data);
                setOpen(data.length > 0);
            } catch { setResults([]); }
            setLoading(false);
        }, 500);
    }, []);

    return (
        <div className="relative">
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500" size={14} />
                <input
                    type="text"
                    placeholder="Buscar endereço ou local..."
                    className="w-full pl-9 pr-8 py-2.5 bg-white border border-teal-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 shadow-sm font-medium"
                    value={query}
                    onChange={e => handleSearch(e.target.value)}
                    onFocus={() => results.length > 0 && setOpen(true)}
                />
                {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-400 animate-spin" size={14} />}
                {query && !loading && (
                    <button onClick={() => { setQuery(''); setResults([]); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={14} />
                    </button>
                )}
            </div>
            {open && (
                <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden max-h-60 overflow-y-auto">
                    {results.map((r, i) => (
                        <button key={i} onClick={() => { onSelect(r); setOpen(false); setQuery(r.label); }}
                            className="w-full px-3 py-2.5 text-left hover:bg-teal-50 transition-colors border-b border-slate-50 last:border-0">
                            <div className="flex items-start gap-2">
                                <MapPin size={12} className="text-teal-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[11px] font-bold text-slate-800 leading-tight">{r.label}</p>
                                    <p className="text-[9px] text-slate-400 mt-0.5">{r.lat.toFixed(4)}, {r.lng.toFixed(4)}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
});

// ==================== ISOCHRONE COLORS ====================
const ISOCHRONE_COLORS = ['#10b98180', '#3b82f680', '#f59e0b80', '#ef444480'];
const ISOCHRONE_LABELS = ['1h', '2h', '4h', '8h'];

// ==================== MAIN COMPONENT ====================
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

    // ORS State
    const [activeRoute, setActiveRoute] = useState<OrsRouteResult | null>(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [activeTileKey, setActiveTileKey] = useState<string>('voyager');
    const [showTilePicker, setShowTilePicker] = useState(false);
    const [isochrones, setIsochrones] = useState<OrsIsochroneResult[]>([]);
    const [showIsochrones, setShowIsochrones] = useState(false);
    const [isoLoading, setIsoLoading] = useState(false);
    const [routesLoaded, setRoutesLoaded] = useState(false);
    const [routeProgress, setRouteProgress] = useState({ done: 0, total: 0 });

    const activeTile = ORS_TILE_LAYERS[activeTileKey];

    // Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchInput), 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value);

    // ── Data Fetch ──
    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            setLoading(true);
            try {
                console.log('🗺️ Iniciando carga de dados geográficos...');
                const comarcasRes = await supabase.from('comarcas_situacao').select('*').order('comarca');
                console.log('📍 Comarcas:', comarcasRes.data?.length, comarcasRes.error);
                
                const statsRes = await supabase.rpc('get_comarca_execution_stats');
                console.log('📊 Stats RPC:', statsRes.data?.length, statsRes.error);

                const unidadesRes = await supabase.from('unidades_administrativas').select('*');
                console.log('🏛️ Unidades:', unidadesRes.data?.length, unidadesRes.error);

                const profilesRes = await supabase.from('profiles').select('full_name, email, avatar_url, matricula').limit(50);

                if (cancelled) return;

                const profiles = profilesRes.data || [];
                let executionData = statsRes.data || [];
                let comarcasData = comarcasRes.data || [];

                // ── MOCK FALLBACK (Para Validação de UI) ──
                if (comarcasData.length === 0) {
                     console.warn('⚠️ Nenhuma comarca encontrada. Usando MOCK DATA para validação de UI.');
                     
                     comarcasData = [
                        { comarca: 'BELÉM', latitude: -1.4557, longitude: -48.4902, entrancia: '3ª Entrância', regiao: 'Metropolitana' },
                        { comarca: 'ANANINDEUA', latitude: -1.3636, longitude: -48.3722, entrancia: '3ª Entrância', regiao: 'Metropolitana' },
                        { comarca: 'MARABÁ', latitude: -5.3686, longitude: -49.1179, entrancia: '3ª Entrância', regiao: 'Sudeste' },
                        { comarca: 'SANTARÉM', latitude: -2.4430, longitude: -54.7082, entrancia: '3ª Entrância', regiao: 'Baixo Amazonas' },
                        { comarca: 'CASTANHAL', latitude: -1.2963, longitude: -47.9258, entrancia: '3ª Entrância', regiao: 'Nordeste' },
                     ];

                     executionData = [
                        { comarca: 'BELÉM', total_concedido: 3011000, total_prestado: 2131000, process_count: 10, elementos: [
                            { codigo: '3.3.90.30', descricao: 'Material de Consumo', valor: 64400 },
                            { codigo: '3.3.90.33', descricao: 'Passagens e Locomoção', valor: 48800 },
                            { codigo: '3.3.90.36', descricao: 'Serv. Terceiros - PF', valor: 64500 },
                            { codigo: '3.3.90.39', descricao: 'Serv. Terceiros - PJ', valor: 122600 }
                        ]},
                        { comarca: 'ANANINDEUA', total_concedido: 113000, total_prestado: 95000, process_count: 12, elementos: [] },
                        { comarca: 'MARABÁ', total_concedido: 111000, total_prestado: 45000, process_count: 1, elementos: [] },
                        { comarca: 'SANTARÉM', total_concedido: 87000, total_prestado: 87000, process_count: 12, elementos: [] },
                        { comarca: 'CASTANHAL', total_concedido: 50000, total_prestado: 10000, process_count: 10, elementos: [] }
                     ];
                }

                const result: ComarcaStats[] = comarcasData.map(c => {
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
                        comarca: c.comarca, lat: Number(c.latitude), lng: Number(c.longitude),
                        entrancia, polo: c.polo || '-', regiao: c.regiao || '-',
                        totalConcedido, totalPrestado, processCount, elementos, juiz,
                    };
                });

                setStats(result);

                const adminUnits: UnidadeAdmin[] = (unidadesRes.data || []).map((u: any) => ({
                    id: u.id, nome: u.nome, sigla: u.sigla, tipo: u.tipo,
                    vinculacao: u.vinculacao, responsavel: u.responsavel,
                    lat: Number(u.latitude), lng: Number(u.longitude),
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

    // ── Filters ──
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

    // ── Handlers ──
    const handleComarcaClick = useCallback(async (stat: ComarcaStats) => {
        setMapFocus({ center: [stat.lat, stat.lng], zoom: 10 });
        setSelectedComarca(stat.comarca);
        setIsExpanded(false);
        setSelectedUnidade(null);

        // Calculate route to this comarca
        if (!stat.route) {
            setRouteLoading(true);
            try {
                // Aqui podemos manter o getRouteFromSede por enquanto se ele for agnóstico a mapa
                const route = await getRouteFromSede(stat.lat, stat.lng, stat.comarca);
                setActiveRoute(route);
                
                // Update stat in-place
                stat.route = route;
                setStats(prev => prev.map(s => s.comarca === stat.comarca ? { ...s, route } : s));
            } catch (err) {
                console.warn('Route calculation failed:', err);
                setActiveRoute(null);
            } finally {
                setRouteLoading(false);
            }
        } else {
            setActiveRoute(stat.route);
        }
    }, []);

    const handleUnidadeClick = useCallback((unidade: UnidadeAdmin) => {
        setMapFocus({ center: [unidade.lat, unidade.lng], zoom: 13 });
        setSelectedUnidade(unidade.id);
        setSelectedComarca(null);
        setActiveRoute(null);
    }, []);

    const handleGeoSelect = useCallback((result: OrsGeocodingResult) => {
        setMapFocus({ center: [result.lat, result.lng], zoom: 14 });
    }, []);

    const handleLoadIsochrones = useCallback(async () => {
        if (isochrones.length > 0) {
            setShowIsochrones(!showIsochrones);
            return;
        }
        setIsoLoading(true);
        try {
            const data = await getIsochrones(TJPA_SEDE, {
                rangeSeconds: [3600, 7200, 14400, 28800], // 1h, 2h, 4h, 8h
            });
            setIsochrones(data);
            setShowIsochrones(true);
        } catch (err) {
            console.warn('Isochrone error:', err);
        } finally {
            setIsoLoading(false);
        }
    }, [isochrones, showIsochrones]);

    const calculateRadius = useCallback((value: number) => {
        if (value === 0) return 6;
        return Math.max(7, Math.min(32, 4 + Math.log(value + 1) * 2.5));
    }, []);

    const handleLoadAllRoutes = useCallback(async () => {
        if (routesLoaded || routeLoading) return;
        setRouteLoading(true);
        setRouteProgress({ done: 0, total: stats.length });

        try {
            const comarcasForRoute = stats.map(s => ({ lat: s.lat, lng: s.lng, nome: s.comarca }));
            const routeMap = await batchRoutesFromSede(comarcasForRoute, {
                delayMs: 200, // 5 requests per second to avoid rate limits
                onProgress: (done, total) => setRouteProgress({ done, total })
            });

            setStats(prev => prev.map(s => {
                const route = routeMap.get(s.comarca);
                return route ? { ...s, route } : s;
            }));
            setRoutesLoaded(true);
        } catch (err) {
            console.error('Batch route error:', err);
        } finally {
            setRouteLoading(false);
            setRouteProgress({ done: 0, total: 0 });
        }
    }, [stats, routesLoaded, routeLoading]);

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
    }, []);

    const [isExpanded, setIsExpanded] = useState(false);

    // ── Loading State ──
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] bg-slate-50 rounded-2xl border border-slate-100">
                <Loader2 className="w-12 h-12 text-teal-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium font-bold uppercase tracking-widest text-[10px]">Portal Geográfico SOSFU</p>
                <p className="text-xs text-gray-400 mt-2">Mapeando comarcas e unidades do Estado do Pará...</p>
            </div>
        );
    }

    return (
        <div className={`flex flex-col animate-in fade-in duration-500 gap-3 ${isExpanded ? 'h-[calc(100vh-100px)]' : 'h-full'}`}>
            {/* Header / Stats Badge - Hidden in Expanded Mode */}
            {!isExpanded && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
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
                            <p className="text-sm font-black text-teal-600">{unidadesAdmin.length}</p>
                        </div>
                        <div className="w-8 h-8 bg-teal-50 text-teal-500 rounded-lg flex items-center justify-center"><Landmark size={16} /></div>
                    </div>
                    {/* Active route summary */}
                    <div className={`bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between transition-all ${activeRoute ? 'border-teal-200 bg-teal-50/30' : 'border-slate-100'}`}>
                        {activeRoute ? (
                            <>
                                <div>
                                    <p className="text-[9px] font-black text-teal-500 uppercase">Rota Ativa</p>
                                    <p className="text-sm font-black text-teal-700">{activeRoute.summary}</p>
                                </div>
                                <div className="w-8 h-8 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center"><Navigation size={16} /></div>
                            </>
                        ) : routeLoading ? (
                            <>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Calculando...</p>
                                    <p className="text-sm font-black text-slate-500">rota</p>
                                </div>
                                <Loader2 size={16} className="text-teal-500 animate-spin" />
                            </>
                        ) : (
                            <>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Rota</p>
                                    <p className="text-sm font-black text-slate-400">—</p>
                                </div>
                                <div className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center"><Navigation size={16} /></div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
                {/* ═══ Sidebar ═══ */}
                {/* Hide sidebar in expanded mode if on mobile, or just shrink it? Let's hide it for full focus */}
                <div className={`w-full lg:w-80 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden shrink-0 transition-all duration-300 ${isExpanded ? 'hidden' : 'block'}`}>
                    {selectedComarca ? (
                        (() => {
                            const stat = stats.find(s => s.comarca === selectedComarca);
                            if (!stat) return null;
                            return (
                                <MapDetailCard 
                                    data={stat} 
                                    onClose={() => {
                                        setSelectedComarca(null);
                                        // Optional: Reset map view?
                                        setMapFocus({ center: INITIAL_CENTER, zoom: 7 }); 
                                    }} 
                                />
                            );
                        })()
                    ) : (
                        <>
                            <div className="p-4 pb-3 border-b border-gray-100 bg-white">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-6 h-6 bg-teal-600 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
                                        <PieChart size={14} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none">Portal de Inteligência</h2>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">SOSFU · Mapa</p>
                                    </div>
                                </div>
                                <button className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-bold transition-all">
                                     <Download size={12} /> Exportar Visão Atual
                                </button>
                            </div>

                            <div className="p-4 border-b border-gray-50 bg-slate-50/30 space-y-3">
                                {/* Geocoding Search */}
                                <GeoSearchBox onSelect={handleGeoSelect} />

                                {/* Local Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Filtrar comarcas/unidades..."
                                        className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-400 shadow-sm font-medium"
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
                                                    ? 'bg-white text-teal-600 shadow-sm'
                                                    : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                        >
                                            {tab.label}
                                            <span className={`px-1.5 py-0.5 rounded-lg text-[9px] ${
                                                sidebarTab === tab.key ? 'bg-teal-50 text-teal-600' : 'bg-slate-200 text-slate-400'
                                            }`}>{tab.key === 'todos' ? filteredStats.length + filteredUnidades.length : tab.count}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* ORS Action Buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleLoadIsochrones}
                                        disabled={isoLoading}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                                            showIsochrones
                                                ? 'bg-teal-600 text-white border-teal-600'
                                                : 'bg-white text-teal-600 border-teal-200 hover:bg-teal-50'
                                        }`}
                                    >
                                        {isoLoading ? <Loader2 size={12} className="animate-spin" /> : <Timer size={12} />}
                                        Isócronas
                                    </button>
                                    <button
                                        onClick={handleLoadAllRoutes}
                                        disabled={routeLoading || routesLoaded}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                                            routesLoaded
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 opacity-60 cursor-default'
                                                : routeLoading
                                                    ? 'bg-slate-100 text-slate-400 border-slate-200'
                                                    : 'bg-white text-teal-600 border-teal-200 hover:bg-teal-50'
                                        }`}
                                    >
                                        {routeLoading ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                                        {routeLoading ? `${Math.round((routeProgress.done / routeProgress.total) * 100)}%` : routesLoaded ? 'Rotas OK' : 'Rotas (Todos)'}
                                    </button>
                                    <button
                                        onClick={() => setShowTilePicker(!showTilePicker)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                                            showTilePicker
                                                ? 'bg-slate-700 text-white border-slate-700'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Layers size={12} />
                                        Camadas
                                    </button>
                                </div>

                                {/* Expand Map Toggle Button (In Sidebar) */}
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-800 text-white text-[10px] font-bold uppercase hover:bg-slate-900 transition-colors shadow-sm"
                                >
                                    {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                                    {isExpanded ? 'Restaurar Visualização' : 'Expandir Mapa'}
                                </button>

                                {/* Tile Picker */}
                                {showTilePicker && (
                                    <div className="grid grid-cols-3 gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {Object.entries(ORS_TILE_LAYERS).map(([key, tile]) => (
                                            <button
                                                key={key}
                                                onClick={() => { setActiveTileKey(key); setShowTilePicker(false); }}
                                                className={`py-1.5 px-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${
                                                    activeTileKey === key
                                                        ? 'bg-teal-600 text-white border-teal-600'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                                                }`}
                                            >
                                                {tile.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
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
                        </>
                    )}
                </div>

                {/* ═══ Map ═══ */}
                <div className={`flex-1 bg-slate-100 rounded-3xl shadow-xl border border-slate-200 overflow-hidden relative z-0 transition-all duration-300 ${isExpanded ? 'h-full' : 'min-h-[600px]'}`}>
                    
                    {/* Expand/Restore Button (Floating on Map) */}
                    <div className="absolute top-4 left-4 z-[1000] flex gap-2">
                         {isExpanded && (
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 hover:bg-white transition-colors"
                            >
                                <Minimize2 size={14} className="text-slate-500" />
                                Restaurar
                            </button>
                         )}
                         {!isExpanded && (
                            <button
                                onClick={() => setIsExpanded(true)}
                                className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 hover:bg-white transition-colors md:hidden"
                            >
                                <Maximize2 size={14} className="text-slate-500" />
                            </button>
                         )}
                    </div>

                    <GoogleMapPremium
                        center={mapFocus?.center || INITIAL_CENTER}
                        zoom={mapFocus?.zoom || 7}
                        className="h-full w-full"
                        mapType={activeTileKey === 'satellite' ? 'satellite' : 'roadmap'}
                        origin={TJPA_SEDE}
                        destination={activeRoute ? [activeRoute.geometry[activeRoute.geometry.length-1][1], activeRoute.geometry[activeRoute.geometry.length-1][0]] : undefined}
                        isochrones={showIsochrones ? isochrones.map((iso, i) => ({
                            points: (iso.geometry.coordinates[0] as number[][]).map(c => ({ lat: c[1], lng: c[0] })),
                            color: ISOCHRONE_COLORS[i] || ISOCHRONE_COLORS[0],
                            label: ISOCHRONE_LABELS[i]
                        })) : []}
                        markers={[
                            ...(showComarcas ? filteredStats.map(s => ({
                                id: `comarca-${s.comarca}`,
                                lat: s.lat,
                                lng: s.lng,
                                title: s.comarca,
                                tooltip: `${CURRENCY_COMPACT.format(s.totalConcedido)} · ${s.processCount} processos`,
                                color: getColor(s),
                                radius: calculateRadius(s.totalConcedido) / 2,
                                data: s
                            })) : []),
                            ...(showUnidades ? unidadesAdmin.map(u => ({
                                id: `unidade-${u.id}`,
                                lat: u.lat,
                                lng: u.lng,
                                title: u.sigla || u.nome,
                                tooltip: u.tipo,
                                color: UNIDADE_COLORS[u.tipo] || UNIDADE_COLORS.Outro,
                                radius: 5,
                                data: u
                            })) : []),
                            {
                                id: 'sede-tjpa',
                                lat: TJPA_SEDE[0],
                                lng: TJPA_SEDE[1],
                                title: 'Sede TJPA',
                                tooltip: 'Sede Administrativa',
                                color: '#0d9488',
                                radius: 8,
                                label: '📍'
                            }
                        ]}
                        onMarkerClick={(marker) => {
                            if (typeof marker.id === 'string' && marker.id.startsWith('comarca-')) {
                                handleComarcaClick(marker.data);
                            } else if (typeof marker.id === 'string' && marker.id.startsWith('unidade-')) {
                                handleUnidadeClick(marker.data);
                            }
                        }}
                    />

                    {/* Legend Floating */}
                    <div className="absolute bottom-6 left-4 md:left-auto md:right-16 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-100 z-[1000] text-xs max-w-[200px]">
                        <div className="flex items-center gap-2 mb-3">
                            <BarChart3 size={14} className="text-teal-600" />
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

                        {/* Isochrone Legend */}
                        {showIsochrones && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Timer size={12} className="text-teal-600" />
                                    <span className="font-black text-slate-800 uppercase text-[9px] tracking-wider">Isócronas (Belém)</span>
                                </div>
                                <div className="space-y-1.5">
                                    {ISOCHRONE_LABELS.map((label, i) => (
                                        <div key={label} className="flex items-center gap-3">
                                            <span className="w-2.5 h-2.5 rounded-sm border border-white shadow-sm" style={{ backgroundColor: ISOCHRONE_COLORS[i] }} />
                                            <span className="text-[9px] text-slate-600 font-bold">Até {label} de carro</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tile Layer Badge */}
                    <div className="absolute top-4 right-4 z-[1000]">
                        <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-slate-200 text-[9px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers size={10} className="text-teal-500" />
                            {activeTile.name}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
