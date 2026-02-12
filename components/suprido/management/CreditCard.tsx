import React from 'react';
import { motion } from 'framer-motion';

interface CreditCardProps {
    userName?: string;
}

export const CreditCard: React.FC<CreditCardProps> = ({ userName }) => {
    return (
        <motion.div 
            whileHover={{ scale: 1.02, rotateY: 5, rotateX: -5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative w-full aspect-[1.6/1] bg-gradient-to-br from-emerald-500 to-teal-700 rounded-[2rem] p-8 text-white shadow-[0_20px_50px_rgba(16,185,129,0.3)] overflow-hidden group cursor-pointer"
        >
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50"></div>
            
            {/* Logo and Chip */}
            <div className="flex justify-between items-start relative z-10">
                <div className="flex flex-col">
                    <span className="text-2xl font-black italic tracking-tighter">TJPA <span className="font-light not-italic opacity-80 uppercase text-xs">Corp</span></span>
                    <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest leading-none">Sistema Judiciário Paraense</span>
                </div>
                <div className="w-12 h-10 bg-amber-200/40 rounded-lg flex items-center justify-center border border-white/20">
                    <div className="w-8 h-6 bg-gradient-to-br from-amber-200 to-amber-500 rounded-sm"></div>
                </div>
            </div>

            {/* Brass Texture / Background Pattern */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors"></div>

            {/* Card Number */}
            <div className="mt-12 mb-8 relative z-10">
                <div className="flex gap-4 text-2xl font-mono tracking-[0.3em] font-medium text-white/90 drop-shadow-lg">
                    <span>****</span>
                    <span>****</span>
                    <span>****</span>
                    <span className="text-white">8842</span>
                </div>
            </div>

            {/* Holder Name and Expiry */}
            <div className="flex justify-between items-end relative z-10">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase opacity-60 tracking-widest">Portador Oficial</span>
                    <span className="text-lg font-bold tracking-wide">{userName?.toUpperCase() || 'PORTADOR OFICIAL'}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase opacity-60 tracking-widest">Validade</span>
                    <span className="text-lg font-bold">12/28</span>
                </div>
            </div>

            {/* Shine Effect */}
            <motion.div 
                className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                animate={{ translateX: ["100%", "-100%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 5 }}
            />
        </motion.div>
    );
};
