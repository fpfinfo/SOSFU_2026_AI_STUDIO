-- 0. CONFIGURAÇÃO INICIAL E LIMPEZA
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Garante permissões no schema public
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Removemos triggers e funções antigas
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Limpar tabelas públicas (Ordem correta para respeitar FKs)
-- ATENÇÃO: Em produção, comente os DROPS para não perder dados!
-- DROP TABLE IF EXISTS public.accountabilities;
-- DROP TABLE IF EXISTS public.solicitations;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP TABLE IF EXISTS public.dperfil CASCADE; 

-- 1. TABELA DE PERFIS DE SISTEMA (dperfil)
CREATE TABLE IF NOT EXISTS public.dperfil (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL, -- Ex: 'ADMIN', 'SOSFU', 'SUPRIDO'
  name TEXT NOT NULL,        -- Ex: 'Administrador', 'Suprido'
  description TEXT,
  allowed_modules JSONB DEFAULT '[]'::jsonb, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.dperfil ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.dperfil TO postgres, service_role;
GRANT SELECT ON TABLE public.dperfil TO authenticated, anon; -- Leitura permitida para carregar UI

-- 2. TABELA DE USUÁRIOS (profiles) COM RELACIONAMENTO
CREATE TABLE IF NOT EXISTS public.profiles (
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
CREATE TABLE IF NOT EXISTS public.solicitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  process_number TEXT NOT NULL,
  beneficiary TEXT NOT NULL,
  unit TEXT,
  value NUMERIC(10,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  
  status TEXT CHECK (status IN ('PENDING', 'WAITING_MANAGER', 'WAITING_SOSFU_ANALYSIS', 'WAITING_SEFIN_SIGNATURE', 'WAITING_SOSFU_PAYMENT', 'WAITING_SUPRIDO_CONFIRMATION', 'APPROVED', 'REJECTED', 'PAID', 'WAITING_CORRECTION')) DEFAULT 'PENDING',
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  event_start_date DATE,
  event_end_date DATE,
  manager_name TEXT,
  manager_email TEXT,
  justification TEXT,
  analyst_id UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.solicitations ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.solicitations TO postgres, service_role;
GRANT ALL ON TABLE public.solicitations TO authenticated;

-- 4. TABELA DE PRESTAÇÃO DE CONTAS
CREATE TABLE IF NOT EXISTS public.accountabilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  process_number TEXT NOT NULL,
  value NUMERIC(10,2) NOT NULL,
  deadline DATE NOT NULL,
  
  status TEXT CHECK (status IN ('DRAFT', 'WAITING_MANAGER', 'WAITING_SOSFU', 'APPROVED', 'CORRECTION', 'LATE')) DEFAULT 'DRAFT',
  
  total_spent NUMERIC(10,2) DEFAULT 0,
  balance NUMERIC(10,2) DEFAULT 0,
  return_proof_url TEXT,
  
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  solicitation_id UUID REFERENCES public.solicitations(id) ON DELETE SET NULL,
  analyst_id UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.accountabilities ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.accountabilities TO postgres, service_role;
GRANT ALL ON TABLE public.accountabilities TO authenticated;

-- 5. FUNÇÃO TRIGGER PARA NOVO USUÁRIO (AJUSTADA PARA DEFAULT SUPRIDO)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id UUID;
  v_role_slug TEXT;
BEGIN
  -- REGRA DE NEGÓCIO: Todo novo usuário nasce como SUPRIDO por padrão.
  -- Apenas o e-mail 'admin@sistema' (fallback) nasce como ADMIN.
  -- Os demais papéis (SOSFU, GESTOR, SEFIN) devem ser atribuídos manualmente na tela de Configurações > Gerenciar Perfis.
  
  IF new.email = 'admin@sistema' THEN
    v_role_slug := 'ADMIN';
  ELSE
    v_role_slug := 'SUPRIDO';
  END IF;

  -- Busca o ID do perfil correspondente na tabela dperfil
  SELECT id INTO v_role_id FROM public.dperfil WHERE slug = v_role_slug LIMIT 1;

  -- Fallback de Segurança: Se SUPRIDO não existir, tenta encontrar qualquer um que não seja ADMIN/SOSFU
  IF v_role_id IS NULL THEN
      SELECT id INTO v_role_id FROM public.dperfil WHERE slug NOT IN ('ADMIN', 'SOSFU', 'SEFIN') LIMIT 1;
  END IF;
  
  INSERT INTO public.profiles (id, email, full_name, matricula, avatar_url, pin, perfil_id, status)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'AGUARDANDO', -- Matrícula deve ser preenchida pelo usuário ou SOSFU
    'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/avatar_placeholder.png',
    '1234',
    v_role_id,
    'ACTIVE'
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
DROP POLICY IF EXISTS "Perfis visíveis para autenticados" ON public.profiles;
CREATE POLICY "Perfis visíveis para autenticados" ON public.profiles FOR SELECT USING (true); -- Permite busca global para atribuir equipe

DROP POLICY IF EXISTS "Usuários editam próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Staff pode atualizar perfis" ON public.profiles;

CREATE POLICY "Usuários editam próprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Admin e SOSFU podem editar qualquer perfil (para conceder permissões)
CREATE POLICY "Staff pode atualizar perfis" ON public.profiles FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    JOIN public.dperfil dp ON p.perfil_id = dp.id
    WHERE p.id = auth.uid() AND dp.slug IN ('ADMIN', 'SOSFU')
  )
);

DROP POLICY IF EXISTS "Ver todas solicitações" ON public.solicitations;
CREATE POLICY "Ver todas solicitações" ON public.solicitations FOR SELECT USING (true); -- Controle fino feito no frontend, backend aberto para leitura agiliza queries complexas, escrita restrita abaixo

-- Escrita em Solicitações
DROP POLICY IF EXISTS "Criar e editar solicitações" ON public.solicitations;
CREATE POLICY "Criar e editar solicitações" ON public.solicitations FOR ALL USING (
    user_id = auth.uid() OR -- Dono
    manager_email = (SELECT email FROM public.profiles WHERE id = auth.uid()) OR -- Gestor
    EXISTS (SELECT 1 FROM public.profiles p JOIN public.dperfil dp ON p.perfil_id = dp.id WHERE p.id = auth.uid() AND dp.slug IN ('ADMIN', 'SOSFU', 'SEFIN')) -- Staff
);