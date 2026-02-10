-- Script to populate dperfil with Modern 2026 Roles (Hierarchy: Head + Team)
-- Execute AFTER db_schema.sql
-- WARNING: Resets all user role assignments

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  -- Module: SOSFU
  id_sosfu_gestor UUID := gen_random_uuid();
  id_sosfu_equipe UUID := gen_random_uuid();
  
  -- Module: SEFIN
  id_sefin_gestor UUID := gen_random_uuid();
  id_sefin_equipe UUID := gen_random_uuid();

  -- Module: AJSEFIN
  id_ajsefin_gestor UUID := gen_random_uuid();
  id_ajsefin_equipe UUID := gen_random_uuid();

  -- Module: SGP
  id_sgp_gestor UUID := gen_random_uuid();
  id_sgp_equipe UUID := gen_random_uuid();

  -- Module: SODPA
  id_sodpa_gestor UUID := gen_random_uuid();
  id_sodpa_equipe UUID := gen_random_uuid();

  -- Module: SEAD
  id_sead_gestor UUID := gen_random_uuid();
  id_sead_equipe UUID := gen_random_uuid();

  -- Module: PRESIDENCIA
  id_presidencia_gestor UUID := gen_random_uuid();
  id_presidencia_equipe UUID := gen_random_uuid();

  -- Standard Roles
  id_admin UUID := gen_random_uuid();
  id_gestor UUID := gen_random_uuid(); -- Gestor da Unidade (Standard)
  id_user UUID := gen_random_uuid();   -- Usuário (Standard)

BEGIN
  -- 0. CLEANUP (Wipes roles and unlinks users)
  -- We unlink profiles first to avoid FK constraint violations if ON DELETE CASCADE isn't set
  UPDATE public.profiles SET perfil_id = NULL;
  DELETE FROM public.dperfil;

  -- 1. POPULATE dperfil (Modern Roles)
  INSERT INTO public.dperfil (id, slug, name, description, allowed_modules) VALUES
    -- ADMIN
    (id_admin, 'ADMIN', 'Administrador do Sistema', 'Acesso irrestrito a todas as configurações e módulos.', '["dashboard", "settings", "users_mgmt", "reports", "audit"]'),

    -- SOSFU
    (id_sosfu_gestor, 'SOSFU_GESTOR', 'Gerente SOSFU', 'Gestão completa de suprimentos, aprovação final e relatórios gerenciais.', '["dashboard", "solicitations", "accountability", "reports", "approvals"]'),
    (id_sosfu_equipe, 'SOSFU_EQUIPE', 'Analista SOSFU', 'Análise técnica de processos, validação documental e suporte operacional.', '["dashboard", "solicitations", "accountability"]'),

    -- SEFIN
    (id_sefin_gestor, 'SEFIN_GESTOR', 'Secretário de Finanças', 'Autorização final de pagamentos, gestão orçamentária e visão executiva.', '["dashboard", "payments", "budget", "approvals"]'),
    (id_sefin_equipe, 'SEFIN_EQUIPE', 'Analista Financeiro', 'Execução de pagamentos, análise fiscal e conciliação bancária.', '["dashboard", "payments"]'),

    -- AJSEFIN
    (id_ajsefin_gestor, 'AJSEFIN_GESTOR', 'Consultor Jurídico Chefe', 'Emissão e validação final de pareceres jurídicos.', '["dashboard", "legal_analysis", "approvals"]'),
    (id_ajsefin_equipe, 'AJSEFIN_EQUIPE', 'Analista Jurídico', 'Elaboração de minutas e análise de conformidade legal.', '["dashboard", "legal_analysis"]'),

    -- SGP
    (id_sgp_gestor, 'SGP_GESTOR', 'Secretária de Gestão de Pessoas', 'Validação de dados funcionais e folha de pagamento.', '["dashboard", "people_mgmt", "approvals"]'),
    (id_sgp_equipe, 'SGP_EQUIPE', 'Analista de RH', 'Consulta de vínculos, lotação e dados cadastrais.', '["dashboard", "people_mgmt"]'),

    -- SODPA
    (id_sodpa_gestor, 'SODPA_GESTOR', 'Gerente SODPA', 'Gestão completa de diárias e passagens.', '["dashboard", "travel_mgmt", "approvals"]'),
    (id_sodpa_equipe, 'SODPA_EQUIPE', 'Analista SODPA', 'Análise de solicitações de diárias e cotações.', '["dashboard", "travel_mgmt"]'),

    -- SEAD
    (id_sead_gestor, 'SEAD_GESTOR', 'Secretário de Administração', 'Planejamento administrativo e gestão macro.', '["dashboard", "admin_mgmt", "approvals"]'),
    (id_sead_equipe, 'SEAD_EQUIPE', 'Analista Administrativo', 'Suporte administrativo e gestão de recursos.', '["dashboard", "admin_mgmt"]'),

    -- PRESIDENCIA
    (id_presidencia_gestor, 'PRESIDENCIA_GESTOR', 'Presidente do Tribunal', 'Aprovação final executiva e visão estratégica.', '["dashboard", "executive_view", "approvals"]'),
    (id_presidencia_equipe, 'PRESIDENCIA_EQUIPE', 'Assessor da Presidência', 'Assessoria técnica e preparação de despachos.', '["dashboard", "executive_view"]'),

    -- STANDARD ROLES (Preserved)
    (id_gestor, 'GESTOR', 'Gestor da Unidade', 'Responsável pela unidade solicitante. Aprova solicitações da equipe.', '["dashboard", "team_approvals", "solicitations"]'),
    (id_user, 'USER', 'Usuário', 'Usuário padrão. Pode criar solicitações e prestar contas.', '["dashboard", "my_solicitations", "my_accountability"]');

  RAISE NOTICE 'Seed concluído. Tabela dperfil atualizada com a nova hierarquia (Head + Team). Perfis de usuário foram desvinculados.';
END $$;
