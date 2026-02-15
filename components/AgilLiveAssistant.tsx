
import React, { useState, useEffect, useRef } from 'react';
import { suggestForm } from '../services/geminiService';

const AgilLiveAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        // Initialize Web Speech API if available
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.lang = 'pt-BR';
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onresult = async (event: any) => {
                const text = event.results[0][0].transcript;
                setTranscript(text);
                setIsListening(false);
                handleVoiceQuery(text);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event);
                setIsListening(false);
                setResponse('Não consegui te ouvir agora. Verifique as permissões de microfone.');
            };
        } else {
            console.warn("SpeechRecognition not supported in this browser.");
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            setResponse('Seu navegador não suporta comandos de voz. Tente usar o Chrome ou Edge.');
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            setTranscript('');
            setResponse('');
            setIsListening(true);
            try {
                recognitionRef.current?.start();
            } catch (e) {
                console.error("Start error", e);
                setIsListening(false);
                setResponse("Erro ao acessar microfone. Tente atualizar a página.");
            }
        }
    };

    const handleVoiceQuery = async (query: string) => {
        setIsProcessing(true);
        try {
            // Use Gemini to understand the intent
            const result = await suggestForm(query);
            if (result) {
                setResponse(`Entendi. Baseado no que você disse ("${query}"), sugiro utilizar o formulário de ${result.formName}. ${result.explanation}`);
            } else {
                setResponse("Desculpe, não consegui identificar o processo ideal. Pode detalhar um pouco mais?");
            }
        } catch (error) {
            setResponse("Ocorreu um erro ao processar sua solicitação.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed bottom-10 right-10 z-[100] flex flex-col items-end gap-4">
            {/* Assistant Panel */}
            {isOpen && (
                <div className="w-[350px] bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/20 p-8 space-y-6 animate-in slide-in-from-bottom-10 duration-500 overflow-hidden relative">
                    {/* Background Glow */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                    
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ÁGIL Live Active</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-slate-600 transition-colors">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-xl font-black text-slate-900 leading-tight">Como posso te ajudar agora?</h4>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                            Diga algo como: "Preciso viajar para uma comarca no interior" ou "Quero pedir reembolso de um almoço".
                        </p>
                    </div>

                    {/* Interactive Visualizer */}
                    <div className="flex flex-col items-center justify-center py-6 space-y-4 border-y border-slate-50 relative overflow-hidden">
                        {/* Ambient Light Effect */}
                        <div className={`absolute inset-0 bg-blue-400/5 transition-opacity duration-1000 ${isListening ? 'opacity-100' : 'opacity-0'}`}></div>

                        <div 
                            onClick={toggleListening}
                            className={`w-24 h-24 rounded-full flex items-center justify-center cursor-pointer transition-all duration-700 relative ${isListening ? 'scale-110 shadow-[0_0_50px_rgba(59,130,246,0.5)]' : 'hover:scale-105 shadow-xl'}`}
                        >
                            {/* Gemini Orb Layers */}
                            <div className={`absolute inset-[-20%] bg-blue-500/20 rounded-full blur-3xl ${isListening ? 'animate-pulse scale-110' : 'scale-0'} transition-transform duration-1000`}></div>
                            <div className={`absolute inset-[-10%] bg-purple-500/20 rounded-full blur-2xl ${isListening ? 'animate-pulse scale-105' : 'scale-0'} transition-transform duration-1000`} style={{ animationDelay: '200ms' }}></div>
                            
                            <div className={`absolute inset-0 bg-gradient-to-tr from-blue-600 via-purple-500 to-rose-400 rounded-full shadow-2xl ${isListening ? 'animate-spin-slow' : ''}`}>
                                {/* High-tech overlay */}
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
                            </div>
                            
                            <div className="relative z-10 text-white text-3xl drop-shadow-lg">
                                {isListening ? (
                                    <div className="flex gap-1.5 items-center h-6">
                                        <div className="w-1.5 bg-white rounded-full animate-bounce h-3 shadow-[0_0_10px_white]" style={{ animationDuration: '0.6s' }}></div>
                                        <div className="w-1.5 bg-white rounded-full animate-bounce h-6 shadow-[0_0_10px_white]" style={{ animationDuration: '0.4s' }}></div>
                                        <div className="w-1.5 bg-white rounded-full animate-bounce h-4 shadow-[0_0_10px_white]" style={{ animationDuration: '0.8s' }}></div>
                                        <div className="w-1.5 bg-white rounded-full animate-bounce h-5 shadow-[0_0_10px_white]" style={{ animationDuration: '0.5s' }}></div>
                                    </div>
                                ) : (
                                    <i className="fa-solid fa-microphone-lines"></i>
                                )}
                            </div>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] transition-colors duration-500 ${isListening ? 'text-blue-600' : 'text-slate-300'}`}>
                            {isListening ? 'Sistema Ativo' : 'ÁGIL Live'}
                        </span>
                    </div>

                    {/* Transcript & Response Area */}
                    <div className="min-h-[60px] space-y-4">
                        {transcript && (
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-xs text-slate-600">
                                "{transcript}"
                            </div>
                        )}
                        
                        {(isProcessing || response) && (
                            <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50 animate-in fade-in duration-500">
                                {isProcessing ? (
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1">
                                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Processando Inteligência</span>
                                    </div>
                                ) : (
                                    <p className="text-xs font-semibold text-blue-800 leading-relaxed">
                                        {response}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Floating Trigger Button */}
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="w-20 h-20 bg-gradient-to-tr from-slate-900 to-slate-800 rounded-full shadow-2xl flex items-center justify-center text-white border border-white/10 hover:scale-110 active:scale-95 transition-all group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <i className="fa-solid fa-microphone text-2xl relative z-10 group-hover:rotate-12 transition-transform"></i>
                    
                    {/* Notification Badge */}
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 rounded-full border-4 border-white flex items-center justify-center animate-bounce">
                        <span className="text-[8px] font-black">1</span>
                    </div>
                </button>
            )}
        </div>
    );
};

export default AgilLiveAssistant;
