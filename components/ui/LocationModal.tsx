import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
    X, MapPin, Building2, Phone, Mail, Navigation, 
    MoreVertical, Share2, Star, Clock, Globe, Printer, Copy
} from 'lucide-react';
import { GoogleMap, Marker, StreetViewPanorama, useLoadScript } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

interface LocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        title: string;
        type: 'COMARCA' | 'UNIDADE';
        coordinates: { lat: number; lng: number };
        details?: {
            address?: string;
            phone?: string;
            email?: string;
            manager?: string;
            schedule?: string;
            entrancia?: string;
            polo?: string;
            regiao?: string;
        };
    };
    darkMode?: boolean;
}

const mapContainerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '1rem'
};

const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    streetViewControl: false, // We'll use a custom toggle
    mapTypeControl: false,
    fullscreenControl: false,
};

export const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose, data, darkMode = false }) => {
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries,
    });
    
    const [viewMode, setViewMode] = useState<'MAP' | 'STREET'>('MAP');
    const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
    const [copied, setCopied] = useState(false);

    const center = useMemo(() => data.coordinates, [data.coordinates]);

    // Reset view when modal opens
    useEffect(() => {
        if (isOpen) setViewMode('MAP');
    }, [isOpen]);

    const handleCopyCoords = () => {
        navigator.clipboard.writeText(`${data.coordinates.lat}, ${data.coordinates.lng}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleOpenGoogleMaps = () => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${data.coordinates.lat},${data.coordinates.lng}`, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className={`
                    w-full max-w-4xl h-[85vh] md:h-[600px] rounded-3xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row
                    ${darkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}
                `}
                onClick={e => e.stopPropagation()}
            >
                {/* --- LEFT SIDE: INFO PANEL --- */}
                <div className={`
                    w-full md:w-[320px] shrink-0 flex flex-col h-full border-r relative z-10
                    ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}
                `}>
                    {/* Header Image / Gradient */}
                    <div className="h-32 bg-gradient-to-br from-blue-600 to-indigo-700 relative shrink-0">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] opacity-20 bg-cover bg-center mix-blend-overlay" />
                        
                        <button 
                            onClick={onClose}
                            className="absolute top-4 left-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all md:hidden"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 -mt-10 relative">
                        {/* Icon Badge */}
                        <div className={`
                            w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg mb-4 border-4
                            ${darkMode ? 'bg-slate-800 border-slate-900' : 'bg-white border-white'}
                        `}>
                            {data.type === 'COMARCA' ? (
                                <Building2 size={32} className="text-blue-600" />
                            ) : (
                                <MapPin size={32} className="text-emerald-600" />
                            )}
                        </div>

                        {/* Title & Type */}
                        <h2 className={`text-2xl font-black mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{data.title}</h2>
                        <div className="flex items-center gap-2 mb-6">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                data.type === 'COMARCA' 
                                    ? (darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700')
                                    : (darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                            }`}>
                                {data.type === 'COMARCA' ? 'Comarca' : 'Unidade Administrativa'}
                            </span>
                            {/* <div className="flex gap-1">
                                {[1,2,3,4,5].map(i => <Star key={i} size={12} className="text-amber-400 fill-amber-400" />)}
                            </div> */}
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3 mb-8">
                            <button 
                                onClick={handleOpenGoogleMaps}
                                className="flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5"
                            >
                                <Navigation size={16} />
                                Rotas
                            </button>
                            <button 
                                onClick={handleCopyCoords}
                                className={`
                                    flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm border transition-all hover:-translate-y-0.5
                                    ${darkMode 
                                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}
                                `}
                            >
                                {copied ? <Clock size={16} className="text-emerald-500" /> : <Share2 size={16} />}
                                {copied ? 'Copiado!' : 'Compartilhar'}
                            </button>
                        </div>

                        {/* Details List */}
                        <div className="space-y-5">
                            {data.details?.address && (
                                <div className="flex gap-3 group">
                                    <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                        <MapPin size={16} />
                                    </div>
                                    <div>
                                        <p className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Endereço</p>
                                        <p className={`text-sm font-medium leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{data.details.address}</p>
                                    </div>
                                </div>
                            )}

                            {(data.details?.phone || data.details?.email) && (
                                <div className="flex gap-3 group">
                                    <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                        <Phone size={16} />
                                    </div>
                                    <div>
                                        <p className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Contato</p>
                                        {data.details.phone && <p className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{data.details.phone}</p>}
                                        {data.details.email && <p className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{data.details.email}</p>}
                                    </div>
                                </div>
                            )}

                            {(data.details?.entrancia || data.details?.regiao) && (
                                <div className="flex gap-3 group">
                                    <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                        <Globe size={16} />
                                    </div>
                                    <div>
                                        <p className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Jurisdição</p>
                                        {data.details.entrancia && <p className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{data.details.entrancia}</p>}
                                        {data.details.regiao && <p className={`text-sm font-medium text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{data.details.regiao}</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- RIGHT SIDE: MAP --- */}
                <div className="flex-1 bg-slate-100 relative h-full">
                    {/* Map Controls Overlay */}
                    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                        <button 
                            onClick={onClose}
                            className="p-2.5 bg-white text-slate-700 rounded-full shadow-lg hover:bg-slate-50 transition-all hidden md:flex"
                            title="Fechar"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-white/50 flex gap-1">
                        <button 
                            onClick={() => setViewMode('MAP')}
                            className={`
                                px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2
                                ${viewMode === 'MAP' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}
                            `}
                        >
                            <MapPin size={14} />
                            Mapa
                        </button>
                        <button 
                            onClick={() => setViewMode('STREET')}
                            className={`
                                px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2
                                ${viewMode === 'STREET' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}
                            `}
                        >
                            <Navigation size={14} />
                            Street View
                        </button>
                    </div>

                    {!isLoaded ? (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100">
                           <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="w-full h-full">
                             {viewMode === 'MAP' ? (
                                <GoogleMap
                                    mapContainerStyle={mapContainerStyle}
                                    zoom={15}
                                    center={center}
                                    options={mapOptions}
                                    onLoad={setMapRef}
                                >
                                    <Marker 
                                        position={center} 
                                        animation={google.maps.Animation.DROP}
                                    />
                                </GoogleMap>
                             ) : (
                                <GoogleMap
                                    mapContainerStyle={mapContainerStyle}
                                    zoom={15}
                                    center={center}
                                    options={mapOptions}
                                >
                                    <StreetViewPanorama
                                        position={center}
                                        visible={true}
                                        options={{
                                            disableDefaultUI: true,
                                            enableCloseButton: false,
                                            zoomControl: true,
                                        }}
                                    />
                                </GoogleMap>
                             )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
