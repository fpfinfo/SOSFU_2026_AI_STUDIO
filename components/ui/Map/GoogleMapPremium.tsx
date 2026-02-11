import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';

interface MapMarker {
    id: string | number;
    lat: number;
    lng: number;
    title?: string;
    label?: string;
    color?: string;
    radius?: number; // Para Circle Markers (em km)
    popupContent?: React.ReactNode;
    tooltip?: string;
    data?: any;
}

interface MapIsochrone {
    points: { lat: number, lng: number }[];
    color: string;
    label?: string;
}

interface GoogleMapPremiumProps {
    origin?: [number, number]; // [lng, lat]
    destination?: [number, number]; // [lng, lat]
    markers?: MapMarker[];
    isochrones?: MapIsochrone[];
    onRouteCalculated?: (distance_km: number, duration_min: number) => void;
    onMarkerClick?: (marker: MapMarker) => void;
    center?: [number, number]; // [lng, lat]
    zoom?: number;
    className?: string;
    mapType?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
}

declare global {
    interface Window {
        google: any;
        initGoogleMap: () => void;
    }
}

export const GoogleMapPremium: React.FC<GoogleMapPremiumProps> = ({ 
    origin, 
    destination, 
    markers = [],
    isochrones = [],
    onRouteCalculated, 
    onMarkerClick,
    center,
    zoom,
    className = "",
    mapType = 'roadmap'
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMapRef = useRef<any>(null);
    const polylineRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const dataMarkersRef = useRef<any[]>([]);
    const isochronesRef = useRef<any[]>([]);
    const infoWindowRef = useRef<any>(null);
    
    const [isLoaded, setIsLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Carregar o SDK do Google Maps
    useEffect(() => {
        if (window.google && window.google.maps) {
            setIsLoaded(true);
            return;
        }

        const loadScript = () => {
            const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
            
            if (!apiKey) {
                console.error("VITE_GOOGLE_MAPS_API_KEY não encontrada no frontend.");
                setError("Chave de API do Google não configurada (VITE_GOOGLE_MAPS_API_KEY).");
                return;
            }

            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places,drawing&callback=initGoogleMap`;
            script.async = true;
            script.defer = true;
            window.initGoogleMap = () => setIsLoaded(true);
            document.head.appendChild(script);
        };

        loadScript();
    }, []);

    // Inicializar o Mapa
    useEffect(() => {
        if (isLoaded && mapRef.current && !googleMapRef.current) {
            const initialPos = center ? { lat: center[1], lng: center[0] } : (origin ? { lat: origin[1], lng: origin[0] } : { lat: -1.4558, lng: -48.4902 });
            
            googleMapRef.current = new window.google.maps.Map(mapRef.current, {
                center: initialPos,
                zoom: zoom || 13,
                mapTypeId: mapType,
                mapTypeControl: true,
                streetViewControl: true,
                fullscreenControl: true,
                styles: [
                    {
                        featureType: "poi",
                        elementType: "labels",
                        stylers: [{ visibility: "off" }]
                    }
                ]
            });

            infoWindowRef.current = new window.google.maps.InfoWindow();
        }
    }, [isLoaded, mapType, center, zoom, origin]);

    // Sincronizar Center/Zoom externo
    useEffect(() => {
        if (googleMapRef.current && center) {
            googleMapRef.current.panTo({ lat: center[1], lng: center[0] });
            if (zoom) googleMapRef.current.setZoom(zoom);
        }
    }, [center, zoom]);

    const clearRouteAndMarkers = useCallback(() => {
        if (polylineRef.current) polylineRef.current.setMap(null);
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];
    }, []);

    const renderDataMarkers = useCallback(() => {
        if (!googleMapRef.current) return;

        // Limpar marcadores de dados anteriores
        dataMarkersRef.current.forEach(m => m.setMap(null));
        dataMarkersRef.current = [];

        markers.forEach(m => {
            const circle = new window.google.maps.Circle({
                strokeColor: '#FFFFFF',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: m.color || '#0d9488',
                fillOpacity: 0.7,
                map: googleMapRef.current,
                center: { lat: m.lat, lng: m.lng },
                radius: m.radius ? m.radius * 1000 : 5000, 
                clickable: true,
                zIndex: 10
            });

            circle.addListener('click', () => {
                if (onMarkerClick) onMarkerClick(m);
                
                if (m.tooltip || m.title) {
                    infoWindowRef.current.setContent(`
                        <div style="padding: 8px; font-family: sans-serif;">
                            <b style="color: #0d9488; font-size: 14px;">${m.title || ''}</b>
                            <p style="margin: 4px 0 0; font-size: 11px; color: #64748b; font-weight: bold;">${m.tooltip || ''}</p>
                        </div>
                    `);
                    infoWindowRef.current.setPosition({ lat: m.lat, lng: m.lng });
                    infoWindowRef.current.open(googleMapRef.current);
                }
            });

            dataMarkersRef.current.push(circle);
        });
    }, [markers, onMarkerClick]);

    const renderIsochrones = useCallback(() => {
        if (!googleMapRef.current) return;

        isochronesRef.current.forEach(p => p.setMap(null));
        isochronesRef.current = [];

        isochrones.forEach(iso => {
            const polygon = new window.google.maps.Polygon({
                paths: iso.points,
                strokeColor: iso.color,
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: iso.color,
                fillOpacity: 0.35,
                map: googleMapRef.current,
                zIndex: 1
            });
            isochronesRef.current.push(polygon);
        });
    }, [isochrones]);

    useEffect(() => {
        if (isLoaded) {
            renderDataMarkers();
            renderIsochrones();
        }
    }, [isLoaded, renderDataMarkers, renderIsochrones]);

    const calculateRoute = useCallback(async () => {
        if (!origin || !destination || !googleMapRef.current) return;
        
        setLoading(true);
        setError(null);
        try {
            const { data, error: fnError } = await supabase.functions.invoke('google-maps-proxy', {
                body: { action: 'route', from: origin, to: destination }
            });

            if (fnError) throw new Error("Erro de comunicação com o servidor de rotas.");
            if (data.error) throw new Error(data.message);

            const coordinates = data.features[0].geometry.coordinates as [number, number][];
            const summary = data.features[0].properties.summary;

            clearRouteAndMarkers();

            const path = coordinates.map(c => ({ lat: c[1], lng: c[0] }));

            polylineRef.current = new window.google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: '#0d9488',
                strokeOpacity: 0.8,
                strokeWeight: 6,
                map: googleMapRef.current,
                zIndex: 20
            });

            const originMarker = new window.google.maps.Marker({
                position: path[0],
                map: googleMapRef.current,
                label: 'A',
                title: 'Origem',
                zIndex: 30
            });

            const destMarker = new window.google.maps.Marker({
                position: path[path.length - 1],
                map: googleMapRef.current,
                label: 'B',
                title: 'Destino',
                zIndex: 30
            });

            markersRef.current = [originMarker, destMarker];

            const bounds = new window.google.maps.LatLngBounds();
            path.forEach(p => bounds.extend(p));
            googleMapRef.current.fitBounds(bounds, 50);

            if (onRouteCalculated) {
                onRouteCalculated(summary.distance / 1000, summary.duration / 60);
            }
        } catch (err: any) {
            console.error("Erro no roteamento Google Premium:", err);
            setError(err.message || "Falha ao calcular rota oficial.");
        } finally {
            setLoading(false);
        }
    }, [origin, destination, clearRouteAndMarkers, onRouteCalculated]);

    useEffect(() => {
        if (isLoaded && origin && destination) {
            calculateRoute();
        }
    }, [isLoaded, origin, destination, calculateRoute]);

    return (
        <div className={`relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 min-h-[400px] shadow-inner ${className}`}>
            {!isLoaded && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
                    <Loader2 className="w-10 h-10 text-teal-600 animate-spin mb-2" />
                    <p className="text-sm font-medium text-slate-500 italic">Estabelecendo Conexão Premium (Google SDK)...</p>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50/90 backdrop-blur-sm z-20 p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
                    <h3 className="text-lg font-bold text-red-800 mb-1">Falha no Motor de Mapas</h3>
                    <p className="text-sm text-red-600 max-w-xs leading-relaxed">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-lg"
                    >
                        Tentar Novamente
                    </button>
                </div>
            )}

            <div ref={mapRef} className="w-full h-full absolute inset-0" />

            {loading && (
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur shadow-xl border border-teal-100 rounded-full px-4 py-2 flex items-center gap-2 z-10 animate-pulse">
                    <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                    <span className="text-[10px] font-black text-teal-900 uppercase tracking-widest">Sincronizando Rota Official</span>
                </div>
            )}
        </div>
    );
};
