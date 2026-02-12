-- 0. CONFIG & CLEANUP ----------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Limpeza de tabelas (ordem reversa de dependência)
TRUNCATE TABLE public.accountability_items CASCADE;
TRUNCATE TABLE public.accountabilities_sodpa CASCADE;
TRUNCATE TABLE public.accountabilities CASCADE;
TRUNCATE TABLE public.solicitations_sodpa CASCADE;
TRUNCATE TABLE public.solicitations CASCADE;
TRUNCATE TABLE public.sys_user_roles CASCADE;
TRUNCATE TABLE public.elementos_despesa CASCADE; -- Se existir
DELETE FROM public.profiles; 
DELETE FROM public.dperfil;
DELETE FROM public.sys_roles;

-- 1. SEED ROLES (MODERN + LEGACY COMPATIBILITY) -------------------------

-- IDs para Roles
DO $$
DECLARE
  -- Roles IDs
  role_admin UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  role_sosfu_gestor UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
  role_sosfu_equipe UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';
  role_sefin_gestor UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14';
  role_sefin_equipe UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15';
  role_ajsefin_gestor UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16';
  role_sodpa_gestor UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17';
  role_sodpa_equipe UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18';
  role_gestor UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19';
  role_suprido UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20';

  -- User IDs (Mock Users)
  user_admin_id UUID := '00000000-0000-0000-0000-000000000001';
  user_sosfu_id UUID := '00000000-0000-0000-0000-000000000002';
  user_suprido_id UUID := '00000000-0000-0000-0000-000000000003';
  user_sodpa_id UUID := '00000000-0000-0000-0000-000000000004';
  
