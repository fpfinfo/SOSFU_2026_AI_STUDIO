import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import { supabase } from '../lib/supabase';
import { Loader2, Map as MapIcon, DollarSign, Layers, BarChart3, Search, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// --- CONFIGURAÇÃO GEOGRÁFICA (estática, fora do componente) ---
const GEO_DATA: Record<string, [number, number]> = {
    'BELÉM': [-1.4557, -48.4902],
    'ANANINDEUA': [-1.3636, -48.3733],
    'MARITUBA': [-1.3556, -48.3411],
    'BENEVIDES': [-1.3619, -48.2439],
    'SANTA BÁRBARA': [-1.2242, -48.2936],
    'SANTARÉM': [-2.4430, -54.7081],
    'ALENQUER': [-1.9425, -54.7383],
    'MONTE ALEGRE': [-2.0075, -54.0683],
    'ÓBIDOS': [-1.9022, -55.5178],
    'MARABÁ': [-5.3686, -49.1174],
    'SÃO JOÃO DO ARAGUAIA': [-5.3589, -48.7917],
    'CASTANHAL': [-1.2968, -47.9234],
    'IGARAPÉ-AÇU': [-1.1278, -47.6200],
    'ALTAMIRA': [-3.2033, -52.2064],
    'VITÓRIA DO XINGU': [-2.8833, -52.0167],
    'TUCURUÍ': [-3.7660, -49.6727],
    'BREU BRANCO': [-3.7431, -49.5658],
    'REDENÇÃO': [-8.0267, -50.0314],
    'XINGUARA': [-7.0983, -49.9431],
    'CONCEIÇÃO DO ARAGUAIA': [-8.2589, -49.2647],
    'ABAETETUBA': [-1.7218, -48.8788],
    'BARCARENA': [-1.5058, -48.6258],
    'MOJU': [-1.8844, -48.7686],
    'ITAITUBA': [-4.2762, -55.9836],
    'NOVO PROGRESSO': [-7.1428, -55.3853],
    'BREVES': [-1.6818, -50.4796],
    'PORTEL': [-1.9367, -50.8211],
    'CAPANEMA': [-1.1969, -47.1812],
    'BRAGANÇA': [-1.0536, -46.7656],
    'PARAGOMINAS': [-2.9667, -47.3500],
    'DOM ELISEU': [-4.2833, -47.8250],
    'PARAUAPEBAS': [-6.0676, -49.9048],
    'CANAÃ DOS CARAJÁS': [-6.4306, -49.8778],
    'CAMETÁ': [-2.2422, -49.4950],
    'SALINÓPOLIS': [-0.6133, -47.3561],
    'SÃO FÉLIX DO XINGU': [-6.6447, -51.9902],
    'VIGIA': [-0.8583, -48.1417],
    'TOMÉ-AÇU': [-2.4178, -48.1506],
    'TAILÂNDIA': [-2.9469, -48.9525]
};

const CURRENCY_COMPACT = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' });
const CURRENCY_FULL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const INITIAL_CENTER: [number, number] = [-3.5, -52];

interface GeoProcessStats {
    municipio: string;
    lat: number;
    lng: number;
    totalValue: number;
    processCount: number;
    breakdown: Record<string, number>;
}

// --- Sub-components memoizados ---

const MapController = memo(({ center, zoom }: { center: [number, number] | null, zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, zoom, { duration: 1.2 });
    }, [center, zoom, map]);
    return null;
});

