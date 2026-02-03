-- 1. Habilita extensão UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Tabela de Perfis (Roles) - dperfil
CREATE TABLE IF NOT EXISTS public.dperfil (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Popula perfis iniciais
INSERT INTO public.dperfil (slug, name, description) VALUES
('ADMIN', 'Administrador', 'Acesso total'),
('SOSFU', 'Equipe Técnica SOSFU', 'Análise técnica'),
('SUPRIDO', 'Suprido (Padrão)', 'Solicitante'),
('SEFIN', 'Secretaria de Finanças', 'Ordenador de despesas'),
('GESTOR', 'Gestor da Unidade', 'Aprova solicitações')
ON CONFLICT (slug) DO NOTHING;

-- 3. Tabela de Usuários - profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    matricula TEXT,
    cargo TEXT,
    lotacao TEXT,
    municipio TEXT,
    avatar_url TEXT,
    perfil_id UUID REFERENCES public.dperfil(id),
    status TEXT DEFAULT 'ACTIVE',
    gestor_nome TEXT,
    gestor_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Trigger para criar perfil automaticamente ao cadastrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id UUID;
BEGIN
  -- Define perfil padrão como SUPRIDO, salvo exceções
  SELECT id INTO v_role_id FROM public.dperfil WHERE slug = 'SUPRIDO';
  
  -- Se for o Fabio (hardcoded para facilitar setup), vira SOSFU
  IF new.email ILIKE '%fabio.freitas%' THEN
     SELECT id INTO v_role_id FROM public.dperfil WHERE slug = 'SOSFU';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, perfil_id, avatar_url)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuário Novo'),
    v_role_id,
    'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/avatar_placeholder.png'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Tabelas de Negócio
CREATE TABLE IF NOT EXISTS public.solicitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    process_number TEXT NOT NULL,
    beneficiary TEXT,
    value NUMERIC(10,2),
    status TEXT DEFAULT 'PENDING',
    user_id UUID REFERENCES public.profiles(id),
    unit TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    justification TEXT,
    manager_email TEXT
);

CREATE TABLE IF NOT EXISTS public.app_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    max_value_extraordinary NUMERIC(10,2) DEFAULT 15000.00,
    price_lunch NUMERIC(10,2) DEFAULT 30.00
);
INSERT INTO public.app_config (max_value_extraordinary) SELECT 15000 WHERE NOT EXISTS (SELECT 1 FROM public.app_config);
