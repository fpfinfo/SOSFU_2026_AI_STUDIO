
import React, { useState, useEffect, useRef } from 'react';
import { startVeoGeneration, getVeoStatus, editImageWithAi } from '../services/geminiService';
import { getManagementSettings } from '../services/dataService';

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=1600",
  "https://memoriadigital.tjpa.jus.br/uploads/r/tribunal-de-justica-do-estado-do-para-2/8/9/2/892eade420e1d4cb4c86288a6fefc43fe375176fd11d6555c9bd52cc9f7771d8/TJPA-_Pr__dio_Sede_-_Lauro_Sodr___141.jpg",
  "https://www.tjpa.jus.br/portal/images/noticias/2023/setembro/sede-tjpa-noticia.jpg"
];

const VeoBanner: React.FC = () => {
  const [images, setImages] = useState<string[]>(DEFAULT_IMAGES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // AI Hub states
  const [showAiHub, setShowAiHub] = useState(false);
  const [aiMode, setAiMode] = useState<'video' | 'edit'>('video');
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');

  useEffect(() => {
    loadSettings();
    const interval = setInterval(() => {
      if (!isGenerating && !showAiHub && !videoUrl) {
        setCurrentIndex(prev => (prev + 1) % images.length);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [images.length, isGenerating, showAiHub, videoUrl]);

  const loadSettings = async () => {
    try {
      const settings = await getManagementSettings('geral');
      if (settings.banner_images && settings.banner_images.length > 0) {
        setImages(settings.banner_images);
      }
    } catch (e) {
      console.warn("Could not load banner settings, using defaults.");
    }
  };

  const handleAiAction = async () => {
    try {
      // @ts-ignore
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
      }

      setIsGenerating(true);
      setError(null);
      setProgress(10);
      setStatusMessage(aiMode === 'video' ? "Iniciando motor Veo 3.1..." : "Processando Gemini 2.5 Image...");

      if (aiMode === 'video') {
        // Geração de vídeo
        let imageB64 = null;
        try {
          const res = await fetch(images[currentIndex]);
          const blob = await res.blob();
          imageB64 = await new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onloadend = () => resolve((r.result as string).split(',')[1]);
            r.readAsDataURL(blob);
          });
        } catch (e) { console.warn("Failed to capture image for video reference"); }

        let operation = await startVeoGeneration(imageB64, prompt || "A cinematic architectural view of the building", aspectRatio);
        while (!operation.done) {
          await new Promise(resolve => setTimeout(resolve, 8000));
          operation = await getVeoStatus(operation);
          setProgress(prev => Math.min(prev + 10, 95));
          setStatusMessage("Renderizando frames cinematográficos...");
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
          const vRes = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
          const vBlob = await vRes.blob();
          setVideoUrl(URL.createObjectURL(vBlob));
        }
      } else {
        // Edição de imagem
        const res = await fetch(images[currentIndex]);
        const blob = await res.blob();
        const imageB64 = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onloadend = () => resolve((r.result as string).split(',')[1]);
          r.readAsDataURL(blob);
        });

        const editedB64 = await editImageWithAi(imageB64, prompt);
        if (editedB64) {
          const newImages = [...images];
          newImages[currentIndex] = `data:image/jpeg;base64,${editedB64}`;
          setImages(newImages);
          setShowAiHub(false);
        }
      }
      setProgress(100);
    } catch (err: any) {
      setError(err.message || "Falha na inteligência artificial.");
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setShowAiHub(false);
      }, 1000);
    }
  };

  return (
    <>
      <div className="relative rounded-[3.5rem] overflow-hidden shadow-2xl h-[450px] group border border-slate-100 bg-slate-900 animate-in zoom-in-95 duration-1000">
        
        {/* Slider de Imagens / Vídeo */}
        <div className="absolute inset-0 transition-all duration-1000 ease-in-out">
          {videoUrl ? (
            <video 
              src={videoUrl} autoPlay loop muted playsInline
              className="w-full h-full object-cover animate-in fade-in duration-1000"
            />
          ) : (
            <img 
              src={images[currentIndex]} alt="Banner" 
              className={`w-full h-full object-cover transition-all duration-[3000ms] ${isGenerating ? 'opacity-30 blur-sm scale-110' : 'opacity-100 group-hover:scale-110'}`}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
        </div>

        {/* Controles de Navegação (Slider) */}
        {!videoUrl && !isGenerating && images.length > 1 && (
          <div className="absolute bottom-10 left-12 flex gap-3 z-30">
            {images.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setCurrentIndex(i)}
                className={`h-1.5 transition-all duration-500 rounded-full ${currentIndex === i ? 'w-10 bg-emerald-400' : 'w-4 bg-white/30 hover:bg-white/50'}`}
              />
            ))}
          </div>
        )}

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-12 pointer-events-none">
          <div className="flex justify-between items-start">
             <div className="flex items-center gap-3 bg-black/30 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/10 shadow-2xl animate-in slide-in-from-top-4 duration-700">
                <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-orange-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`}></div>
                <span className="text-[9px] font-black text-white/90 uppercase tracking-[0.2em]">
                  {isGenerating ? 'IA AGIL Processing' : 'TJPA Digital Hub'}
                </span>
             </div>
             
             <div className="flex gap-3 pointer-events-auto">
                {videoUrl && (
                  <button onClick={() => { setVideoUrl(null); }} className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/10 flex items-center gap-2">
                    <i className="fa-solid fa-rotate"></i> Reset
                  </button>
                )}
                {!isGenerating && (
                   <button 
                    onClick={() => setShowAiHub(true)}
                    className="bg-emerald-600/80 hover:bg-emerald-600 backdrop-blur-md text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-2"
                   >
                      <i className="fa-solid fa-wand-magic-sparkles"></i> AI HUB
                   </button>
                )}
             </div>
          </div>

          <div className="space-y-4 max-w-2xl pointer-events-auto">
            <h2 className="text-white font-black text-5xl md:text-6xl leading-[0.9] tracking-tighter italic drop-shadow-2xl">
              Portal ÁGIL <br />
              <span className="text-emerald-400 not-italic">Sefin • TJPA</span>
            </h2>
            <p className="text-white/70 text-lg font-medium tracking-tight">Transparência e inovação na palma da sua mão.</p>
          </div>
        </div>

        {/* AI HUB MODAL/OVERLAY */}
        {showAiHub && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl z-40 p-12 flex flex-col justify-center items-center animate-in zoom-in-95 duration-500 pointer-events-auto">
             <button onClick={() => setShowAiHub(false)} className="absolute top-10 right-10 text-white/50 hover:text-white text-2xl transition-all">
                <i className="fa-solid fa-xmark"></i>
             </button>
             
             <div className="w-full max-w-xl space-y-8">
                <div className="flex bg-white/10 rounded-2xl p-1.5 gap-1 border border-white/5">
                   <button 
                    onClick={() => setAiMode('video')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${aiMode === 'video' ? 'bg-white text-slate-900 shadow-xl' : 'text-white/50 hover:text-white'}`}
                   >
                     Video Creator (Veo 3.1)
                   </button>
                   <button 
                    onClick={() => setAiMode('edit')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${aiMode === 'edit' ? 'bg-white text-slate-900 shadow-xl' : 'text-white/50 hover:text-white'}`}
                   >
                     Image Editor (Flash 2.5)
                   </button>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1">Comando para a Inteligência Artificial</label>
                   <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={aiMode === 'video' ? "Ex: A cinematic drone shot of the building entrance at sunset..." : "Ex: Add a retro filter and improve the sky lighting..."}
                    className="w-full h-32 bg-white/5 border border-white/10 rounded-3xl p-6 text-white text-lg font-medium outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all resize-none"
                   />
                </div>

                {aiMode === 'video' && (
                  <div className="flex justify-center gap-4">
                     {['16:9', '9:16'].map(ratio => (
                       <button 
                        key={ratio}
                        onClick={() => setAspectRatio(ratio as any)}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black border transition-all ${aspectRatio === ratio ? 'bg-emerald-600 text-white border-emerald-400 shadow-xl' : 'bg-white/5 text-white/50 border-white/10'}`}
                       >
                         {ratio === '16:9' ? 'LANDSCAPE (16:9)' : 'PORTRAIT (9:16)'}
                       </button>
                     ))}
                  </div>
                )}

                <button 
                  onClick={handleAiAction}
                  className="w-full py-6 bg-emerald-600 text-white font-black uppercase tracking-[0.3em] rounded-3xl shadow-2xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-4"
                >
                   <i className="fa-solid fa-bolt-lightning"></i>
                   Iniciar Processamento
                </button>
             </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-3xl z-50 p-10 text-center animate-in fade-in duration-500">
             <div className="w-full max-w-md space-y-10">
                <div className="relative flex justify-center">
                  <div className="w-32 h-32 border-[10px] border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_50px_rgba(16,185,129,0.3)]"></div>
                  <i className="fa-solid fa-brain absolute inset-0 flex items-center justify-center text-emerald-400 text-4xl animate-pulse"></i>
                </div>
                <div className="space-y-4">
                   <p className="text-white font-black text-xs tracking-[0.4em] uppercase animate-pulse">{statusMessage}</p>
                   <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 transition-all duration-1000 shadow-[0_0_20px_rgba(16,185,129,0.5)]" style={{ width: `${progress}%` }}></div>
                   </div>
                   <span className="text-emerald-400/50 font-black text-[10px] uppercase tracking-widest">{Math.round(progress)}% Concluído</span>
                </div>
             </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-3xl z-[60] p-10 text-center animate-in zoom-in-95">
             <i className="fa-solid fa-triangle-exclamation text-white text-5xl mb-6"></i>
             <h4 className="text-white font-black text-xl mb-2">Erro na IA ÁGIL</h4>
             <p className="text-red-200/60 text-sm max-w-sm mb-8 font-medium">{error}</p>
             <button onClick={() => setError(null)} className="bg-white text-red-900 px-12 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl">Entendido</button>
          </div>
        )}
      </div>
    </>
  );
};

export default VeoBanner;
