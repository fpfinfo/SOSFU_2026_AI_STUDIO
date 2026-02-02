-- Script para popular a tabela profiles com usuários fictícios e o usuário ADMIN principal
-- Execute este script APÓS rodar o db_schema.sql

-- Garante pgcrypto para hash de senha
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id UUID;
  v_password_hash TEXT;
  v_first_names TEXT[] := ARRAY['João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Lucia', 'Fernando', 'Patricia', 'Roberto', 'Camila', 'Bruno', 'Juliana', 'Ricardo', 'Fernanda', 'Diego', 'Amanda', 'Marcelo', 'Larissa', 'Eduardo', 'Bianca', 'Fábio', 'Renata', 'Gustavo', 'Letícia', 'André'];
  v_last_names TEXT[] := ARRAY['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Lima', 'Ferreira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Alves', 'Carvalho', 'Araujo', 'Ribeiro', 'Lopes', 'Moura', 'Teixeira', 'Cardoso', 'Gomes', 'Barbosa', 'Martins', 'Rocha', 'Dias', 'Moreira'];
  v_cargos TEXT[] := ARRAY['Analista Judiciário', 'Técnico Judiciário', 'Auxiliar Judiciário', 'Diretor de Secretaria', 'Assessor de Gabinete', 'Oficial de Justiça', 'Chefe de Setor'];
  v_lotacoes TEXT[] := ARRAY['Vara Única', '1ª Vara Cível', '2ª Vara Criminal', 'Secretaria Administrativa', 'Gabinete Desembargador', 'Presidência', 'Setor de Protocolo', 'Arquivo Geral', 'Departamento Financeiro', 'Contabilidade'];
  v_municipios TEXT[] := ARRAY['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Castanhal', 'Parauapebas', 'Altamira', 'Itaituba', 'Redenção', 'Tucuruí'];
  v_roles TEXT[] := ARRAY['SERVIDOR', 'SERVIDOR', 'SERVIDOR', 'SERVIDOR', 'SERVIDOR', 'SOSFU', 'SEFIN', 'PRESIDENCIA', 'ADMIN'];
  v_vinculos TEXT[] := ARRAY['Efetivo', 'Efetivo', 'Efetivo', 'Efetivo', 'Comissionado', 'Cedido'];
  
  v_first_name TEXT;
  v_last_name TEXT;
  v_full_name TEXT;
  v_email TEXT;
  v_role TEXT;
  i INT;
BEGIN
  -- 0. LIMPEZA SEGURA
  -- Limpa profiles antes para evitar erros de FK se o CASCADE falhar ou travar
  DELETE FROM public.profiles;
  DELETE FROM auth.users;

  -- 1. CALCULAR HASH DA SENHA (123456)
  -- A função crypt procura no search_path padrão.
  v_password_hash := crypt('123456', gen_salt('bf'));

  -- 2. LOOP: Criar 50 Usuários Aleatórios
  FOR i IN 1..50 LOOP
    v_first_name := v_first_names[1 + floor(random() * array_length(v_first_names, 1))::int];
    v_last_name := v_last_names[1 + floor(random() * array_length(v_last_names, 1))::int];
    v_full_name := v_first_name || ' ' || v_last_name;
    v_email := lower(v_first_name) || '.' || lower(v_last_name) || i || '@tjpa.jus.br';
    v_role := v_roles[1 + floor(random() * array_length(v_roles, 1))::int];
    
    v_user_id := gen_random_uuid();
    
    -- Inserir Usuário no Auth
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated', v_email, v_password_hash, now(), '{"provider": "email", "providers": ["email"]}', json_build_object('full_name', v_full_name), now(), now(), false
    );

    -- Inserir Identidade (Importante para o login funcionar corretamente via API)
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id, v_user_id::text, json_build_object('sub', v_user_id::text, 'email', v_email), 'email', now(), now(), now()
    );

    -- Atualizar Perfil (Registro já criado pelo trigger handle_new_user)
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
      role = v_role, status = 'ACTIVE', is_verified = true, pin = '1234',
      avatar_url = 'https://ui-avatars.com/api/?name=' || replace(v_full_name, ' ', '+') || '&background=random&color=fff'
    WHERE id = v_user_id;
  END LOOP;

  -- 3. CRIAR USUÁRIO ADMIN: Fabio Freitas
  v_user_id := gen_random_uuid();
  v_email := 'fabio.freitas@tjpa.jus.br';
  
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
    role = 'ADMIN',
    status = 'ACTIVE',
    is_verified = true,
    pin = '1234',
    avatar_url = 'https://picsum.photos/id/1005/200/200'
  WHERE id = v_user_id;

  RAISE NOTICE 'Seed concluído com sucesso. Usuário Fabio Freitas recriado. Senha padrão: 123456';
END $$;