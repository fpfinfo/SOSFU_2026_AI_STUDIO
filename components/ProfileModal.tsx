import React, { useRef } from 'react';
import { X, Camera, Mail, BadgeCheck, Briefcase } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name: string;
    matricula: string;
    avatar: string;
  };
  onUpdateAvatar: (newUrl: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onUpdateAvatar }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Background */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-400 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-2 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Profile Content */}
        <div className="px-8 pb-8">
          <div className="relative -mt-16 mb-6 flex justify-center">
            <div className="relative group">
                <div className="w-32 h-32 rounded-full p-1 bg-white shadow-lg">
                    <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-full h-full rounded-full object-cover"
                    />
                </div>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-1 right-1 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-105"
                    title="Alterar foto"
                    aria-label="Escolher foto de perfil"
                >
                    <Camera size={18} />
                </button>
                <label htmlFor="avatar-file-input" className="sr-only">Alterar foto de perfil</label>
                <input 
                    id="avatar-file-input"
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                />
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
            <div className="flex items-center justify-center gap-2 mt-1 text-gray-500 text-sm font-medium">
                <BadgeCheck size={16} className="text-blue-500" />
                <span>Matrícula: {user.matricula}</span>
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <Briefcase size={20} />
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Cargo / Função</p>
                    <p className="text-sm font-semibold text-gray-800">Analista Judiciário - Governança</p>
                </div>
             </div>

             <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">
                    <Mail size={20} />
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Email Institucional</p>
                    <p className="text-sm font-semibold text-gray-800">fabio.freitas@tjpa.jus.br</p>
                </div>
             </div>
          </div>

          <div className="mt-8">
            <button 
                onClick={onClose}
                className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-semibold shadow-lg hover:bg-gray-800 hover:shadow-xl transition-all active:scale-[0.98]"
            >
                Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
