import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera, Image as ImageIcon, X, RotateCcw, Check, Crop, ZoomIn,
  ScanLine, CloudLightning, Loader2, Smartphone, Upload
} from 'lucide-react';

interface SmartReceiptCaptureProps {
  isAnalyzing: boolean;
  onCapture: (file: File) => void;
  disabled?: boolean;
}

export const SmartReceiptCapture: React.FC<SmartReceiptCaptureProps> = ({
  isAnalyzing,
  onCapture,
  disabled = false,
}) => {
  const [mode, setMode] = useState<'idle' | 'camera' | 'preview' | 'cropping'>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Crop state
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  // --- CAMERA ---
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMode('camera');
    } catch (err) {
      console.error('Câmera indisponível:', err);
      // Fallback: open file picker
      fileInputRef.current?.click();
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/webp', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    setMode('preview');

    // Haptic feedback on mobile
    if (navigator.vibrate) navigator.vibrate(50);
  }, [stopCamera]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // If it's a direct file (no camera needed), handle both paths
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
      setMode('preview');
    };
    reader.readAsDataURL(file);
  }, []);

  // --- CROP ---
  const startCropping = useCallback(() => {
    if (!capturedImage) return;
    setMode('cropping');

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Default crop: 80% centered
      const margin = 0.1;
      setCropRect({
        x: img.width * margin,
        y: img.height * margin,
        w: img.width * (1 - 2 * margin),
        h: img.height * (1 - 2 * margin),
      });
    };
    img.src = capturedImage;
  }, [capturedImage]);

  const drawCropOverlay = useCallback(() => {
    if (!cropCanvasRef.current || !imgRef.current) return;
    const canvas = cropCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imgRef.current;
    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;
    canvas.width = displayW;
    canvas.height = displayH;

    const scale = Math.min(displayW / img.width, displayH / img.height);
    const offX = (displayW - img.width * scale) / 2;
    const offY = (displayH - img.height * scale) / 2;

    // Draw image
    ctx.drawImage(img, offX, offY, img.width * scale, img.height * scale);

    // Dim outside crop
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, displayW, displayH);

    // Clear crop area
    const cx = offX + cropRect.x * scale;
    const cy = offY + cropRect.y * scale;
    const cw = cropRect.w * scale;
    const ch = cropRect.h * scale;
    ctx.clearRect(cx, cy, cw, ch);
    ctx.drawImage(img, cropRect.x, cropRect.y, cropRect.w, cropRect.h, cx, cy, cw, ch);

    // Crop border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(cx, cy, cw, ch);

    // Corner handles
    ctx.fillStyle = '#3b82f6';
    const hs = 8;
    [[cx, cy], [cx + cw, cy], [cx, cy + ch], [cx + cw, cy + ch]].forEach(([hx, hy]) => {
      ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
    });
  }, [cropRect]);

  useEffect(() => {
    if (mode === 'cropping') drawCropOverlay();
  }, [mode, cropRect, drawCropOverlay]);

  const handleCropPointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    },
    []
  );

  const handleCropPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !cropCanvasRef.current || !imgRef.current) return;
      const canvas = cropCanvasRef.current;
      const img = imgRef.current;
      const scale = Math.min(canvas.clientWidth / img.width, canvas.clientHeight / img.height);

      const dx = (e.clientX - dragStart.x) / scale;
      const dy = (e.clientY - dragStart.y) / scale;

      setCropRect((prev) => ({
        ...prev,
        x: Math.max(0, Math.min(img.width - prev.w, prev.x + dx)),
        y: Math.max(0, Math.min(img.height - prev.h, prev.y + dy)),
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [isDragging, dragStart]
  );

  const handleCropPointerUp = useCallback(() => setIsDragging(false), []);

  const applyCrop = useCallback(() => {
    if (!imgRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = cropRect.w;
    canvas.height = cropRect.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(imgRef.current, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);
    const croppedUrl = canvas.toDataURL('image/webp', 0.85);
    setCapturedImage(croppedUrl);
    setMode('preview');
  }, [cropRect]);

  // --- CONFIRM & SEND ---
  const confirmAndSend = useCallback(() => {
    if (!capturedImage) return;
    // Convert data URL to File
    fetch(capturedImage)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], `recibo_${Date.now()}.webp`, { type: 'image/webp' });
        onCapture(file);
        reset();
      });
  }, [capturedImage, onCapture]);

  const reset = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setMode('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [stopCamera]);

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  // --- RENDER ---

  // Full-screen camera overlay
  if (mode === 'camera') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <video ref={videoRef} className="flex-1 object-cover" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera Controls */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-6 pb-8 flex items-center justify-center gap-8">
          <button onClick={reset} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white active:scale-90 transition-transform">
            <X size={24} />
          </button>
          <button
            onClick={capturePhoto}
            className="w-20 h-20 rounded-full bg-white border-4 border-blue-400 flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-blue-500/30"
          >
            <div className="w-16 h-16 rounded-full bg-white" />
          </button>
          <button onClick={() => { stopCamera(); fileInputRef.current?.click(); }} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white active:scale-90 transition-transform">
            <ImageIcon size={24} />
          </button>
        </div>

        {/* Guide frame */}
        <div className="absolute inset-12 border-2 border-white/30 rounded-2xl pointer-events-none">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur">
            Posicione o comprovante dentro do quadro
          </div>
        </div>

        <input 
          id="camera-capture-input"
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*,.pdf" 
          capture="environment" 
          onChange={handleFileSelect} 
          aria-label="Capturar imagem do comprovante"
        />
      </div>
    );
  }

  // Crop overlay
  if (mode === 'cropping') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex items-center justify-between p-4 bg-black/80 text-white">
          <button onClick={() => setMode('preview')} className="flex items-center gap-2 text-sm">
            <X size={18} /> Cancelar
          </button>
          <span className="text-sm font-bold flex items-center gap-2">
            <Crop size={16} /> Recortar Imagem
          </span>
          <button onClick={applyCrop} className="flex items-center gap-2 text-sm font-bold text-blue-400">
            <Check size={18} /> Aplicar
          </button>
        </div>
        <canvas
          ref={cropCanvasRef}
          className="flex-1 touch-none cursor-move"
          onPointerDown={handleCropPointerDown}
          onPointerMove={handleCropPointerMove}
          onPointerUp={handleCropPointerUp}
          onPointerLeave={handleCropPointerUp}
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // Preview with actions
  if (mode === 'preview' && capturedImage) {
    return (
      <div className="relative bg-white rounded-2xl border-2 border-blue-200 overflow-hidden shadow-sm">
        <div className="relative aspect-[4/3] max-h-64 overflow-hidden bg-slate-100">
          <img src={capturedImage} alt="Comprovante" className="w-full h-full object-contain" />

          {/* AI analyzing overlay */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-blue-900/60 backdrop-blur-sm flex flex-col items-center justify-center">
              <CloudLightning className="text-white mb-2 animate-pulse" size={32} />
              <p className="text-white font-bold text-sm">Analisando com IA...</p>
              <p className="text-blue-200 text-xs mt-1">Lendo dados do comprovante</p>
              <Loader2 className="text-blue-300 animate-spin mt-3" size={20} />
            </div>
          )}
        </div>

        {/* Action Bar */}
        {!isAnalyzing && (
          <div className="flex items-center justify-between p-3 bg-gray-50 border-t">
            <div className="flex gap-2">
              <button onClick={reset} className="px-3 py-2 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 active:scale-95 transition-transform">
                <RotateCcw size={14} /> Refazer
              </button>
              <button onClick={startCropping} className="px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1.5 active:scale-95 transition-transform">
                <Crop size={14} /> Recortar
              </button>
            </div>
            <button onClick={confirmAndSend} className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-teal-600 rounded-lg shadow-md hover:shadow-lg flex items-center gap-1.5 active:scale-95 transition-all">
              <ScanLine size={14} /> Ler com IA
            </button>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // IDLE: Main capture buttons
  return (
    <div className={`space-y-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Primary: Camera or Native Capture */}
      <button
        onClick={isMobile ? () => fileInputRef.current?.click() : startCamera}
        className="w-full relative border-2 border-dashed border-blue-300 rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 group overflow-hidden bg-gradient-to-br from-blue-50/80 to-teal-50/80 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-100 active:scale-[0.98]"
      >
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
            {isMobile ? <Smartphone size={24} className="text-white" /> : <Camera size={24} className="text-white" />}
          </div>
          <h3 className="text-base font-bold text-slate-700">
            {isMobile ? 'Fotografar Comprovante' : 'Capturar com Câmera'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isMobile ? 'Toque para abrir a câmera' : 'Use a webcam para digitalizar o documento'}
          </p>
        </div>

        {/* Decorative corner icons */}
        <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-blue-300/50 rounded-tl-lg" />
        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-blue-300/50 rounded-tr-lg" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-blue-300/50 rounded-bl-lg" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-blue-300/50 rounded-br-lg" />
      </button>

      {/* Secondary: File upload */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all"
      >
        <Upload size={14} />
        Escolher da Galeria / Arquivo
      </button>

      <input
        id="file-gallery-input"
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,.pdf"
        capture={isMobile ? 'environment' : undefined}
        onChange={handleFileSelect}
        aria-label="Selecionar comprovante da galeria ou arquivo"
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
