
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

export type AuthMessage = { type: 'success' | 'error'; text: string } | null;

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<AuthMessage>(null);

  const formatCpf = (value: string) => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '').slice(0, 11);
    
    // Aplica a máscara progressivamente
    let masked = digits;
    if (digits.length > 3) {
      masked = `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }
    if (digits.length > 6) {
      masked = `${masked.slice(0, 7)}.${digits.slice(6)}`;
    }
    if (digits.length > 9) {
      masked = `${masked.slice(0, 11)}-${digits.slice(9)}`;
    }
    
    return masked;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpf(e.target.value);
    setCpf(formatted);
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setMessage(null);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        // Validação básica de tamanho de CPF antes de enviar
        if (cpf.length !== 14) {
          throw new Error("O CPF deve estar no formato 000.000.000-00");
        }

        // 1. Cadastro no Supabase Auth
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName,
              cpf: cpf
            }
          }
        });
        
        if (error) throw error;

        // 2. Criação/Vinculação na tabela 'profiles'
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              full_name: fullName,
              email: email,
              cpf: cpf,
              system_role: 'USUÁRIO',
              created_at: new Date()
            });

          if (profileError) {
            console.warn("Aviso: Perfil na tabela pública não pôde ser criado manualmente.", profileError);
          }
        }

        setMessage({ type: 'success', text: 'Cadastro realizado! Verifique seu e-mail para confirmar seu acesso.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao processar solicitação.' });
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    fullName,
    setFullName,
    cpf,
    handleCpfChange,
    isSignUp,
    loading,
    message,
    toggleMode,
    handleAuth,
    setMessage
  };
};
