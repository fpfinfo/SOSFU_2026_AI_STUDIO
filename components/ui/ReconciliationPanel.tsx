import React, { useMemo } from 'react';
import {
    CheckCircle2, AlertTriangle, Clock, ArrowRight,
    DollarSign, FileText, CreditCard, Scale, TrendingDown
} from 'lucide-react';

// ==================== RECONCILIATION PANEL ====================
// Consolidated NE × DL × OB financial integrity view.
// Shows the triple-check flow with value deltas and status.

interface ReconciliationData {
    ne_valor?: number;
    dl_valor?: number;
    ob_valor?: number;
    ne_numero?: string;
    dl_numero?: string;
    ob_numero?: string;
    value?: number; // Solicitation total value for reference
}

interface DocumentStatus {
    type: string;
    document_type: string;
    status: string;
    signed_at?: string;
}

interface ReconciliationPanelProps {
    processData: ReconciliationData;
    documents?: DocumentStatus[];
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
}).format(v);

interface StepInfo {
    key: 'ne' | 'dl' | 'ob';
    label: string;
    fullLabel: string;
    icon: React.ElementType;
    color: string;
    bgLight: string;
    bgDark: string;
    border: string;
    getValor: (d: ReconciliationData) => number;
    getNumero: (d: ReconciliationData) => string | undefined;
    docTypes: string[];
}

const STEPS: StepInfo[] = [
    {
        key: 'ne', label: 'NE', fullLabel: 'Nota de Empenho',
        icon: FileText, color: 'text-amber-600', bgLight: 'bg-amber-50',
        bgDark: 'bg-amber-100', border: 'border-amber-200',
        getValor: d => d.ne_valor || 0, getNumero: d => d.ne_numero,
        docTypes: ['NOTA_EMPENHO', 'NE'],
    },
    {
        key: 'dl', label: 'DL', fullLabel: 'Doc. Liquidação',
        icon: CreditCard, color: 'text-teal-600', bgLight: 'bg-teal-50',
        bgDark: 'bg-teal-100', border: 'border-teal-200',
        getValor: d => d.dl_valor || 0, getNumero: d => d.dl_numero,
        docTypes: ['LIQUIDACAO', 'DOCUMENTO_LIQUIDACAO', 'DL'],
    },
    {
        key: 'ob', label: 'OB', fullLabel: 'Ordem Bancária',
        icon: DollarSign, color: 'text-teal-600', bgLight: 'bg-teal-50',
        bgDark: 'bg-teal-100', border: 'border-teal-200',
        getValor: d => d.ob_valor || 0, getNumero: d => d.ob_numero,
        docTypes: ['ORDEM_BANCARIA', 'OB'],
    },
];

function getDocStatus(docTypes: string[], documents: DocumentStatus[]): 'SIGNED' | 'MINUTA' | 'PENDING' {
    const doc = documents.find(d => docTypes.includes(d.document_type));
    if (!doc) return 'PENDING';
    if (doc.status === 'SIGNED') return 'SIGNED';
    return 'MINUTA';
}

