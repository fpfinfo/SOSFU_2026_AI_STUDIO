import React from 'react';

// ==================== DOCUMENT SIGNATURE FOOTER ====================
// Reusable electronic signature block for document footers.
// Renders signer info, verification hash, and legal reference.
// Used across all document templates (USER, GESTOR, SOSFU, SEFIN).

export interface SignatureEntry {
    name: string;
    role: string;           // "Requerente / Suprido" | "Gestor" | "Analista SOSFU" | "Ordenador de Despesa"
    organization?: string;  // Lotação / Setor
    signedAt?: string;      // ISO date — if present, renders as signed
    isSigned?: boolean;     // Override: force signed/pending state
}

interface DocumentSignatureFooterProps {
    signatures: SignatureEntry[];
    documentId?: string;    // For hash generation
    compact?: boolean;      // Single-line mode for tight spaces
}

// Generate a deterministic verification hash from document ID + signer name
const generateHash = (docId?: string, name?: string): string => {
    const seed = `${docId || 'DRAFT'}-${name || 'PENDENTE'}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
};

const formatSignatureDate = (isoDate?: string): string => {
    if (!isoDate) return new Date().toLocaleDateString('pt-BR', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
    return new Date(isoDate).toLocaleDateString('pt-BR', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
};

export const DocumentSignatureFooter: React.FC<DocumentSignatureFooterProps> = ({
    signatures,
    documentId,
    compact = false,
}) => {
    if (!signatures || signatures.length === 0) return null;

    const isSingleSigner = signatures.length === 1;

    return (
        <div className="mt-12 pt-6 border-t-2 border-slate-300 break-inside-avoid font-sans">
            {/* Signature lines */}
            <div className={`flex ${isSingleSigner ? 'justify-center' : 'justify-around'} gap-8 mb-6`}>
                {signatures.map((sig, i) => {
                    const signed = sig.isSigned ?? !!sig.signedAt;
                    const hash = generateHash(documentId, sig.name);

                    return (
                        <div key={i} className="text-center min-w-[200px] max-w-[300px]">
                            {/* Signature line */}
                            <div className="border-t border-black pt-3 px-4">
                                <p className="font-bold text-gray-900 uppercase text-sm tracking-wide">
                                    {sig.name}
                                </p>
                                <p className="text-xs text-gray-600 italic mt-0.5">
                                    {sig.role}
                                </p>
                                {sig.organization && (
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        {sig.organization}
                                    </p>
                                )}
                            </div>

                            {/* Verification token */}
                            {signed ? (
                                <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                                    <div className="flex items-center justify-center gap-1.5 mb-1">
                                        <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">
                                            Assinado Eletronicamente
                                        </span>
                                    </div>
                                    <p className="text-[8px] text-emerald-600 font-mono">
                                        {formatSignatureDate(sig.signedAt)} • Token: {hash}
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                    <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">
                                        ⏳ Pendente de Assinatura
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legal reference (shared) */}
            {!compact && (
                <div className="text-center border-t border-gray-200 pt-3">
                    <p className="text-[8px] text-gray-400 leading-relaxed max-w-lg mx-auto">
                        Documento assinado eletronicamente conforme Medida Provisória nº 2.200-2/2001.
                        A autenticidade pode ser verificada no sistema SISUP/TJPA{documentId ? ` (ID: ${documentId.substring(0, 16)})` : ''}.
                    </p>
                </div>
            )}
        </div>
    );
};
