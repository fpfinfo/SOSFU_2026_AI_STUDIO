import React, { useState, useMemo } from 'react';
import { User, Search, X, UserPlus, Pencil, Trash2 } from 'lucide-react';

// ==================== TYPES ====================
export interface ProfileOption {
  id: string;
  full_name: string;
  email: string | null;
  cpf: string | null;
  matricula: string | null;
  cargo: string | null;
  avatar_url: string | null;
}

interface ProfileCardProps {
  profile: ProfileOption | null;
  label: string;
  icon?: React.ReactNode;
  helpText?: string;
  profiles: ProfileOption[];
  onSelect: (profileId: string) => void;
  onRemove: () => void;
  colorScheme?: 'blue' | 'emerald' | 'amber' | 'indigo';
}

// ==================== HELPERS ====================
const maskCpf = (cpf: string | null | undefined): string => {
  if (!cpf) return '—';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return `***.${clean.slice(3, 6)}.${clean.slice(6, 9)}-**`;
};

const AVATAR_PLACEHOLDER = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/avatar_placeholder.png';

const COLOR_SCHEMES = {
  blue:    { bg: 'bg-blue-50/60', border: 'border-blue-200', headerText: 'text-blue-800', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', btnBg: 'bg-blue-600 hover:bg-blue-700' },
  emerald: { bg: 'bg-emerald-50/60', border: 'border-emerald-200', headerText: 'text-emerald-800', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', btnBg: 'bg-emerald-600 hover:bg-emerald-700' },
  amber:   { bg: 'bg-amber-50/60', border: 'border-amber-200', headerText: 'text-amber-800', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', btnBg: 'bg-amber-600 hover:bg-amber-700' },
  indigo:  { bg: 'bg-indigo-50/60', border: 'border-indigo-200', headerText: 'text-indigo-800', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', btnBg: 'bg-indigo-600 hover:bg-indigo-700' },
};

// ==================== COMPONENT ====================
export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  label,
  icon,
  helpText,
  profiles,
  onSelect,
  onRemove,
  colorScheme = 'blue',
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const cs = COLOR_SCHEMES[colorScheme];

  const filtered = useMemo(() => {
    if (!searchTerm) return profiles.slice(0, 20);
    const t = searchTerm.toLowerCase();
    return profiles
      .filter(p =>
        p.full_name?.toLowerCase().includes(t) ||
        p.email?.toLowerCase().includes(t) ||
        p.matricula?.toLowerCase().includes(t) ||
        p.cpf?.includes(t)
      )
      .slice(0, 20);
  }, [profiles, searchTerm]);

  const handleSelect = (p: ProfileOption) => {
    onSelect(p.id);
    setShowSearch(false);
    setSearchTerm('');
  };

  return (
    <div className={`${cs.bg} border ${cs.border} rounded-xl p-4 transition-all`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 ${cs.iconBg} rounded-lg`}>
            {icon || <User size={14} className={cs.iconColor} />}
          </div>
          <span className={`text-xs font-bold ${cs.headerText} uppercase tracking-wider`}>
            {label}
          </span>
        </div>
        {profile && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setShowSearch(true); setSearchTerm(''); }}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Pencil size={10} /> Alterar
            </button>
            <button
              onClick={onRemove}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-red-500 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={10} /> Remover
            </button>
          </div>
        )}
      </div>

      {/* Profile Content */}
      {profile && !showSearch ? (
        <div className="flex items-start gap-4 bg-white rounded-lg p-3 border border-gray-100">
          <img
            src={profile.avatar_url || AVATAR_PLACEHOLDER}
            alt={profile.full_name}
            className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).src = AVATAR_PLACEHOLDER; }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-800 truncate">{profile.full_name}</p>
            {profile.cargo && (
              <p className="text-[10px] text-gray-400 font-medium truncate">{profile.cargo}</p>
            )}
            <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="text-[10px]">📧</span>
                <span className="truncate">{profile.email || '—'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="text-[10px]">🪪</span>
                <span>CPF: {maskCpf(profile.cpf)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="text-[10px]">🔢</span>
                <span>Matrícula: {profile.matricula || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      ) : !showSearch ? (
        <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-gray-100 border-dashed">
          <p className="text-xs text-gray-400 italic">Nenhum servidor vinculado.</p>
          <button
            onClick={() => { setShowSearch(true); setSearchTerm(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white ${cs.btnBg} rounded-lg transition-colors`}
          >
            <UserPlus size={12} /> Vincular
          </button>
        </div>
      ) : null}

      {/* Search Panel */}
      {showSearch && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, email ou matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                autoFocus
              />
              <button
                onClick={() => { setShowSearch(false); setSearchTerm(''); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              >
                <X size={12} className="text-gray-400" />
              </button>
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Nenhum servidor encontrado.</p>
            ) : (
              filtered.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50/50 transition-colors text-left border-b border-gray-50 last:border-b-0"
                >
                  <img
                    src={p.avatar_url || AVATAR_PLACEHOLDER}
                    alt={p.full_name}
                    className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = AVATAR_PLACEHOLDER; }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-700 truncate">{p.full_name}</p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {p.email || '—'} {p.matricula ? `• Mat: ${p.matricula}` : ''}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      {helpText && (
        <p className="text-[10px] text-gray-400 mt-2 italic">{helpText}</p>
      )}
    </div>
  );
};
