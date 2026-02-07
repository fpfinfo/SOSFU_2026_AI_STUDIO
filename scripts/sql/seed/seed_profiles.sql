-- Script para popular dperfil (Papéis do Sistema)
-- Execute este script APÓS rodar o db_schema.sql
-- ESTE SCRIPT APAGA TODOS OS USUÁRIOS EXISTENTES!

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  -- IDs para os perfis
  id_admin UUID := gen_random_uuid();
  id_presidencia UUID := gen_random_uuid();
  id_sefin UUID := gen_random_uuid();
  id_ajsefin UUID := gen_random_uuid();
  id_sgp UUID := gen_random_uuid();
  id_sosfu UUID := gen_random_uuid();
  id_servidor UUID := gen_random_uuid();

BEGIN
  -- 0. LIMPEZA TOTAL (ATENÇÃO: APAGA TODOS OS USUÁRIOS)
  -- A ordem importa para respeitar as Foreign Keys
  DELETE FROM public.accountabilities;
  DELETE FROM public.solicitations;
  DELETE FROM public.profiles;
  DELETE FROM public.dperfil;
  DELETE FROM auth.users;

  -- 1. POPULAR TABELA dperfil (Perfis de Acesso)
  INSERT INTO public.dperfil (id, slug, name, description, allowed_modules) VALUES
  (id_admin, 'ADMIN', 'Administrador', 'Acesso total ao sistema e configurações.', '["dashboard", "solicitations", "accountability", "reports", "settings", "users_mgmt"]'),
  (id_presidencia, 'PRESIDENCIA', 'Presidência', 'Aprovação final e visualização executiva.', '["dashboard", "reports", "approvals"]'),
  (id_sefin, 'SEFIN', 'Secretaria de Finanças', 'Gestão orçamentária e pagamentos.', '["dashboard", "solicitations", "payments", "reports"]'),
  (id_ajsefin, 'AJSEFIN', 'Apoio Jurídico SEFIN', 'Análise jurídica de processos financeiros.', '["dashboard", "solicitations", "legal_analysis"]'),
  (id_sgp, 'SGP', 'Gestão de Pessoas', 'Consulta de dados funcionais e folha.', '["dashboard", "people_mgmt"]'),
  (id_sosfu, 'SOSFU', 'Técnico SOSFU', 'Análise técnica de suprimentos de fundos.', '["dashboard", "solicitations", "accountability", "reports"]'),
  (id_servidor, 'SERVIDOR', 'Servidor', 'Perfil padrão para solicitação e prestação de contas.', '["dashboard", "my_solicitations", "my_accountability"]');

  RAISE NOTICE 'Seed concluído. Tabela dperfil populada. Todos os usuários e dados foram removidos para inserção manual.';
END $$;