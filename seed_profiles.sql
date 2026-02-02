-- Script para popular dperfil e profiles
-- Execute este script APÓS rodar o db_schema.sql

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

  -- Variáveis de loop
  v_user_id UUID;
  v_password_hash TEXT;
  v_selected_role_id UUID;
  v_random_role_slug TEXT;
  
  -- Arrays de dados fictícios
  v_first_names TEXT[] := ARRAY['João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Lucia', 'Fernando', 'Patricia', 'Roberto', 'Camila', 'Bruno', 'Juliana', 'Ricardo', 'Fernanda', 'Diego', 'Amanda', 'Marcelo', 'Larissa', 'Eduardo', 'Bianca', 'Fábio', 'Renata', 'Gustavo', 'Letícia', 'André'];
  v_last_names TEXT[] := ARRAY['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Lima', 'Ferreira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Alves', 'Carvalho', 'Araujo', 'Ribeiro', 'Lopes', 'Moura', 'Teixeira', 'Cardoso', 'Gomes', 'Barbosa', 'Martins', 'Rocha', 'Dias', 'Moreira'];
  v_cargos TEXT[] := ARRAY['Analista Judiciário', 'Técnico Judiciário', 'Auxiliar Judiciário', 'Diretor de Secretaria', 'Assessor de Gabinete', 'Oficial de Justiça', 'Chefe de Setor'];
  v_lotacoes TEXT[] := ARRAY['Vara Única', '1ª Vara Cível', '2ª Vara Criminal', 'Secretaria Administrativa', 'Gabinete Desembargador', 'Presidência', 'Setor de Protocolo', 'Arquivo Geral', 'Departamento Financeiro', 'Contabilidade'];
  v_municipios TEXT[] := ARRAY['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Castanhal', 'Parauapebas', 'Altamira', 'Itaituba', 'Redenção', 'Tucuruí'];
  v_roles_slugs TEXT[] := ARRAY['SERVIDOR', 'SERVIDOR', 'SERVIDOR', 'SERVIDOR', 'SERVIDOR', 'SOSFU', 'SEFIN', 'PRESIDENCIA', 'ADMIN'];
  v_vinculos TEXT[] := ARRAY['Efetivo', 'Efetivo', 'Efetivo', 'Efetivo', 'Comissionado', 'Cedido'];
  
  v_first_name TEXT;
  v_last_name TEXT;
  v_full_name TEXT;
  v_email TEXT;
  i INT;
