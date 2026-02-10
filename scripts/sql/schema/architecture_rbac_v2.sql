-- ==============================================================================
-- ARQUITETURA DE DADOS V2 - CONTROLE DE ACESSO RBAC (SOSFU TJPA)
-- Autor: Arquiteto de Dados Sênior
-- Objetivo: Suportar múltiplos papéis, auditabilidade e integração com DW Legado
-- ==============================================================================

-- 1. TABELA LEGADA (Simulação do Data Warehouse / Tabela Mestra)
-- Esta tabela é "Read-Only" para o sistema SOSFU, populada por integração externa.
CREATE TABLE IF NOT EXISTS public.dw_servidores (
    matricula TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cpf TEXT UNIQUE, -- Dado sensível, idealmente mascarado ou em tabela apartada
    cargo_efetivo TEXT,
    lotacao_sigla TEXT,
    lotacao_descricao TEXT,
    email_institucional TEXT,
    status_servidor TEXT DEFAULT 'ATIVO' -- ATIVO, APOSENTADO, EXONERADO
);

-- Habilita RLS para leitura
ALTER TABLE public.dw_servidores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura Pública Interna" ON public.dw_servidores FOR SELECT USING (auth.role() = 'authenticated');


-- 2. CATÁLOGO DE PAPÉIS (Refatoração da tabela dperfil)
-- Define QUAIS papéis existem e o que eles podem acessar (Modularidade)
CREATE TABLE IF NOT EXISTS public.sys_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL, -- Ex: 'SUPRIDO', 'GESTOR', 'SOSFU', 'SEFIN'
    name TEXT NOT NULL,        -- Ex: 'Suprido (Padrão)', 'Gestor de Unidade'
    description TEXT,
    
    -- MODULARIDADE: Define quais módulos/rotas este papel acessa
    -- Ex: {"modules": ["dashboard", "approve_requests"], "access_level": 1}
    config JSONB DEFAULT '{}'::jsonb,
    
    is_system_role BOOLEAN DEFAULT FALSE -- Se TRUE, não pode ser deletado
);

-- Seed Inicial dos Papéis
INSERT INTO public.sys_roles (slug, name, description, is_system_role) VALUES
('SUPRIDO', 'Suprido', 'Perfil padrão. Pode solicitar suprimentos e prestar contas.', TRUE),
('GESTOR', 'Gestor', 'Responsável pela aprovação de solicitações da unidade.', TRUE),
('SOSFU', 'Técnico SOSFU', 'Equipe técnica. Análise processual e conformidade.', TRUE),
('SEFIN', 'Financeiro (SEFIN)', 'Liberação orçamentária e pagamentos.', TRUE),
('AJSEFIN', 'Jurídico (AJSEFIN)', 'Pareceres jurídicos sobre concessões.', TRUE),
('SGP', 'Gestão de Pessoas', 'Consulta de dados funcionais.', TRUE),
('ADMIN', 'Administrador', 'Acesso total ao sistema.', TRUE)
ON CONFLICT (slug) DO NOTHING;


-- 3. TABELA ASSOCIATIVA (USER_ROLES) - O Coração do RBAC
-- Resolve: Múltiplos Papéis + Auditabilidade
CREATE TABLE IF NOT EXISTS public.sys_user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Vínculo com o Usuário (Tabela profiles existente)
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Vínculo com o Papel
    role_id UUID REFERENCES public.sys_roles(id) ON DELETE RESTRICT NOT NULL,
    
    -- AUDITABILIDADE: Quem deu o papel e quando
    granted_by UUID REFERENCES public.profiles(id), -- Quem concedeu
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Controle de Vigência (Histórico)
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES public.profiles(id),
    
    -- Garante que um usuário só tenha um registro ATIVO por papel
    CONSTRAINT uk_user_active_role UNIQUE NULLS NOT DISTINCT (user_id, role_id, (CASE WHEN is_active THEN TRUE ELSE NULL END))
);

