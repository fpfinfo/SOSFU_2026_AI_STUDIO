-- SCRIPT DE SINCRONIZAÇÃO DE USUÁRIOS
-- Execute no Editor SQL do Supabase para corrigir "Usuários Sumidos"

-- 0. CORREÇÃO DE SCHEMA: Garante que a coluna created_at exista
-- (Corrige o erro 42703 caso a tabela tenha sido criada com schema antigo)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'created_at') THEN
        ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;

-- 1. Garante que o perfil padrão 'SUPRIDO' exista para evitar erros
INSERT INTO public.dperfil (slug, name, description)
VALUES ('SUPRIDO', 'Suprido (Padrão)', 'Usuário padrão do sistema')
ON CONFLICT (slug) DO NOTHING;

-- 2. Insere usuários que estão no Auth mas não no Profiles
INSERT INTO public.profiles (id, email, full_name, created_at, status, matricula, perfil_id)
SELECT 
    au.id,
    au.email,
    -- Tenta pegar o nome dos metadados, senão usa a parte antes do @ do email
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    COALESCE(au.created_at, now()), -- Usa created_at do auth ou data atual
    'ACTIVE',
    'AGUARDANDO', -- Matrícula provisória
    (SELECT id FROM public.dperfil WHERE slug = 'SUPRIDO' LIMIT 1)
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = au.id
);

-- 3. Atualiza permissões de visualização (RLS) para garantir que apareçam na lista
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver todos perfis" ON public.profiles;
CREATE POLICY "Ver todos perfis" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin atualiza perfis" ON public.profiles;
CREATE POLICY "Admin atualiza perfis" ON public.profiles FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        JOIN public.dperfil dp ON p.perfil_id = dp.id 
        WHERE p.id = auth.uid() AND dp.slug IN ('ADMIN', 'SOSFU')
    )
    OR auth.uid() = id -- O próprio usuário também pode editar
);

-- 4. Retorna contagem para confirmação
SELECT count(*) as total_perfis_sincronizados FROM public.profiles;