export const ReconciliationPanel: React.FC<ReconciliationPanelProps> = ({
    processData,
    documents = [],
}) => {
    const hasAnyValue = processData.ne_valor || processData.dl_valor || processData.ob_valor;

    const analysis = useMemo(() => {
        const neVal = processData.ne_valor || 0;
        const dlVal = processData.dl_valor || 0;
        const obVal = processData.ob_valor || 0;

        const deltaNeDl = neVal > 0 && dlVal > 0 ? Math.abs(neVal - dlVal) : null;
        const deltaDlOb = dlVal > 0 && obVal > 0 ? Math.abs(dlVal - obVal) : null;
        const deltaNeOb = neVal > 0 && obVal > 0 ? Math.abs(neVal - obVal) : null;

        const hasDivergence = (deltaNeDl !== null && deltaNeDl > 0.01) ||
                              (deltaDlOb !== null && deltaDlOb > 0.01) ||
                              (deltaNeOb !== null && deltaNeOb > 0.01);

        const allMatched = neVal > 0 && dlVal > 0 && obVal > 0 &&
                           deltaNeDl !== null && deltaNeDl <= 0.01 &&
                           deltaDlOb !== null && deltaDlOb <= 0.01;

        const allSigned = STEPS.every(step => getDocStatus(step.docTypes, documents) === 'SIGNED');

        return {
            neVal, dlVal, obVal,
            deltaNeDl, deltaDlOb, deltaNeOb,
            hasDivergence, allMatched, allSigned,
        };
    }, [processData, documents]);

    if (!hasAnyValue && documents.length === 0) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Scale size={24} className="text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm font-medium">Reconciliação financeira</p>
                <p className="text-slate-400 text-xs mt-1">Os documentos de execução ainda não foram gerados.</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${analysis.hasDivergence ? 'bg-red-100 text-red-600' : analysis.allMatched ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                        {analysis.hasDivergence ? <AlertTriangle size={18} /> : analysis.allMatched ? <CheckCircle2 size={18} /> : <Scale size={18} />}
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-gray-800">Reconciliação NE → DL → OB</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {analysis.hasDivergence
                                ? '⚠️ Divergência detectada nos valores'
                                : analysis.allMatched
                                    ? '✅ Valores reconciliados com sucesso'
                                    : 'Aguardando emissão dos documentos'
                            }
                        </p>
                    </div>
                </div>
                {processData.value && (
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Valor Solicitado</p>
                        <p className="text-sm font-bold text-gray-700">{fmt(processData.value)}</p>
                    </div>
                )}
            </div>

            {/* Triple Card Flow */}
            <div className="p-6">
                <div className="flex items-stretch gap-2">
                    {STEPS.map((step, i) => {
                        const valor = step.getValor(processData);
                        const numero = step.getNumero(processData);
                        const status = getDocStatus(step.docTypes, documents);
                        const Icon = step.icon;

                        return (
                            <React.Fragment key={step.key}>
                                <div className={`flex-1 ${step.bgLight} border ${step.border} rounded-xl p-4 transition-all hover:shadow-md`}>
                                    {/* Icon + Label */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className={`p-1.5 rounded-lg ${step.bgDark} ${step.color}`}>
                                            <Icon size={14} />
                                        </div>
                                        <span className={`text-xs font-bold ${step.color}`}>{step.fullLabel}</span>
                                    </div>

                                    {/* Value */}
                                    <p className="text-lg font-black text-gray-800">
                                        {valor > 0 ? fmt(valor) : '—'}
                                    </p>
                                    {numero && (
                                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{numero}</p>
                                    )}

                                    {/* Status */}
                                    <div className="mt-3">
                                        {status === 'SIGNED' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg">
                                                <CheckCircle2 size={10} /> Assinado
                                            </span>
                                        ) : status === 'MINUTA' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-lg">
                                                <Clock size={10} /> Minuta
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-lg">
                                                <Clock size={10} /> Pendente
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Arrow between cards */}
                                {i < STEPS.length - 1 && (
                                    <div className="flex items-center px-1 text-gray-300">
                                        <ArrowRight size={18} />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Divergence Alert */}
            {analysis.hasDivergence && (
                <div className="mx-6 mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <TrendingDown size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <div className="text-sm text-red-700">
                        <p className="font-bold">Divergência detectada</p>
                        <div className="mt-1 space-y-0.5 text-xs">
                            {analysis.deltaNeDl !== null && analysis.deltaNeDl > 0.01 && (
                                <p>• NE × DL: diferença de <strong>{fmt(analysis.deltaNeDl)}</strong></p>
                            )}
                            {analysis.deltaDlOb !== null && analysis.deltaDlOb > 0.01 && (
                                <p>• DL × OB: diferença de <strong>{fmt(analysis.deltaDlOb)}</strong></p>
                            )}
                            {analysis.deltaNeOb !== null && analysis.deltaNeOb > 0.01 && (
                                <p>• NE × OB: diferença de <strong>{fmt(analysis.deltaNeOb)}</strong></p>
                            )}
                        </div>
                        <p className="mt-2 text-[10px] text-red-500">
                            Diferenças acima de R$ 0,01 devem ser corrigidas antes do envio ao TCE.
                        </p>
                    </div>
                </div>
            )}

            {/* All clear badge */}
            {analysis.allMatched && analysis.allSigned && (
                <div className="mx-6 mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <div className="text-sm text-emerald-700">
                        <p className="font-bold">Triple Check aprovado ✅</p>
                        <p className="text-xs mt-0.5">
                            NE = DL = OB = <strong>{fmt(analysis.neVal)}</strong> — todos assinados. Pronto para baixa SIAFE.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
