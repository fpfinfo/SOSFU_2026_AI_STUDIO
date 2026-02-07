-- EXECUTE ESTE SCRIPT NO 'SQL EDITOR' DO SUPABASE

-- 1. Garante que o papel SUPRIDO existe na tabela de perfis
INSERT INTO public.dperfil (slug, name, description, allowed_modules)
VALUES ('SUPRIDO', 'Suprido', 'Usuário padrão. Acesso ao Portal do Suprido.', '["suprido_dashboard"]')
ON CONFLICT (slug) DO NOTHING;

-- 2. Atualiza a função trigger handle_new_user
-- Isso substitui qualquer lógica anterior que pudesse estar atribuindo SOSFU ou SERVIDOR.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id UUID;
  v_role_slug TEXT;
BEGIN
  -- REGRA DE OURO: Todo novo usuário é SUPRIDO.
  v_role_slug := 'SUPRIDO';

  -- Exceção apenas para o administrador mestre de sistema (fallback)
  IF new.email = 'admin@sistema' THEN
    v_role_slug := 'ADMIN';
  END IF;

  -- Busca o ID do perfil SUPRIDO
  SELECT id INTO v_role_id FROM public.dperfil WHERE slug = v_role_slug LIMIT 1;

  -- Se por algum motivo catastrófico SUPRIDO não existir, tenta pegar qualquer um seguro (não ADMIN/SOSFU)
  IF v_role_id IS NULL THEN
      SELECT id INTO v_role_id FROM public.dperfil WHERE slug NOT IN ('ADMIN', 'SOSFU', 'SEFIN') LIMIT 1;
  END IF;

  -- Insere o perfil
  INSERT INTO public.profiles (id, email, full_name, matricula, avatar_url, pin, perfil_id, status)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'AGUARDANDO', -- Indica que precisa completar cadastro
    'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/avatar_placeholder.png',
    '1234',
    v_role_id,
    'ACTIVE'
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. (OPCIONAL) Correção para o usuário criado recentemente que ficou errado
-- Atualiza o último usuário criado para SUPRIDO se ele não tiver cargo definido e não for admin hardcoded
DO $$
DECLARE
    v_last_user_id UUID;
    v_suprido_id UUID;
BEGIN
    SELECT id INTO v_suprido_id FROM public.dperfil WHERE slug = 'SUPRIDO';
    
    -- Pega o usuário mais recente criado (assumindo que seja o problemático)
    SELECT id INTO v_last_user_id FROM public.profiles 
    ORDER BY created_at DESC LIMIT 1;
    
    IF v_last_user_id IS NOT NULL AND v_suprido_id IS NOT NULL THEN
        -- Só atualiza se ele estiver como SOSFU ou SERVIDOR indevidamente
        UPDATE public.profiles 
        SET perfil_id = v_suprido_id 
        WHERE id = v_last_user_id 
          AND email NOT ILIKE 'admin%' 
          AND email NOT ILIKE '%fabio.freitas%'; -- Preserva admins conhecidos
          
        RAISE NOTICE 'Usuário recente corrigido para perfil SUPRIDO.';
    END IF;
END $$;