const MapMarker = memo(({ stat, isSelected, radius, color, onClick, rank }: {
    stat: GeoProcessStats; isSelected: boolean; radius: number; color: string; onClick: () => void; rank: number;
}) => (
    <CircleMarker
        center={[stat.lat, stat.lng]}
        eventHandlers={{ click: onClick }}
        pathOptions={{
            color: isSelected ? '#312e81' : color,
            fillColor: color,
            fillOpacity: isSelected ? 0.9 : 0.6,
            weight: isSelected ? 3 : 1
        }}
        radius={radius}
    >
        <Tooltip direction="top" offset={[0, -10]} opacity={1}>
            <div className="text-center px-1">
                <span className="font-bold text-xs uppercase block text-slate-700">{stat.municipio}</span>
                <span className="text-[10px] font-mono font-bold text-slate-500">
                    {CURRENCY_COMPACT.format(stat.totalValue)}
                </span>
            </div>
        </Tooltip>
        <Popup minWidth={240}>
            <div className="p-1">
                <div className="flex justify-between items-start border-b pb-2 mb-2">
                    <h3 className="font-bold text-gray-800 uppercase text-sm">{stat.municipio}</h3>
                    <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded font-bold">
                        Ranking #{rank}
                    </span>
                </div>
                <div className="space-y-1.5 mb-3 bg-slate-50 p-2 rounded border border-slate-100">
                    {Object.entries(stat.breakdown).map(([element, val]) => (
                        <div key={element} className="flex justify-between items-center text-[10px]">
                            <span className="text-gray-600 truncate max-w-[120px]" title={element}>{element}</span>
                            <span className="font-bold text-gray-700">{CURRENCY_COMPACT.format(Number(val))}</span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between items-center pt-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Total Realizado</span>
                    <span className="text-sm font-black text-indigo-700">{CURRENCY_FULL.format(stat.totalValue)}</span>
                </div>
            </div>
        </Popup>
    </CircleMarker>
));

const SidebarItem = memo(({ stat, idx, isSelected, onClick }: {
    stat: GeoProcessStats; idx: number; isSelected: boolean; onClick: () => void;
}) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left group ${
            isSelected
            ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100'
            : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
        }`}
    >
        <div className="flex items-center gap-3">
            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                {idx + 1}
            </span>
            <div className="min-w-0">
                <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>{stat.municipio}</p>
                <p className="text-[10px] text-gray-400 truncate">{stat.processCount} processos</p>
            </div>
        </div>
        <div className="text-right">
            <span className="text-xs font-bold text-gray-600 block">{CURRENCY_COMPACT.format(stat.totalValue)}</span>
            <Navigation size={12} className={`ml-auto mt-1 ${isSelected ? 'text-indigo-500' : 'text-gray-300 group-hover:text-indigo-400'}`} />
        </div>
    </button>
));

// --- Componente Principal ---

export const ReportsView: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [geoStats, setGeoStats] = useState<GeoProcessStats[]>([]);
    const [totalGeral, setTotalGeral] = useState(0);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [activeLayer, setActiveLayer] = useState<'VOLUME' | 'DENSITY'>('VOLUME');
    const [searchTerm, setSearchTerm] = useState('');
    const [mapFocus, setMapFocus] = useState<{center: [number, number], zoom: number} | null>(null);
    const [selectedCity, setSelectedCity] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        
        supabase.rpc('get_geo_dashboard_stats', { year_filter: filterYear })
            .then(({ data, error }) => {
                if (cancelled || error) { setLoading(false); return; }
                
                let globalSum = 0;
                const mapped: GeoProcessStats[] = [];

                (data || []).forEach((row: any) => {
                    const cityKey = (row.city || row.municipio || 'BELÉM').toUpperCase().trim();
                    const coords = GEO_DATA[cityKey];
                    if (!coords) return;
                    
                    const value = Number(row.total || row.total_value || 0);
                    globalSum += value;

                    mapped.push({
                        municipio: cityKey,
                        lat: coords[0],
                        lng: coords[1],
                        totalValue: value,
                        processCount: Number(row.qtd || row.process_count || 0),
                        breakdown: row.cats || row.breakdown || {},
                    });
                });

                setGeoStats(mapped);
                setTotalGeral(globalSum);
                setLoading(false);
            });

        return () => { cancelled = true; };
    }, [filterYear]);

    const handleCityClick = useCallback((stat: GeoProcessStats) => {
        setMapFocus({ center: [stat.lat, stat.lng], zoom: 10 });
        setSelectedCity(stat.municipio);
    }, []);

    const filteredStats = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return geoStats
            .filter(s => !term || s.municipio.toLowerCase().includes(term))
            .sort((a, b) => b.totalValue - a.totalValue);
    }, [geoStats, searchTerm]);

    // Pré-computa ranks para lookup O(1) nos markers
    const rankMap = useMemo(() => {
        const map = new Map<string, number>();
        filteredStats.forEach((s, i) => map.set(s.municipio, i + 1));
        return map;
    }, [filteredStats]);

    const calculateRadius = useCallback((value: number) => {
        if (activeLayer === 'DENSITY') return 12;
        if (value === 0) return 4;
        return Math.max(6, Math.min(40, Math.log(value) * 3.5));
    }, [activeLayer]);

    const getColor = useCallback((stat: GeoProcessStats) => {
        if (activeLayer === 'DENSITY') {
            if (stat.processCount > 50) return '#7c3aed';
            if (stat.processCount > 20) return '#ef4444';
            if (stat.processCount > 5) return '#f97316';
            return '#3b82f6';
        }
        if (stat.totalValue > 100000) return '#b91c1c';
        if (stat.totalValue > 50000) return '#ef4444';
        if (stat.totalValue > 20000) return '#f59e0b';
        return '#10b981';
    }, [activeLayer]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[600px] bg-slate-50 rounded-xl">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Carregando inteligência geográfica...</p>
                <p className="text-xs text-gray-400 mt-2">Processando dados de {filterYear}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-500 gap-4">
            {/* Header / Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><MapIcon size={24} /></div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 leading-none">Mapa de Despesas</h2>
                        <p className="text-xs text-gray-500 mt-1">Distribuição de suprimentos por comarca</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setActiveLayer('VOLUME')} className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${activeLayer === 'VOLUME' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>
                            <DollarSign size={14}/> R$
                        </button>
                        <button onClick={() => setActiveLayer('DENSITY')} className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${activeLayer === 'DENSITY' ? 'bg-white shadow text-purple-600' : 'text-gray-500'}`}>
                            <Layers size={14}/> Qtd
                        </button>
                    </div>
                    <div className="h-8 w-px bg-gray-200 mx-1"></div>
                    <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
                        {[2024, 2025, 2026].map(year => (
                            <button key={year} onClick={() => setFilterYear(year)} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${filterYear === year ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
                                {year}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
                {/* SIDEBAR */}
                <div className="w-full lg:w-80 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden shrink-0">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total {filterYear}</span>
                            <span className="text-sm font-black text-indigo-600 font-mono">{CURRENCY_COMPACT.format(totalGeral)}</span>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Buscar comarca..."
                                className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {filteredStats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <MapIcon size={28} className="mb-2 opacity-30" />
                                <p className="text-xs font-medium">Sem dados para {filterYear}</p>
                            </div>
                        ) : filteredStats.map((stat, idx) => (
                            <SidebarItem
                                key={stat.municipio}
                                stat={stat}
                                idx={idx}
                                isSelected={selectedCity === stat.municipio}
                                onClick={() => handleCityClick(stat)}
                            />
                        ))}
                    </div>
                </div>

                {/* MAP */}
                <div className="flex-1 bg-slate-100 rounded-xl shadow-lg border border-gray-200 overflow-hidden relative z-0">
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
                        {geoStats.map((stat) => (
                            <MapMarker
                                key={stat.municipio}
                                stat={stat}
                                isSelected={selectedCity === stat.municipio}
                                radius={calculateRadius(stat.totalValue)}
                                color={getColor(stat)}
                                onClick={() => handleCityClick(stat)}
                                rank={rankMap.get(stat.municipio) || 0}
                            />
                        ))}
                    </MapContainer>

                    {/* Legend */}
                    <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg border border-gray-200 z-[1000] text-xs">
                        <div className="flex items-center gap-2 mb-2">
                            <BarChart3 size={14} className="text-gray-400"/>
                            <span className="font-bold text-gray-600 uppercase text-[10px]">Legenda</span>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${activeLayer === 'VOLUME' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
                                <span className="text-[10px] text-gray-600">{activeLayer === 'VOLUME' ? 'Baixo Custo' : 'Baixo Vol.'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                                <span className="text-[10px] text-gray-600">Médio</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${activeLayer === 'VOLUME' ? 'bg-red-500' : 'bg-purple-600'}`}></span>
                                <span className="text-[10px] text-gray-600">Alto</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