BEGIN
  -- 0. LIMPEZA SEGURA
  DELETE FROM public.profiles;
  DELETE FROM public.dperfil;
  DELETE FROM auth.users;

  -- 1. POPULAR TABELA dperfil
  -- Definição de módulos padrão (JSON)
  INSERT INTO public.dperfil (id, slug, name, description, allowed_modules) VALUES
  (id_admin, 'ADMIN', 'Administrador', 'Acesso total ao sistema e configurações.', '["dashboard", "solicitations", "accountability", "reports", "settings", "users_mgmt"]'),
  (id_presidencia, 'PRESIDENCIA', 'Presidência', 'Aprovação final e visualização executiva.', '["dashboard", "reports", "approvals"]'),
  (id_sefin, 'SEFIN', 'Secretaria de Finanças', 'Gestão orçamentária e pagamentos.', '["dashboard", "solicitations", "payments", "reports"]'),
  (id_ajsefin, 'AJSEFIN', 'Apoio Jurídico SEFIN', 'Análise jurídica de processos financeiros.', '["dashboard", "solicitations", "legal_analysis"]'),
  (id_sgp, 'SGP', 'Gestão de Pessoas', 'Consulta de dados funcionais e folha.', '["dashboard", "people_mgmt"]'),
  (id_sosfu, 'SOSFU', 'Técnico SOSFU', 'Análise técnica de suprimentos de fundos.', '["dashboard", "solicitations", "accountability", "reports"]'),
  (id_servidor, 'SERVIDOR', 'Servidor', 'Perfil padrão para solicitação e prestação de contas.', '["dashboard", "my_solicitations", "my_accountability"]');

  -- 2. CALCULAR HASH DA SENHA
  v_password_hash := crypt('123456', gen_salt('bf'));

  -- 3. LOOP: Criar 50 Usuários Aleatórios
  FOR i IN 1..50 LOOP
    v_first_name := v_first_names[1 + floor(random() * array_length(v_first_names, 1))::int];
    v_last_name := v_last_names[1 + floor(random() * array_length(v_last_names, 1))::int];
    v_full_name := v_first_name || ' ' || v_last_name;
    v_email := lower(v_first_name) || '.' || lower(v_last_name) || i || '@tjpa.jus.br';
    
    -- Seleciona um slug aleatório
    v_random_role_slug := v_roles_slugs[1 + floor(random() * array_length(v_roles_slugs, 1))::int];
    
    -- Busca o ID correspondente ao slug na tabela dperfil
    SELECT id INTO v_selected_role_id FROM public.dperfil WHERE slug = v_random_role_slug;
    
    v_user_id := gen_random_uuid();
    
    -- Inserir Usuário no Auth
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated', v_email, v_password_hash, now(), '{"provider": "email", "providers": ["email"]}', json_build_object('full_name', v_full_name), now(), now(), false
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id, v_user_id::text, json_build_object('sub', v_user_id::text, 'email', v_email), 'email', now(), now(), now()
    );

    -- Atualizar Perfil (vinculando ao dperfil)
    UPDATE public.profiles SET
      updated_at = now(),
      cpf = lpad(floor(random() * 99999999999)::text, 11, '0'),
      matricula = lpad(floor(random() * 999999)::text, 6, '0'),
      cargo = v_cargos[1 + floor(random() * array_length(v_cargos, 1))::int],
      vinculo = v_vinculos[1 + floor(random() * array_length(v_vinculos, 1))::int],
      telefone = '(91) 9' || lpad(floor(random() * 99999999)::text, 8, '0'),
      lotacao = v_lotacoes[1 + floor(random() * array_length(v_lotacoes, 1))::int],
      municipio = v_municipios[1 + floor(random() * array_length(v_municipios, 1))::int],
      gestor_nome = 'Juiz ' || v_last_names[1 + floor(random() * array_length(v_last_names, 1))::int],
      gestor_email = 'gestor.' || lower(v_last_name) || '@tjpa.jus.br',
      banco = CASE WHEN random() > 0.5 THEN 'Banco do Brasil' ELSE 'Banpará' END,
      agencia = lpad(floor(random() * 9999)::text, 4, '0') || '-' || floor(random() * 9)::text,
      conta_corrente = lpad(floor(random() * 99999)::text, 5, '0') || '-' || floor(random() * 9)::text,
      
      perfil_id = v_selected_role_id, -- AQUI ESTÁ O VÍNCULO CORRETO
      
      status = 'ACTIVE', is_verified = true, pin = '1234',
      avatar_url = 'https://ui-avatars.com/api/?name=' || replace(v_full_name, ' ', '+') || '&background=random&color=fff'
    WHERE id = v_user_id;
  END LOOP;

  -- 4. CRIAR USUÁRIO ADMIN: Fabio Pereira de Freitas
  v_user_id := gen_random_uuid();
  v_email := 'fabio.pereira@tjpa.jus.br'; -- Email corrigido conforme solicitado
  
  INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated', v_email, v_password_hash, now(), '{"provider": "email", "providers": ["email"]}', json_build_object('full_name', 'Fabio Pereira de Freitas'), now(), now(), false
  );

  INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id, v_user_id::text, json_build_object('sub', v_user_id::text, 'email', v_email), 'email', now(), now(), now()
    );

  UPDATE public.profiles SET
    updated_at = now(),
    full_name = 'Fabio Pereira de Freitas',
    cpf = '123.456.789-00',
    matricula = '203424',
    cargo = 'Analista Judiciário - Governança',
    vinculo = 'Efetivo',
    telefone = '(91) 98888-7777',
    lotacao = 'Secretaria de Planejamento',
    municipio = 'Belém',
    gestor_nome = 'Presidente do TJPA',
    gestor_email = 'presidencia@tjpa.jus.br',
    banco = 'Banpará',
    agencia = '0001-5',
    conta_corrente = '12345-X',
    
    perfil_id = id_admin, -- VINCULA AO PERFIL ADMIN
    
    status = 'ACTIVE',
    is_verified = true,
    pin = '1234',
    avatar_url = 'https://picsum.photos/id/1005/200/200'
  WHERE id = v_user_id;

  RAISE NOTICE 'Seed concluído. Tabela dperfil criada e populada. Usuário fabio.pereira@tjpa.jus.br criado.';
END $$;