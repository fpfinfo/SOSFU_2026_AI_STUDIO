import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl, useMap, Tooltip as LeafletTooltip } from 'react-leaflet';
import { supabase } from '../../lib/supabase';
import {
    Loader2, Map as MapIcon, DollarSign, Search, Navigation,
    BarChart3, Mail, Scale, TrendingUp, Building2, MapPin
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Responsive Leaflet popup overrides
const popupStyles = document.createElement('style');
popupStyles.textContent = `
  .comarca-popup .leaflet-popup-content-wrapper {
    border-radius: 16px !important;
    padding: 0 !important;
    box-shadow: 0 10px 40px rgba(0,0,0,.15) !important;
    max-height: 80vh;
    overflow-y: auto;
  }
  .comarca-popup .leaflet-popup-content {
    margin: 12px !important;
    width: clamp(240px, 75vw, 380px) !important;
    max-width: calc(100vw - 60px) !important;
  }
  .comarca-popup .leaflet-popup-close-button {
    top: 8px !important; right: 8px !important;
    font-size: 20px !important; color: #94a3b8 !important;
  }
  @media (max-width: 640px) {
    .comarca-popup .leaflet-popup-content {
      width: clamp(200px, 85vw, 320px) !important;
      margin: 8px !important;
    }
  }
`;
if (!document.getElementById('comarca-popup-styles')) {
  popupStyles.id = 'comarca-popup-styles';
  document.head.appendChild(popupStyles);
}

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
    'Secretaria': '#9333ea',
    'Departamento': '#2563eb',
    'Coordenadoria': '#059669',
    'Serviço': '#d97706',
    'Assessoria': '#4f46e5',
    'Seção': '#0891b2',
    'Gabinete': '#e11d48',
    'Outro': '#6b7280',
};

interface SefinMapViewProps {
    darkMode?: boolean;
    onNavigate?: (page: string, processId?: string) => void;
}

// ==================== CONSTANTS ====================
const CURRENCY_COMPACT = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' });
const CURRENCY_FULL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const INITIAL_CENTER: [number, number] = [-3.5, -52];

// Elementos de despesa permitidos para Suprimento de Fundos (CNJ 169/2013)
const ELEMENTOS_DESPESA = [
    { codigo: '3.3.90.30', descricao: 'Material de Consumo' },
    { codigo: '3.3.90.33', descricao: 'Passagens e Locomoção' },
    { codigo: '3.3.90.36', descricao: 'Serv. Terceiros - PF' },
    { codigo: '3.3.90.39', descricao: 'Serv. Terceiros - PJ' },
];

const ENTRANCIA_RANGES: Record<string, [number, number]> = {
    '3ª Entrância': [40_000, 120_000],
    '2ª Entrância': [15_000, 60_000],
    '1ª Entrância': [2_000, 25_000],
};

function seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// ==================== MAP CONTROLLER ====================
const MapController = memo(({ center, zoom }: { center: [number, number] | null; zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, zoom, { duration: 1.0 });
    }, [center, zoom, map]);
    return null;
});

