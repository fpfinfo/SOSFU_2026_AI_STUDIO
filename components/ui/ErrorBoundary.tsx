import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallbackTitle?: string;
    onReset?: () => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    componentStack: string | null;
}

/**
 * Error Boundary — Captura erros de renderização e exibe um fallback premium.
 * Previne crash total da aplicação quando um componente filho falha.
 * 
 * React.Component generics não resolvem via esm.sh import map,
 * então usamos type assertions pontuais em this.props/this.state.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    
    constructor(props: ErrorBoundaryProps) {
        super(props);
        (this as any).state = { hasError: false, error: null, componentStack: null };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
        (this as any).setState({ componentStack: errorInfo?.componentStack || null });
    }

    handleReset = () => {
        (this as any).setState({ hasError: false, error: null, componentStack: null });
        ((this as any).props as ErrorBoundaryProps).onReset?.();
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        const state = (this as any).state as ErrorBoundaryState;
        const props = (this as any).props as ErrorBoundaryProps;

        if (state.hasError) {
            return (
                <div className="flex items-center justify-center min-h-[400px] p-8">
                    <div className="max-w-md w-full text-center space-y-6">
                        {/* Icon */}
                        <div className="mx-auto w-16 h-16 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center justify-center">
                            <AlertTriangle className="text-red-500" size={32} />
                        </div>

                        {/* Title */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">
                                {props.fallbackTitle || 'Algo deu errado'}
                            </h2>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                Ocorreu um erro inesperado nesta seção. Tente recarregar ou voltar à página inicial.
                            </p>
                        </div>

                        {/* Error details */}
                        {state.error && (
                            <details className="text-left bg-gray-50 border border-gray-200 rounded-xl p-4">
                                <summary className="text-xs font-bold text-gray-500 cursor-pointer select-none uppercase tracking-wider">
                                    Detalhes técnicos
                                </summary>
                                <pre className="mt-3 text-[11px] text-red-600 bg-red-50 p-3 rounded-lg overflow-auto max-h-32 font-mono whitespace-pre-wrap break-all">
                                    {state.error.message}
                                </pre>
                                {state.componentStack && (
                                    <pre className="mt-2 text-[10px] text-gray-400 bg-gray-100 p-3 rounded-lg overflow-auto max-h-24 font-mono whitespace-pre-wrap break-all">
                                        {state.componentStack.slice(0, 500)}
                                    </pre>
                                )}
                            </details>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={this.handleReset}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                                aria-label="Tentar novamente"
                            >
                                <RefreshCw size={16} />
                                Tentar novamente
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                                aria-label="Recarregar página"
                            >
                                <Home size={16} />
                                Recarregar
                            </button>
                        </div>

                        {/* Footer */}
                        <p className="text-[10px] text-gray-400">
                            Se o problema persistir, entre em contato com o suporte técnico — SOSFU/TJPA
                        </p>
                    </div>
                </div>
            );
        }

        return props.children;
    }
}
