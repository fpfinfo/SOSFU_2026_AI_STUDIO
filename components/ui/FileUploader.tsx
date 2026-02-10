import React, { useState, useCallback, useRef } from 'react';
import {
  Upload, CheckCircle2, Loader2, Trash2, Eye, FileText,
  File as FileIcon, AlertTriangle, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ==================== TYPES ====================

export interface UploadResult {
  storageUrl: string | null;
  storagePath: string | null;
  base64: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface FileUploaderProps {
  /** Bucket name in Supabase Storage */
  bucket?: string;
  /** Path prefix for organizing uploads (e.g., "execution/{processId}") */
  pathPrefix?: string;
  /** Unique ID for the file input element */
  inputId: string;
  /** Theme color (amber, blue, emerald, indigo, purple) */
  color?: string;
  /** Accepted file types (default: PDF only) */
  accept?: string;
  /** Max file size in bytes (default: 10MB) */
  maxSize?: number;
  /** Label for the upload button */
  buttonLabel?: string;
  /** Descriptive text above button */
  description?: string;
  /** Size limit description */
  sizeHint?: string;
  /** Callback when upload completes */
  onUpload?: (result: UploadResult) => void;
  /** Callback when file is removed */
  onRemove?: () => void;
  /** External loading state */
  disabled?: boolean;
  /** Pre-existing upload result (for controlled mode) */
  value?: UploadResult | null;
  /** Compact mode for inline use */
  compact?: boolean;
}

// ==================== HELPERS ====================

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ==================== COMPONENT ====================

export const FileUploader: React.FC<FileUploaderProps> = ({
  bucket = 'documentos',
  pathPrefix = 'uploads',
  inputId,
  color = 'blue',
  accept = 'application/pdf',
  maxSize = 10 * 1024 * 1024,
  buttonLabel = 'Selecionar Arquivo',
  description = 'Arraste o arquivo aqui ou clique para selecionar',
  sizeHint,
  onUpload,
  onRemove,
  disabled = false,
  value = null,
  compact = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(value);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value
  React.useEffect(() => {
    if (value !== undefined) setUploadResult(value);
  }, [value]);

  const processFile = useCallback(async (file: File) => {
    setError(null);

    // Validate type
    if (accept && !accept.split(',').some(t => file.type.match(t.trim()))) {
      setError(`Tipo de arquivo não permitido. Aceitos: ${accept}`);
      return;
    }

    // Validate size
    if (file.size > maxSize) {
      setError(`Arquivo excede ${formatFileSize(maxSize)}. Tamanho: ${formatFileSize(file.size)}`);
      return;
    }

    setUploading(true);

    try {
      // Step 1: Generate base64 (fallback, always works)
      const base64 = await fileToBase64(file);

      // Step 2: Upload to Supabase Storage (primary)
      let storageUrl: string | null = null;
      let storagePath: string | null = null;

      try {
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${pathPrefix}/${Date.now()}_${sanitizedName}`;
        
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
          storageUrl = urlData?.publicUrl || null;
          storagePath = path;
        } else {
          console.warn('Storage upload falhou (fallback para base64):', uploadError.message);
        }
      } catch (storageErr) {
        console.warn('Storage indisponível, usando base64:', storageErr);
      }

      const result: UploadResult = {
        storageUrl,
        storagePath,
        base64,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      };

      setUploadResult(result);
      onUpload?.(result);

    } catch (err) {
      console.error('Erro ao processar arquivo:', err);
      setError('Erro ao processar o arquivo. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }, [bucket, pathPrefix, accept, maxSize, onUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleRemove = useCallback(async () => {
    // Optionally delete from storage
    if (uploadResult?.storagePath) {
      try {
        await supabase.storage.from(bucket).remove([uploadResult.storagePath]);
      } catch { /* Non-critical */ }
    }
    setUploadResult(null);
    setPreviewUrl(null);
    setError(null);
    onRemove?.();
  }, [uploadResult, bucket, onRemove]);

  const handlePreview = useCallback(() => {
    if (!uploadResult) return;
    // Prefer storage URL for preview, fallback to base64
    setPreviewUrl(uploadResult.storageUrl || uploadResult.base64);
  }, [uploadResult]);

  const maxSizeLabel = sizeHint || `Máximo ${formatFileSize(maxSize)}`;
  const acceptLabel = accept === 'application/pdf' ? 'Apenas PDF' : accept;

  // ==================== RENDER: UPLOADED STATE ====================
  if (uploadResult) {
    return (
      <>
        <div className={`border-2 border-dashed rounded-2xl ${compact ? 'p-4' : 'p-8'} text-center transition-all border-emerald-300 bg-emerald-50/50`}>
          <div className={compact ? 'flex items-center gap-4' : 'space-y-4'}>
            {!compact && (
              <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
            )}
            {compact && (
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} className="text-emerald-600" />
              </div>
            )}
            <div className={compact ? 'flex-1 text-left min-w-0' : ''}>
              <p className={`font-bold text-emerald-800 ${compact ? 'text-xs truncate' : 'text-sm'}`}>
                {uploadResult.fileName}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {formatFileSize(uploadResult.fileSize)}
                {uploadResult.storageUrl ? ' • Armazenado no servidor' : ' • Base64 local'}
                {uploadResult.mimeType === 'application/pdf' && ' • PDF'}
              </p>
            </div>
            <div className={`flex items-center ${compact ? 'shrink-0' : 'justify-center'} gap-2`}>
              {uploadResult.mimeType === 'application/pdf' && (
                <button
                  type="button"
                  onClick={handlePreview}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all"
                >
                  <Eye size={14} /> {compact ? '' : 'Visualizar'}
                </button>
              )}
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-all border border-red-200"
              >
                <Trash2 size={14} /> {compact ? '' : 'Remover'}
              </button>
            </div>
          </div>
        </div>

        {/* PDF Preview Modal */}
        {previewUrl && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewUrl(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Eye size={18} className="text-blue-600" />
                  {uploadResult.fileName}
                </h3>
                <button onClick={() => setPreviewUrl(null)}
                  className="p-2 bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1">
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title={`Preview: ${uploadResult.fileName}`}
                />
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ==================== RENDER: EMPTY STATE ====================
  return (
    <div
      className={`border-2 border-dashed rounded-2xl ${compact ? 'p-4' : 'p-8'} text-center transition-all ${
        isDragOver
          ? `border-${color}-400 bg-${color}-50 scale-[1.02]`
          : error
            ? 'border-red-300 bg-red-50/30'
            : `border-gray-200 bg-white hover:border-${color}-300 hover:bg-${color}-50/30`
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {!compact && (
        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          {uploading ? (
            <Loader2 size={32} className={`text-${color}-500 animate-spin`} />
          ) : (
            <Upload size={32} className="text-gray-400" />
          )}
        </div>
      )}

      {uploading ? (
        <div className="space-y-2">
          <p className="text-sm font-bold text-gray-600">Enviando arquivo...</p>
          <div className="w-48 h-1.5 bg-gray-200 rounded-full mx-auto overflow-hidden">
            <div className={`h-full bg-${color}-500 rounded-full animate-pulse`} style={{ width: '60%' }} />
          </div>
        </div>
      ) : (
        <>
          <p className={`text-slate-600 ${compact ? 'text-xs' : 'text-sm'} mb-1`}>{description}</p>
          <p className="text-[10px] text-slate-400 mb-3">{maxSizeLabel} • {acceptLabel}</p>

          {error && (
            <div className="flex items-center justify-center gap-2 mb-3 text-red-600 text-xs font-bold">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            id={inputId}
            disabled={disabled || uploading}
          />
          <label
            htmlFor={inputId}
            className={`cursor-pointer inline-flex items-center gap-2 ${compact ? 'px-4 py-2 text-xs' : 'px-6 py-3'} bg-${color}-600 text-white rounded-xl font-bold hover:bg-${color}-700 transition-all shadow-sm ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <FileIcon size={16} />
            {buttonLabel}
          </label>
        </>
      )}
    </div>
  );
};

export default FileUploader;