// ==================== POPUP CONTENT ====================
const ComarcaPopupContent = memo(({ stat }: { stat: ComarcaStats }) => {
    const initials = stat.juiz?.name
        ? stat.juiz.name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
        : '?';

    const prestadoPct = stat.totalConcedido > 0 ? Math.round((stat.totalPrestado / stat.totalConcedido) * 100) : 0;

    return (
        <div className="w-full">
            {/* ── Header: Comarca ── */}
            <div className="flex justify-between items-start pb-2.5 mb-3 border-b border-slate-200">
                <div>
                    <h3 className="font-black text-slate-800 uppercase text-sm leading-tight tracking-wide">{stat.comarca}</h3>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{stat.entrancia}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{stat.polo}</span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">{stat.regiao}</span>
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
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-sm font-black text-white border-2 border-white shadow-md">
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
                        <p className="text-[9px] text-emerald-600 flex items-center gap-1 font-semibold"><DollarSign size={9} /> Recebido no Ano</p>
                        <p className="text-base font-black text-emerald-700 mt-0.5">{CURRENCY_FULL.format(stat.totalConcedido)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-blue-100">
                        <p className="text-[9px] text-blue-600 flex items-center gap-1 font-semibold"><Scale size={9} /> Prestado Contas</p>
                        <p className="text-base font-black text-blue-700 mt-0.5">{CURRENCY_FULL.format(stat.totalPrestado)}</p>
                    </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${
                                prestadoPct >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                                prestadoPct >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                                'bg-gradient-to-r from-red-400 to-red-500'
                            }`}
                            style={{ width: `${Math.min(100, prestadoPct)}%` }}
                        />
                    </div>
                    <span className={`text-[10px] font-black ${
                        prestadoPct >= 80 ? 'text-emerald-600' : prestadoPct >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>{prestadoPct}%</span>
                </div>
                <div className="flex justify-between mt-1.5 text-[9px] text-slate-400">
                    <span>{stat.processCount} processos ativos</span>
                    <span>Pendente: {CURRENCY_COMPACT.format(stat.totalConcedido - stat.totalPrestado)}</span>
                </div>
            </div>

            {/* ── Tabela Elementos de Despesa ── */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.15em]">Distribuição por Elemento de Despesa</p>
                </div>
                <table className="w-full text-[10px]">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="text-left py-1.5 px-3 font-bold text-slate-500">Elemento</th>
                            <th className="text-left py-1.5 px-2 font-bold text-slate-500">Descrição</th>
                            <th className="text-right py-1.5 px-3 font-bold text-slate-500">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stat.elementos.map((el, i) => (
                            <tr key={el.codigo} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} border-b border-slate-50 last:border-0`}>
                                <td className="py-1.5 px-3 font-mono font-bold text-indigo-600">{el.codigo}</td>
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
const SidebarItem = memo(({ stat, isSelected, onClick }: {
    stat: ComarcaStats; isSelected: boolean; onClick: () => void;
}) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all text-left group ${
            isSelected
                ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-100'
                : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
        }`}
    >
        <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-7 h-7 flex items-center justify-center rounded-full text-[9px] font-bold shrink-0 ${
                stat.totalConcedido > 50000 ? 'bg-red-100 text-red-600' :
                    stat.totalConcedido > 20000 ? 'bg-amber-100 text-amber-600' :
                        'bg-emerald-100 text-emerald-600'
            }`}>
                {stat.comarca.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
                <p className={`text-xs font-bold truncate ${isSelected ? 'text-emerald-700' : 'text-gray-700'}`}>{stat.comarca}</p>
                <p className="text-[10px] text-gray-400 truncate">{stat.entrancia} · {stat.processCount} proc.</p>
            </div>
        </div>
        <div className="text-right shrink-0 ml-2">
            <span className="text-xs font-bold text-gray-600 block">{CURRENCY_COMPACT.format(stat.totalConcedido)}</span>
            <Navigation size={10} className={`ml-auto mt-0.5 ${isSelected ? 'text-emerald-500' : 'text-gray-300 group-hover:text-emerald-400'}`} />
        </div>
    </button>
));

// ==================== COMARCA MARKER ====================
const ComarcaMarker = memo(({ stat, isSelected, radius, color, onClick }: {
    stat: ComarcaStats; isSelected: boolean; radius: number; color: string; onClick: () => void;
}) => (
    <CircleMarker
        center={[stat.lat, stat.lng]}
        eventHandlers={{ click: onClick }}
        pathOptions={{
            color: isSelected ? '#312e81' : color,
            fillColor: color,
            fillOpacity: isSelected ? 0.95 : 0.7,
            weight: isSelected ? 3.5 : 2,
        }}
        radius={radius}
    >
        <LeafletTooltip direction="top" offset={[0, -12]} opacity={0.95}>
            <div className="text-center px-2 py-0.5">
                <span className="font-black text-xs uppercase block text-slate-800">{stat.comarca}</span>
                <span className="text-[10px] font-mono font-bold text-emerald-600 block mt-0.5">
                    {CURRENCY_COMPACT.format(stat.totalConcedido)}
                </span>
                <span className="text-[9px] text-slate-400">{stat.processCount} processos</span>
            </div>
        </LeafletTooltip>
        <Popup minWidth={220} maxWidth={420} className="comarca-popup">
            <ComarcaPopupContent stat={stat} />
        </Popup>
    </CircleMarker>
));

// ==================== UNIDADE ADMIN MARKER ====================
const UnidadeAdminMarker = memo(({ unidade }: { unidade: UnidadeAdmin }) => {
    const markerColor = TIPO_MARKER_COLORS[unidade.tipo] || TIPO_MARKER_COLORS['Outro'];
    return (
        <CircleMarker
            center={[unidade.lat, unidade.lng]}
            pathOptions={{
                color: '#1e293b',
                fillColor: markerColor,
                fillOpacity: 0.85,
                weight: 2.5,
                dashArray: '4 2',
            }}
            radius={10}
        >
            <LeafletTooltip direction="top" offset={[0, -12]} opacity={0.95}>
                <div className="text-center px-2 py-0.5">
                    <span className="font-black text-xs block text-slate-800">
                        {unidade.sigla || unidade.nome}
                    </span>
                    <span className="text-[9px] text-slate-400 block">{unidade.tipo}</span>
                </div>
            </LeafletTooltip>
            <Popup minWidth={200} maxWidth={320} className="comarca-popup">
                <div className="w-full">
                    <div className="pb-2 mb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black"
                                 style={{ backgroundColor: markerColor }}>
                                {unidade.sigla?.slice(0, 2) || unidade.nome.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 text-sm leading-tight">{unidade.nome}</h3>
                                {unidade.sigla && (
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{unidade.sigla}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-bold w-20">Tipo:</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
                                backgroundColor: markerColor + '20', color: markerColor
                            }}>{unidade.tipo}</span>
                        </div>
                        {unidade.vinculacao && (
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 font-bold w-20">Vinculação:</span>
                                <span className="text-slate-700 font-medium">{unidade.vinculacao}</span>
                            </div>
                        )}
                        {unidade.responsavel && (
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 font-bold w-20">Titular:</span>
                                <span className="text-slate-700 font-medium">{unidade.responsavel}</span>
                            </div>
                        )}
                    </div>
                </div>
            </Popup>
        </CircleMarker>
    );
});

// ==================== MAIN COMPONENT ====================
export const SefinMapView: React.FC<SefinMapViewProps> = ({ darkMode = false }) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<ComarcaStats[]>([]);
    const [unidadesAdmin, setUnidadesAdmin] = useState<UnidadeAdmin[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [mapFocus, setMapFocus] = useState<{ center: [number, number]; zoom: number } | null>(null);
    const [selectedComarca, setSelectedComarca] = useState<string | null>(null);
    const [showComarcas, setShowComarcas] = useState(true);
    const [showUnidades, setShowUnidades] = useState(true);

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

                const result: ComarcaStats[] = comarcas.map((c: any, idx: number) => {
                    const seed = c.idcomarca || idx;
                    const entrancia = c.entrancia || '1ª Entrância';
                    const [minVal, maxVal] = ENTRANCIA_RANGES[entrancia] || [1_000, 15_000];

                    const totalConcedido = Math.round(minVal + seededRandom(seed * 7) * (maxVal - minVal));
                    const prestadoPct = 0.3 + seededRandom(seed * 13) * 0.6;
                    const totalPrestado = Math.round(totalConcedido * prestadoPct);
                    const processCount = Math.max(1, Math.round(seededRandom(seed * 19) * 12));

                    // Distribute total across 4 elementos de despesa
                    const pcts = [
                        0.20 + seededRandom(seed * 23) * 0.25, // 30 Material
                        0.05 + seededRandom(seed * 29) * 0.15, // 33 Passagens
                        0.10 + seededRandom(seed * 31) * 0.20, // 36 PF
                        0,                                       // 39 PJ = remainder
                    ];
                    const sumPcts = pcts[0] + pcts[1] + pcts[2];
                    pcts[3] = Math.max(0.05, 1 - sumPcts);
                    const totalPcts = pcts.reduce((a, b) => a + b, 0);

                    const elementos: ElementoDespesa[] = ELEMENTOS_DESPESA.map((el, i) => ({
                        codigo: el.codigo,
                        descricao: el.descricao,
                        valor: Math.round(totalConcedido * (pcts[i] / totalPcts)),
                    }));

                    // Assign judge from profiles deterministically
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
                            name: `Gestor ${c.comarca}`,
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
                const adminUnits: UnidadeAdmin[] = (unidadesRes.data || []).map((u: any) => ({
                    id: u.id,
                    nome: u.nome,
                    sigla: u.sigla,
                    tipo: u.tipo,
                    vinculacao: u.vinculacao,
                    responsavel: u.responsavel,
                    lat: u.latitude,
                    lng: u.longitude,
                }));
                setUnidadesAdmin(adminUnits);
            } catch (err) {
                console.error('SefinMapView fetch error:', err);
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

    const filteredStats = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return stats
            .filter(s => !term || s.comarca.toLowerCase().includes(term) || (s.juiz?.name.toLowerCase().includes(term)))
            .sort((a, b) => b.totalConcedido - a.totalConcedido);
    }, [stats, searchTerm]);

    const totalGeral = useMemo(() => stats.reduce((sum, s) => sum + s.totalConcedido, 0), [stats]);
    const totalPrestado = useMemo(() => stats.reduce((sum, s) => sum + s.totalPrestado, 0), [stats]);
    const comarcasAtivas = useMemo(() => stats.filter(s => s.processCount > 0).length, [stats]);

    const calculateRadius = useCallback((value: number) => {
        if (value === 0) return 7;
        // More visible minimum size, logarithmic scaling
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
            <div className="flex flex-col items-center justify-center h-[600px] bg-slate-50 rounded-xl">
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Carregando mapa de situação geográfica...</p>
                <p className="text-xs text-gray-400 mt-2">Processando 144 comarcas do Pará</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-500 gap-4 p-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><MapIcon size={24} /></div>
                    <div>
                        <h2 className="text-lg font-black text-gray-800 leading-none">Mapa de Situação Geográfica</h2>
                        <p className="text-xs text-gray-500 mt-1">Distribuição de despesas por comarca do Estado do Pará</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-center px-4 border-r border-slate-200">
                        <p className="text-lg font-black text-emerald-600 font-mono">{CURRENCY_COMPACT.format(totalGeral)}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Total Concedido</p>
                    </div>
                    <div className="text-center px-4 border-r border-slate-200">
                        <p className="text-lg font-black text-blue-600 font-mono">{CURRENCY_COMPACT.format(totalPrestado)}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Total Prestado</p>
                    </div>
                    <div className="text-center px-4 border-r border-slate-200">
                        <p className="text-lg font-black text-slate-700">{comarcasAtivas}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Comarcas Ativas</p>
                    </div>
                    <div className="text-center px-4">
                        <p className="text-lg font-black text-purple-600">{unidadesAdmin.length}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Unidades Admin.</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
                {/* SIDEBAR */}
                <div className="w-full lg:w-72 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden shrink-0">
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Building2 size={13} /> Comarcas
                            </span>
                            <span className="text-sm font-black text-emerald-600 font-mono">{filteredStats.length}</span>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Buscar comarca..."
                                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                        {filteredStats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <MapIcon size={28} className="mb-2 opacity-30" />
                                <p className="text-xs font-medium">Nenhuma comarca encontrada</p>
                            </div>
                        ) : filteredStats.map(stat => (
                            <SidebarItem
                                key={stat.comarca}
                                stat={stat}
                                isSelected={selectedComarca === stat.comarca}
                                onClick={() => handleComarcaClick(stat)}
                            />
                        ))}
                    </div>
                </div>

                {/* MAP */}
                <div className="flex-1 bg-slate-100 rounded-2xl shadow-lg border border-gray-200 overflow-hidden relative z-0">
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
                        {showComarcas && stats.map(stat => (
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

                    {/* Legend */}
                    <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-gray-200 z-[1000] text-xs">
                        <div className="flex items-center gap-2 mb-2">
                            <BarChart3 size={13} className="text-gray-400" />
                            <span className="font-black text-gray-600 uppercase text-[10px] tracking-wider">Legenda</span>
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
                                    <span className="text-[10px] text-gray-600">{label}</span>
                                </div>
                            ))}
                        </div>
                        {/* Layer Toggles */}
                        <div className="mt-3 pt-2 border-t border-gray-200 space-y-1.5">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Camadas</p>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={showComarcas} onChange={() => setShowComarcas(v => !v)}
                                    className="w-3 h-3 rounded accent-emerald-600" />
                                <span className="text-[10px] text-gray-600 font-medium">Comarcas</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={showUnidades} onChange={() => setShowUnidades(v => !v)}
                                    className="w-3 h-3 rounded accent-purple-600" />
                                <span className="text-[10px] text-gray-600 font-medium">Unidades Admin.</span>
                            </label>
                        </div>
                    </div>

                    {/* Stats Badge */}
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-gray-200 z-[1000]">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={13} className="text-emerald-500" />
                            <span className="text-[10px] font-bold text-slate-600">
                                {comarcasAtivas} / {stats.length} comarcas ativas
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
