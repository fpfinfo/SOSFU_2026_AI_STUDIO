import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
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
    origin?: [number, number]; // [lat, lng] - Standard project format
    destination?: [number, number]; // [lat, lng] - Standard project format
    markers?: MapMarker[];
    isochrones?: MapIsochrone[];
    onRouteCalculated?: (distance_km: number, duration_min: number) => void;
    onMarkerClick?: (marker: MapMarker) => void;
    center?: [number, number]; // [lat, lng]
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

export interface GoogleMapPremiumHandle {
    getMap: () => any;
    getStreetView: () => any;
}

export const GoogleMapPremium = forwardRef<GoogleMapPremiumHandle, GoogleMapPremiumProps>(({ 
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
}, ref) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMapRef = useRef<any>(null);
    const polylineRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const dataMarkersRef = useRef<any[]>([]);
    const isochronesRef = useRef<any[]>([]);
    const infoWindowRef = useRef<any>(null);
    const directionsServiceRef = useRef<any>(null);
    const directionsRendererRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
        getMap: () => googleMapRef.current,
        getStreetView: () => googleMapRef.current?.getStreetView()
    }));
    
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
                console.error("DEBUG: VITE_GOOGLE_MAPS_API_KEY não encontrada no process.env ou import.meta.env.");
                console.info("DICA: Se a chave estiver no seu arquivo .env, tente reiniciar o servidor de desenvolvimento (npm run dev).");
                setError("Chave de API do Google não configurada.");
                return;
            }

            // Evitar duplicidade de carregamento
            const scriptId = 'google-maps-sdk-script';
            if (document.getElementById(scriptId)) {
                // Se o script já existe mas o window.google não está pronto, 
                // o callback initGoogleMap cuidará disso ou podemos checar periodicamente
                if (window.google && window.google.maps) {
                    setIsLoaded(true);
                }
                return;
            }

            // Configurar callback global ANTES de carregar o script
            window.initGoogleMap = () => {
                console.info("Google Maps SDK carregado com sucesso.");
                setIsLoaded(true);
            };

            const script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places,drawing&callback=initGoogleMap&loading=async`;
            script.async = true;
            script.defer = true;
            
            script.onerror = () => {
                setError("Erro ao carregar o script do Google Maps. Verifique sua conexão e a validade da chave.");
            };

            document.head.appendChild(script);
        };

        loadScript();
    }, []);

    const clearRouteAndMarkers = useCallback(() => {
        if (polylineRef.current) polylineRef.current.setMap(null);
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];
    }, []);

    const renderDataMarkers = useCallback(() => {
        if (!googleMapRef.current || !(googleMapRef.current instanceof window.google.maps.Map)) return;

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
        if (!googleMapRef.current || !(googleMapRef.current instanceof window.google.maps.Map)) return;

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

    // Inicializar o Mapa
    useEffect(() => {
        if (isLoaded && mapRef.current && !googleMapRef.current) {
            // Verificação defensiva extra para o objeto google
            if (!window.google || !window.google.maps || !window.google.maps.Map) {
                console.warn("Google Maps SDK carregado mas objeto 'Map' indisponível. Tentando em breve...");
                const timer = setTimeout(() => setIsLoaded(false), 500); // Forçar re-check
                setTimeout(() => setIsLoaded(true), 600);
                return () => clearTimeout(timer);
            }

            const initialPos = center ? { lat: center[0], lng: center[1] } : (origin ? { lat: origin[0], lng: origin[1] } : { lat: -1.4550, lng: -48.5024 });
            
            const map = new window.google.maps.Map(mapRef.current, {
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

            googleMapRef.current = map;

            infoWindowRef.current = new window.google.maps.InfoWindow();
            directionsServiceRef.current = new window.google.maps.DirectionsService();
            directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: true,
                polylineOptions: {
                    strokeColor: '#0d9488',
                    strokeWeight: 6,
                    strokeOpacity: 0.8
                }
            });

            // Forçar renderização inicial de dados após pequena pausa para garantir que o Map está "ready" internamente
            setTimeout(() => {
                if (googleMapRef.current) {
                    renderDataMarkers();
                    renderIsochrones();
                }
            }, 100);
        }

        return () => {
            // Limpeza opcional se necessário, mas googleMapRef.current persistirá entre re-renders
        };
    }, [isLoaded, mapType, center, zoom, origin, renderDataMarkers, renderIsochrones]);

    // Sincronizar Center/Zoom externo
    useEffect(() => {
        if (googleMapRef.current && center && (googleMapRef.current instanceof window.google.maps.Map)) {
            googleMapRef.current.panTo({ lat: center[0], lng: center[1] });
            if (zoom) googleMapRef.current.setZoom(zoom);
        }
    }, [center, zoom]);


    useEffect(() => {
        if (isLoaded && googleMapRef.current) {
            renderDataMarkers();
            renderIsochrones();
        }
    }, [isLoaded, markers, isochrones, renderDataMarkers, renderIsochrones]);

    const calculateRoute = useCallback(async () => {
        if (!origin || !destination || !googleMapRef.current || !(googleMapRef.current instanceof window.google.maps.Map) || !directionsServiceRef.current || !window.google?.maps?.DirectionsService) return;
        
        setLoading(true);
        setError(null);
        try {
            const request = {
                origin: { lat: origin[0], lng: origin[1] },
                destination: { lat: destination[0], lng: destination[1] },
                travelMode: window.google.maps.TravelMode.DRIVING
            };

            directionsServiceRef.current.route(request, (result: any, status: string) => {
                if (status === window.google.maps.DirectionsStatus.OK && result && result.routes && result.routes.length > 0) {
                    directionsRendererRef.current.setDirections(result);
                    
                    const route = result.routes[0].legs[0];
                    if (!route) {
                        setError("Dados de rota corrompidos.");
                        setLoading(false);
                        return;
                    }
                    
                    clearRouteAndMarkers();

                    const originMarker = new window.google.maps.Marker({
                        position: route.start_location,
                        map: googleMapRef.current,
                        label: 'A',
                        title: 'Origem: TJPA Sede',
                        zIndex: 30
                    });

                    const destMarker = new window.google.maps.Marker({
                        position: route.end_location,
                        map: googleMapRef.current,
                        label: 'B',
                        title: 'Destino',
                        zIndex: 30
                    });

                    markersRef.current = [originMarker, destMarker];

                    if (onRouteCalculated) {
                        onRouteCalculated(route.distance.value / 1000, route.duration.value / 60);
                    }
                } else {
                    console.error("Directions Status:", status, result);
                    if (status === 'ZERO_RESULTS') {
                        setError("Nenhuma rota encontrada (verifique se as coordenadas estão corretas).");
                    } else {
                        setError(`Falha no cálculo: ${status}`);
                    }
                }
                setLoading(false);
            });
        } catch (err: any) {
            console.error("Erro no roteamento Google Nativo:", err);
            setError("Falha ao processar requisição de rota.");
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
});
