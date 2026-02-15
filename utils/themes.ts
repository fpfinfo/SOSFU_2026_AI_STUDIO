
import { AppModule } from '../types';

export interface ModuleTheme {
  primary: string;
  secondary: string;
  gradient: string;
  accent: string;
  icon: string;
  label: string;
  welcomeMsg: string; // Nova propriedade para mensagem de boas-vindas personalizada
  badge: string;
  hover: string;
}

export const MODULE_THEMES: Record<AppModule, ModuleTheme> = {
  suprimento: {
    primary: 'text-emerald-600',
    secondary: 'bg-emerald-600',
    gradient: 'from-emerald-500 to-teal-400',
    accent: 'border-emerald-100',
    icon: 'fa-box-open',
    label: 'Gestão de Suprimentos',
    welcomeMsg: 'Gerencie suprimentos de fundos com agilidade e total conformidade financeira.',
    badge: 'bg-emerald-50 text-emerald-600',
    hover: 'hover:bg-emerald-50'
  },
  diarias: {
    primary: 'text-indigo-600',
    secondary: 'bg-indigo-600',
    gradient: 'from-indigo-600 to-blue-500',
    accent: 'border-indigo-100',
    icon: 'fa-plane-departure',
    label: 'Gestão de Diárias',
    welcomeMsg: 'Solicite e acompanhe suas diárias e passagens para missões institucionais.',
    badge: 'bg-indigo-50 text-indigo-600',
    hover: 'hover:bg-indigo-50'
  },
  reembolsos: {
    primary: 'text-rose-600',
    secondary: 'bg-rose-600',
    gradient: 'from-rose-500 to-orange-400',
    accent: 'border-rose-100',
    icon: 'fa-receipt',
    label: 'Gestão de Reembolsos',
    welcomeMsg: 'Solicite ressarcimento de despesas realizadas a serviço do Tribunal.',
    badge: 'bg-rose-50 text-rose-600',
    hover: 'hover:bg-rose-50'
  },
  contas: {
    primary: 'text-orange-600',
    secondary: 'bg-orange-600',
    gradient: 'from-orange-500 to-amber-400',
    accent: 'border-orange-100',
    icon: 'fa-file-invoice-dollar',
    label: 'Gestão de Contas',
    welcomeMsg: 'Acompanhe a prestação de contas e movimentações de suprimento de fundos.',
    badge: 'bg-orange-50 text-orange-600',
    hover: 'hover:bg-orange-50'
  },
  sefin: {
    primary: 'text-blue-700',
    secondary: 'bg-blue-700',
    gradient: 'from-blue-700 to-indigo-600',
    accent: 'border-blue-100',
    icon: 'fa-vault',
    label: 'SEFIN - Orçamentário',
    welcomeMsg: 'Central de controle orçamentário e execução financeira da SEFIN.',
    badge: 'bg-blue-50 text-blue-700',
    hover: 'hover:bg-blue-50'
  },
  ajsefin: {
    primary: 'text-slate-800',
    secondary: 'bg-slate-800',
    gradient: 'from-slate-800 to-indigo-900',
    accent: 'border-slate-200',
    icon: 'fa-scale-balanced',
    label: 'AJSEFIN - Jurídico',
    welcomeMsg: 'Análise técnica e pareceres jurídicos para processos do SISUP.',
    badge: 'bg-slate-100 text-slate-800',
    hover: 'hover:bg-slate-100'
  },
  sgp: {
    primary: 'text-sky-600',
    secondary: 'bg-sky-600',
    gradient: 'from-sky-500 to-indigo-400',
    accent: 'border-sky-100',
    icon: 'fa-users-gear',
    label: 'SGP - Pessoas',
    welcomeMsg: 'Gestão de servidores e autorizações administrativas de deslocamento.',
    badge: 'bg-sky-50 text-sky-600',
    hover: 'hover:bg-sky-50'
  },
  coorc: {
    primary: 'text-violet-600',
    secondary: 'bg-violet-600',
    gradient: 'from-violet-600 to-purple-500',
    accent: 'border-violet-100',
    icon: 'fa-chart-pie',
    label: 'COORC - Orçamento',
    welcomeMsg: 'Planejamento e coordenação orçamentária do Tribunal.',
    badge: 'bg-violet-50 text-violet-600',
    hover: 'hover:bg-violet-50'
  },
  sead: {
    primary: 'text-zinc-700',
    secondary: 'bg-zinc-700',
    gradient: 'from-zinc-700 to-slate-500',
    accent: 'border-zinc-200',
    icon: 'fa-building-columns',
    label: 'SEAD - Administrativo',
    welcomeMsg: 'Gestão administrativa e secretaria executiva do Tribunal.',
    badge: 'bg-zinc-100 text-zinc-700',
    hover: 'hover:bg-zinc-100'
  },
  presidencia: {
    primary: 'text-slate-900',
    secondary: 'bg-slate-900',
    gradient: 'from-slate-900 to-slate-700',
    accent: 'border-slate-300',
    icon: 'fa-landmark',
    label: 'Gabinete Presidência',
    welcomeMsg: 'Painel de Gestão Estratégica da Alta Administração do TJPA.',
    badge: 'bg-slate-200 text-slate-900',
    hover: 'hover:bg-slate-200'
  },
  usuarios: {
    primary: 'text-emerald-900',
    secondary: 'bg-emerald-900',
    gradient: 'from-emerald-900 to-emerald-700',
    accent: 'border-emerald-200',
    icon: 'fa-house',
    label: 'Portal ÁGIL',
    welcomeMsg: 'Bem-vindo ao Portal ÁGIL. Suas ferramentas institucionais em um só lugar.',
    badge: 'bg-emerald-50 text-emerald-900',
    hover: 'hover:bg-gray-50'
  }
};
