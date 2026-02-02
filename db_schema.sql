-- 0. CONFIGURAÇÃO INICIAL E LIMPEZA
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Garante permissões no schema public
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Removemos triggers e funções antigas
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Limpar tabelas públicas (Ordem correta para respeitar FKs)
DROP TABLE IF EXISTS public.accountabilities;
DROP TABLE IF EXISTS public.solicitations;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.dperfil CASCADE; -- Nova tabela

-- 1. TABELA DE PERFIS DE SISTEMA (dperfil)
CREATE TABLE public.dperfil (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL, -- Ex: 'ADMIN', 'SOSFU', 'SERVIDOR'
  name TEXT NOT NULL,        -- Ex: 'Administrador', 'Técnico SOSFU'
  description TEXT,
  allowed_modules JSONB DEFAULT '[]'::jsonb, -- Ex: ['dashboard', 'solicitations', 'settings']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.dperfil ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.dperfil TO postgres, service_role;
GRANT SELECT ON TABLE public.dperfil TO authenticated, anon; -- Leitura permitida para carregar UI

-- 2. TABELA DE USUÁRIOS (profiles) COM RELACIONAMENTO
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  full_name TEXT,
  email TEXT,
  cpf TEXT,
  matricula TEXT,
  cargo TEXT,
  vinculo TEXT,
  telefone TEXT,
  avatar_url TEXT,
  
  lotacao TEXT,
  municipio TEXT,
  
  gestor_nome TEXT,
  gestor_email TEXT,
  
  banco TEXT,
  agencia TEXT,
  conta_corrente TEXT,
  
  -- Relacionamento com dperfil
  perfil_id UUID REFERENCES public.dperfil(id),
  
  status TEXT DEFAULT 'ACTIVE',
  is_verified BOOLEAN DEFAULT FALSE,
  pin TEXT DEFAULT '1234'
);

-- Permissões Explícitas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT ON TABLE public.profiles TO anon;

-- 3. TABELA DE SOLICITAÇÕES
CREATE TABLE public.solicitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  process_number TEXT NOT NULL,
  beneficiary TEXT NOT NULL,
  unit TEXT,
  value NUMERIC(10,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  
  status TEXT CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAID')) DEFAULT 'PENDING',
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE
);

ALTER TABLE public.solicitations ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.solicitations TO postgres, service_role;
GRANT ALL ON TABLE public.solicitations TO authenticated;

-- 4. TABELA DE PRESTAÇÃO DE CONTAS
CREATE TABLE public.accountabilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  process_number TEXT NOT NULL,
  value NUMERIC(10,2) NOT NULL,
  deadline DATE NOT NULL,
  
  status TEXT CHECK (status IN ('ANALYSIS', 'APPROVED', 'CORRECTION', 'LATE')) DEFAULT 'ANALYSIS',
  
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  solicitation_id UUID REFERENCES public.solicitations(id) ON DELETE SET NULL
);

ALTER TABLE public.accountabilities ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.accountabilities TO postgres, service_role;
GRANT ALL ON TABLE public.accountabilities TO authenticated;

-- 5. FUNÇÃO TRIGGER PARA NOVO USUÁRIO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_servidor_role_id UUID;
BEGIN
  -- Busca o ID do perfil SERVIDOR
  SELECT id INTO v_servidor_role_id FROM public.dperfil WHERE slug = 'SERVIDOR' LIMIT 1;

  -- Se não existir (caso raro de race condition no seed), tenta pegar qualquer um ou deixa NULL
  IF v_servidor_role_id IS NULL THEN
      -- Fallback seguro se a tabela dperfil estiver vazia (não deve ocorrer com o seed correto)
      RAISE WARNING 'Perfil SERVIDOR não encontrado ao criar usuário.';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, matricula, avatar_url, pin, perfil_id)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuário Novo'),
    'AGUARDANDO', 
    'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/avatar_placeholder.png',
    '1234',
    v_servidor_role_id
  );
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar perfil para usuário %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. POLÍTICAS DE SEGURANÇA (RLS)
CREATE POLICY "Perfis visíveis para autenticados" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuários editam próprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "System/Anon pode criar perfis" ON public.profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Ver todas solicitações" ON public.solicitations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Criar solicitações" ON public.solicitations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Ver todas PC" ON public.accountabilities FOR SELECT USING (auth.role() = 'authenticated');
