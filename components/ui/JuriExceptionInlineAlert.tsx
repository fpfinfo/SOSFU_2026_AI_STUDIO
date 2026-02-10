import React, { useMemo } from 'react';
import { AlertTriangle, Info, Shield, DollarSign, ArrowRight, Clock } from 'lucide-react';

interface JuriExceptionInlineAlertProps {
    policiais?: number;
    almocoValue?: number;
    jantarValue?: number;
    lancheValue?: number;
    diasAteEvento?: number | null;
    diasAtraso?: number | null;
    userRole: 'USER' | 'GESTOR' | 'SOSFU' | 'AJSEFIN' | 'SEFIN';
}

// Limites institucionais configurados
const LIMITS = {
    policiais: 5,
    almoco: 30.00,
    jantar: 30.00,
    lanche: 11.00,
    prazo_minimo_dias: 7,
    pc_prazo_dias: 30
};

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

/**
 * Componente de alerta inline para exceções de Sessão de Júri.
 * Detecta valores/prazos que excedem os limites institucionais e
 * adapta a mensagem com base no papel do usuário no fluxo.
 */
export const JuriExceptionInlineAlert: React.FC<JuriExceptionInlineAlertProps> = ({
    policiais = 0,
    almocoValue = 0,
    jantarValue = 0,
    lancheValue = 0,
    diasAteEvento,
    diasAtraso,
    userRole
}) => {
    const exceptions = useMemo(() => {
        const exc: { tipo: string; solicitado: number; limite: number }[] = [];

        if (policiais > LIMITS.policiais) {
            exc.push({ tipo: 'policiais', solicitado: policiais, limite: LIMITS.policiais });
        }
        if (almocoValue > LIMITS.almoco) {
            exc.push({ tipo: 'almoco', solicitado: almocoValue, limite: LIMITS.almoco });
        }
        if (jantarValue > LIMITS.jantar) {
            exc.push({ tipo: 'jantar', solicitado: jantarValue, limite: LIMITS.jantar });
        }
        if (lancheValue > LIMITS.lanche) {
            exc.push({ tipo: 'lanche', solicitado: lancheValue, limite: LIMITS.lanche });
        }
        if (diasAteEvento !== null && diasAteEvento !== undefined && diasAteEvento >= 0 && diasAteEvento < LIMITS.prazo_minimo_dias) {
            exc.push({ tipo: 'prazo', solicitado: diasAteEvento, limite: LIMITS.prazo_minimo_dias });
        }
        if (diasAtraso !== null && diasAtraso !== undefined && diasAtraso > LIMITS.pc_prazo_dias) {
            exc.push({ tipo: 'pc_atraso', solicitado: diasAtraso, limite: LIMITS.pc_prazo_dias });
        }

        return exc;
    }, [policiais, almocoValue, jantarValue, lancheValue, diasAteEvento, diasAtraso]);

    if (exceptions.length === 0) return null;

    const hasPrazoException = exceptions.some(e => e.tipo === 'prazo');
    const hasPCAtrasaException = exceptions.some(e => e.tipo === 'pc_atraso');
    const hasValueException = exceptions.some(e => e.tipo !== 'prazo' && e.tipo !== 'pc_atraso');

    const getMessage = () => {
        // Only PC atraso
        if (hasPCAtrasaException && !hasValueException && !hasPrazoException) {
            switch (userRole) {
                case 'USER':
                    return {
                        title: 'Prestação de Contas Fora do Prazo',
                        message: 'Esta prestação de contas está sendo enviada após o prazo legal de 30 dias. Seu Gestor deverá anexar um ofício justificando o atraso para autorização do Ordenador.',
                        color: 'amber' as const,
                        icon: Clock
                    };
                case 'GESTOR':
                    return {
                        title: 'Ação Necessária — PC Atrasada',
                        message: 'Esta prestação de contas foi enviada fora do prazo de 30 dias. Anexe um Ofício de Justificativa explicando o motivo do atraso.',
                        color: 'purple' as const,
                        icon: AlertTriangle
                    };
                default:
                    return {
                        title: 'Autorização Especial — PC Atrasada',
                        message: 'Esta prestação de contas requer autorização por atraso na apresentação.',
                        color: 'blue' as const,
                        icon: AlertTriangle
                    };
            }
        }

        // Only prazo exception
        if (hasPrazoException && !hasValueException && !hasPCAtrasaException) {
            switch (userRole) {
                case 'USER':
                    return {
                        title: 'Prazo de Antecedência Insuficiente',
                        message: 'O evento está com menos de 7 dias de antecedência. Seu Gestor deverá anexar um ofício de justificativa para que o Ordenador de Despesas autorize esta solicitação.',
                        color: 'amber' as const,
                        icon: Info
                    };
                case 'GESTOR':
                    return {
                        title: 'Ação Necessária — Prazo Insuficiente',
                        message: 'Esta solicitação foi feita com menos de 7 dias de antecedência. Anexe um Ofício de Justificativa explicando a urgência.',
                        color: 'purple' as const,
                        icon: AlertTriangle
                    };
                default:
                    return {
                        title: 'Autorização Especial — Prazo',
                        message: 'Esta solicitação requer autorização por prazo insuficiente.',
                        color: 'blue' as const,
                        icon: AlertTriangle
                    };
            }
        }

        // Mixed or value-only
        switch (userRole) {
            case 'USER':
                return {
                    title: (hasPrazoException || hasPCAtrasaException) ? 'Valores e Prazos Fora dos Limites' : 'Valores Acima dos Limites',
                    message: 'Sua solicitação contém valores ou prazos que excedem os limites autorizados. O Gestor deverá anexar um ofício de justificativa para que o Ordenador de Despesas autorize.',
                    color: 'amber' as const,
                    icon: Info
                };
            case 'GESTOR':
                return {
                    title: 'Ação Necessária',
                    message: 'Este processo contém valores/prazos fora dos limites. Anexe um Ofício de Justificativa junto à Certidão de Atesto explicando a necessidade.',
                    color: 'purple' as const,
                    icon: AlertTriangle
                };
            case 'SOSFU':
                return {
                    title: 'Limite de Policiais Excedido',
                    message: 'Este processo contém mais policiais que o permitido. Gere um Despacho solicitando análise à AJSEFIN e tramite o processo para obter autorização do Ordenador.',
                    color: 'amber' as const,
                    icon: Shield
                };
            default:
                return {
                    title: 'Autorização Especial Necessária',
                    message: 'Este processo requer autorização do Ordenador de Despesas (SEFIN).',
                    color: 'blue' as const,
                    icon: AlertTriangle
                };
        }
    };

    const config = getMessage();
    const Icon = config.icon;

    const colorClasses = {
        amber: {
            bg: 'bg-amber-50',
            border: 'border-amber-300',
            text: 'text-amber-800',
            badge: 'bg-amber-100',
            iconBg: 'bg-amber-100',
            borderSep: 'border-amber-200/40'
        },
        purple: {
            bg: 'bg-purple-50',
            border: 'border-purple-300',
            text: 'text-purple-800',
            badge: 'bg-purple-100',
            iconBg: 'bg-purple-100',
            borderSep: 'border-purple-200/40'
        },
        blue: {
            bg: 'bg-blue-50',
            border: 'border-blue-300',
            text: 'text-blue-800',
            badge: 'bg-blue-100',
            iconBg: 'bg-blue-100',
            borderSep: 'border-blue-200/40'
        }
    };

    const c = colorClasses[config.color];

    return (
        <div className={`rounded-xl border-2 p-4 ${c.bg} ${c.border} ${c.text} animate-in fade-in duration-300`}>
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${c.iconBg} shrink-0`}>
                    <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-black text-sm mb-1">{config.title}</h4>
                    <p className="text-sm opacity-80 mb-3">{config.message}</p>

                    {/* Lista de exceções detectadas */}
                    <div className="flex flex-wrap gap-2">
                        {exceptions.map((exc, index) => (
                            <span
                                key={index}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${c.badge}`}
                            >
                                {exc.tipo === 'policiais' ? <Shield size={12} /> : (exc.tipo === 'prazo' || exc.tipo === 'pc_atraso') ? <Clock size={12} /> : <DollarSign size={12} />}
                                {exc.tipo === 'policiais'
                                    ? `${exc.solicitado} policiais (limite: ${exc.limite})`
                                    : exc.tipo === 'prazo'
                                    ? `${exc.solicitado} dias (mínimo: ${exc.limite})`
                                    : exc.tipo === 'pc_atraso'
                                    ? `${exc.solicitado} dias (limite: ${exc.limite})`
                                    : `${exc.tipo}: ${formatCurrency(exc.solicitado)} (limite: ${formatCurrency(exc.limite)})`
                                }
                            </span>
                        ))}
                    </div>

                    {/* Fluxo de autorização */}
                    <div className={`mt-3 pt-3 border-t ${c.borderSep} flex items-center gap-1 text-[10px] opacity-60 font-medium uppercase tracking-wider flex-wrap`}>
                        <span>Fluxo:</span>
                        <span className={userRole === 'USER' ? 'font-black' : ''}>Suprido</span>
                        <ArrowRight size={10} />
                        <span className={userRole === 'GESTOR' ? 'font-black' : ''}>Gestor + Ofício</span>
                        <ArrowRight size={10} />
                        <span className={userRole === 'SOSFU' ? 'font-black' : ''}>SOSFU</span>
                        <ArrowRight size={10} />
                        <span className={userRole === 'AJSEFIN' ? 'font-black' : ''}>AJSEFIN</span>
                        <ArrowRight size={10} />
                        <span className={userRole === 'SEFIN' ? 'font-black' : ''}>Ordenador</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JuriExceptionInlineAlert;