BEGIN

  -- A. Insert Roles (dperfil & sys_roles)
  
  -- dperfil (Legacy/Current compatibility)
  INSERT INTO public.dperfil (id, slug, name, description, allowed_modules) VALUES
    (role_admin, 'ADMIN', 'Administrador', 'Acesso total', '["dashboard", "settings", "users_mgmt", "reports", "audit"]'),
    (role_sosfu_gestor, 'SOSFU_GESTOR', 'Gestor SOSFU', 'Gestão SOSFU', '["dashboard", "solicitations", "accountability", "reports", "approvals"]'),
    (role_sosfu_equipe, 'SOSFU', 'Técnico SOSFU', 'Técnico SOSFU', '["dashboard", "solicitations", "accountability"]'),
    (role_sodpa_gestor, 'SODPA_GESTOR', 'Gestor SODPA', 'Gestão SODPA', '["dashboard", "travel_mgmt", "approvals"]'),
    (role_sodpa_equipe, 'SODPA', 'Técnico SODPA', 'Técnico SODPA', '["dashboard", "travel_mgmt"]'),
    (role_suprido, 'SUPRIDO', 'Suprido', 'Usuário Padrão', '["dashboard", "my_solicitations", "my_accountability"]');

  -- sys_roles (RBAC V2)
  INSERT INTO public.sys_roles (id, slug, name, description, is_system_role) VALUES
    (role_admin, 'ADMIN', 'Administrador', true),
    (role_sosfu_gestor, 'SOSFU_GESTOR', 'Gestor SOSFU', true),
    (role_sosfu_equipe, 'SOSFU', 'Técnico SOSFU', true),
    (role_sodpa_gestor, 'SODPA_GESTOR', 'Gestor SODPA', true),
    (role_sodpa_equipe, 'SODPA', 'Técnico SODPA', true),
    (role_suprido, 'SUPRIDO', 'Suprido', true)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
  
  -- Seed Elementos de Despesa (Mock)
  INSERT INTO public.elementos_despesa (codigo, descricao, categoria, module, ativo) VALUES 
    ('3.3.90.30', 'Material de Consumo', 'Despesas Correntes', 'SOSFU', true),
    ('3.3.90.39', 'Outros Serviços de Terceiros - PJ', 'Despesas Correntes', 'AMBOS', true),
    ('3.3.90.14', 'Diárias - Civil', 'Despesas Correntes', 'SODPA', true),
    ('3.3.90.33', 'Passagens e Despesas com Locomoção', 'Despesas Correntes', 'SODPA', true)
  ON CONFLICT DO NOTHING;

  -- 2. SEED USERS & PROFILES ---------------------------------------------
  
  -- Para fins de teste, inserimos direto na public.profiles.
  -- NOTA: Isso não cria o usuário no Auth (GoTrue). O login via UI não funcionará
  -- a menos que o usuário exista no Auth com este ID.
  -- Para testes E2E/Locais que ignoram Auth ou usam Mock Auth, isso funciona.
  -- Se precisar de Auth real, use a API do Supabase ou scripts de admin.
  
  -- Admin User
  INSERT INTO public.profiles (id, full_name, email, cpf, matricula, cargo, perfil_id, status)
  VALUES (user_admin_id, 'Administrador do Sistema', 'admin@tjpa.jus.br', '00000000000', '1', 'ANALISTA', role_admin, 'ACTIVE')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- SOSFU Manager
  INSERT INTO public.profiles (id, full_name, email, cpf, matricula, cargo, perfil_id, status)
  VALUES (user_sosfu_id, 'Gestor SOSFU', 'sosfu@tjpa.jus.br', '11111111111', '2', 'GESTOR', role_sosfu_gestor, 'ACTIVE')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- Suprido (Requester)
  INSERT INTO public.profiles (id, full_name, email, cpf, matricula, cargo, perfil_id, status, lotacao, municipio)
  VALUES (user_suprido_id, 'João Suprido', 'suprido@tjpa.jus.br', '22222222222', '3', 'TÉCNICO', role_suprido, 'ACTIVE', 'Vara Única', 'Belém')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- SODPA Manager
  INSERT INTO public.profiles (id, full_name, email, cpf, matricula, cargo, perfil_id, status)
  VALUES (user_sodpa_id, 'Gestor SODPA', 'sodpa@tjpa.jus.br', '33333333333', '4', 'GESTOR', role_sodpa_gestor, 'ACTIVE')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- Assign Roles (sys_user_roles)
  INSERT INTO public.sys_user_roles (user_id, role_id, granted_by, is_active) VALUES
    (user_admin_id, role_admin, user_admin_id, true),
    (user_sosfu_id, role_sosfu_gestor, user_admin_id, true),
    (user_suprido_id, role_suprido, user_admin_id, true),
    (user_sodpa_id, role_sodpa_gestor, user_admin_id, true)
  ON CONFLICT DO NOTHING;

  -- 3. SEED FUNCTIONAL DATA (SOLICITATIONS) ------------------------------
  
  -- SOSFU Solicitations
  INSERT INTO public.solicitations (id, process_number, beneficiary, unit, value, status, user_id, date, justification) VALUES
    (gen_random_uuid(), 'P-2026/001', 'João Suprido', 'Vara Única', 1500.00, 'PENDING', user_suprido_id, CURRENT_DATE, 'Compra de material de expediente.'),
    (gen_random_uuid(), 'P-2026/002', 'João Suprido', 'Vara Única', 3000.00, 'APPROVED', user_suprido_id, CURRENT_DATE - 5, 'Manutenção de Ar Condicionado.'),
    (gen_random_uuid(), 'P-2026/003', 'João Suprido', 'Vara Única', 5000.00, 'PAID', user_suprido_id, CURRENT_DATE - 10, 'Aquisição de equipamentos de TI.');

  -- SODPA Solicitations (Tabela específica)
  -- Assumindo que solicitations_sodpa existe (se não existir, o script falhará, mas é esperado se o módulo existe)
  BEGIN
    INSERT INTO public.solicitations_sodpa (process_number, beneficiary_name, beneficiary_cpf, beneficiary_cargo, destination, start_date, end_date, days_count, daily_rate, total_value, status) VALUES
      ('D-2026/001', 'João Suprido', '22222222222', 'TÉCNICO', 'Santarém', CURRENT_DATE + 2, CURRENT_DATE + 5, 3.0, 500.00, 1500.00, 'WAITING'),
      ('D-2026/002', 'Gestor SOSFU', '11111111111', 'GESTOR', 'Marabá', CURRENT_DATE + 10, CURRENT_DATE + 12, 2.0, 600.00, 1200.00, 'APPROVED');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Tabela solicitations_sodpa não encontrada ou erro na inserção. Pulando...';
  END;

  -- 4. SEED ACCOUNTABILITY -----------------------------------------------
  
  -- Accountability para a solicitação PAGA
  -- Precisamos pegar o ID da solicitação recém criada.
  INSERT INTO public.accountabilities (process_number, value, deadline, status, requester_id, total_spent, balance)
  SELECT 
    process_number, value, CURRENT_DATE + 30, 'DRAFT', user_id, 0, value
  FROM public.solicitations 
  WHERE status = 'PAID';

  RAISE NOTICE 'Seed Lightweight concluído com sucesso!';

END $$;
