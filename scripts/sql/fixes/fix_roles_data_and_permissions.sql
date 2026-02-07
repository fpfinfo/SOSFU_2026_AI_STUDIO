-- 1. POPULAR TABELA dperfil (Garante que os opções apareçam no dropdown)
-- Insere apenas se não existir (ON CONFLICT DO NOTHING)
INSERT INTO public.dperfil (slug, name, description) VALUES
('ADMIN', 'Administrador', 'Acesso total ao sistema'),
('SOSFU', 'Equipe Técnica SOSFU', 'Análise e gestão de suprimentos'),
('GESTOR', 'Gestor da Unidade', 'Aprova solicitações locais'),
('SUPRIDO', 'Suprido (Padrão)', 'Solicita e presta contas'),
('SEFIN', 'Financeiro', 'Gestão orçamentária'),
('AJSEFIN', 'Jurídico', 'Análise jurídica'),
('SGP', 'Gestão de Pessoas', 'Consulta de vínculo'),
('PRESIDENCIA', 'Presidência', 'Aprovações superiores')
ON CONFLICT (slug) DO NOTHING;

-- 2. CORRIGIR PERMISSÃO DE SALVAR (UPDATE) NA TABELA PROFILES
-- Atualmente, o usuário só pode editar o próprio perfil. Precisamos permitir que ADMIN/SOSFU editem outros.

-- Primeiro, removemos políticas antigas conflitantes de UPDATE
DROP POLICY IF EXISTS "Usuários editam próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admin pode atualizar perfis" ON public.profiles;

-- Cria política: Usuário comum edita a si mesmo
CREATE POLICY "Usuários editam próprio perfil"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Cria política: Admin e SOSFU podem editar QUALQUER perfil
-- A verificação é feita checando se o usuário logado (auth.uid()) possui um perfil_id que corresponde a ADMIN ou SOSFU na tabela dperfil
CREATE POLICY "Staff pode atualizar perfis"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.dperfil dp ON p.perfil_id = dp.id
    WHERE p.id = auth.uid() 
      AND dp.slug IN ('ADMIN', 'SOSFU', 'SOSFU_TEC') -- Lista de roles com poder de gestão
  )
);

-- 3. GARANTIR VISIBILIDADE TOTAL DE DPERFIL
ALTER TABLE public.dperfil DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.dperfil TO authenticated, anon;

-- Confirmação
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT count(*) INTO v_count FROM public.dperfil;
  RAISE NOTICE 'Sucesso! Tabela dperfil agora tem % registros.', v_count;
END $$;