ALTER TABLE public.sys_user_roles ENABLE ROW LEVEL SECURITY;
-- Política: Todos podem ver seus próprios papéis
CREATE POLICY "Ver proprios papeis" ON public.sys_user_roles FOR SELECT USING (user_id = auth.uid());
-- Política: Admin/SOSFU podem ver tudo (simplificada)
CREATE POLICY "Admin ver tudo" ON public.sys_user_roles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.sys_user_rolesur 
        JOIN public.sys_roles r ON ur.role_id = r.id 
        WHERE ur.user_id = auth.uid() AND r.slug IN ('ADMIN', 'SOSFU') AND ur.is_active = TRUE
    )
);


-- 4. VIEW UNIFICADA (Para facilitar o Frontend)
-- Retorna os dados do usuário + lista de papéis em um array JSON
CREATE OR REPLACE VIEW public.v_users_with_roles AS
SELECT 
    p.id as user_id,
    p.full_name,
    p.email,
    p.matricula,
    -- Dados vindos do DW (via Join na matricula)
    dw.cargo_efetivo as cargo_dw,
    dw.lotacao_descricao as lotacao_dw,
    -- Agregação dos papéis ativos
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'role_slug', r.slug,
                'role_name', r.name,
                'granted_at', ur.granted_at
            )
        ) FILTER (WHERE r.id IS NOT NULL), 
        '[]'::jsonb
    ) as active_roles
FROM public.profiles p
LEFT JOIN public.dw_servidores dw ON p.matricula = dw.matricula
LEFT JOIN public.sys_user_roles ur ON p.id = ur.user_id AND ur.is_active = TRUE
LEFT JOIN public.sys_roles r ON ur.role_id = r.id
GROUP BY p.id, p.full_name, p.email, p.matricula, dw.cargo_efetivo, dw.lotacao_descricao;


-- 5. LÓGICA DE NEGÓCIO (PROCEDURE)
-- Garante a regra: "Todo Gestor deve ser também um Suprido"
CREATE OR REPLACE FUNCTION public.grant_role_to_user(
    p_user_id UUID,
    p_role_slug TEXT,
    p_granter_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_role_id UUID;
    v_suprido_id UUID;
BEGIN
    -- 1. Busca ID do Papel Solicitado
    SELECT id INTO v_role_id FROM public.sys_roles WHERE slug = p_role_slug;
    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Papel % não encontrado.', p_role_slug;
    END IF;

    -- 2. Insere o Papel Solicitado
    INSERT INTO public.sys_user_roles (user_id, role_id, granted_by)
    VALUES (p_user_id, v_role_id, p_granter_id)
    ON CONFLICT DO NOTHING; -- Se já tiver, ignora

    -- 3. Regra de Negócio: Se for GESTOR ou ADMIN, garante que tenha SUPRIDO
    IF p_role_slug IN ('GESTOR', 'ADMIN', 'SEFIN') THEN
        SELECT id INTO v_suprido_id FROM public.sys_roles WHERE slug = 'SUPRIDO';
        
        -- Verifica se já tem o papel de SUPRIDO
        IF NOT EXISTS (
            SELECT 1 FROM public.sys_user_roles 
            WHERE user_id = p_user_id AND role_id = v_suprido_id AND is_active = TRUE
        ) THEN
            INSERT INTO public.sys_user_roles (user_id, role_id, granted_by)
            VALUES (p_user_id, v_suprido_id, p_granter_id); -- Sistema atribui
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. TRIGGER PARA NOVOS USUÁRIOS
-- Todo novo usuário criado ganha automaticamente o perfil 'SUPRIDO'
CREATE OR REPLACE FUNCTION public.on_profile_created_assign_default_role()
RETURNS TRIGGER AS $$
DECLARE
    v_suprido_id UUID;
BEGIN
    SELECT id INTO v_suprido_id FROM public.sys_roles WHERE slug = 'SUPRIDO';
    
    IF v_suprido_id IS NOT NULL THEN
        INSERT INTO public.sys_user_roles (user_id, role_id, granted_by)
        VALUES (new.id, v_suprido_id, NULL); -- NULL = Sistema
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger acoplado à tabela profiles existente
DROP TRIGGER IF EXISTS trg_new_profile_role ON public.profiles;
CREATE TRIGGER trg_new_profile_role
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.on_profile_created_assign_default_role();
