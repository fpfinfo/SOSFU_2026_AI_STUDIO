
-- Tabela de Perfis de Sistema (Lookup)
CREATE TABLE IF NOT EXISTS public.system_roles (
  id TEXT PRIMARY KEY, -- 'ADMIN', 'SOSFU', 'DIARIAS', 'REEMBOLSOS', 'USUÁRIO'
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color_class TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.system_roles ENABLE ROW LEVEL SECURITY;

-- Política de Leitura (Todos os autenticados podem ver os perfis disponíveis)
CREATE POLICY "Permitir leitura de perfis para todos" ON public.system_roles
FOR SELECT TO authenticated USING (true);

-- Inserção dos perfis padrão conforme Imagem 2
INSERT INTO public.system_roles (id, name, description, icon, color_class) VALUES
('ADMIN', 'ADMINISTRADOR', 'Acesso total a todos os módulos e auditoria master.', 'fa-shield-halved', 'bg-red-500'),
('SOSFU', 'GESTOR SUPRIMENTOS', 'Acesso ao fluxo de Suprimento de Fundos.', 'fa-bolt-lightning', 'bg-blue-600'),
('DIARIAS', 'GESTOR DIÁRIAS', 'Acesso ao fluxo de Diárias e Passagens.', 'fa-plane', 'bg-sky-500'),
('REEMBOLSOS', 'GESTOR REEMBOLSOS', 'Acesso ao fluxo de Ressarcimentos.', 'fa-receipt', 'bg-teal-500'),
('USUÁRIO', 'USUÁRIO PADRÃO', 'Acesso apenas ao seu próprio Portal de Despesas.', 'fa-user', 'bg-slate-300')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  description = EXCLUDED.description, 
  icon = EXCLUDED.icon, 
  color_class = EXCLUDED.color_class;

-- Adicionar Chave Estrangeira na tabela de profiles para garantir integridade
-- Primeiro garantimos que a coluna existe (ela já existe no seu dump inicial como system_role)
-- Vamos criar um relacionamento formal se desejar, mas para manter compatibilidade com o código atual
-- que usa strings, apenas garantimos que os dados batem.

-- Se quiser transformar em FK real:
-- ALTER TABLE public.profiles ADD CONSTRAINT fk_system_role FOREIGN KEY (system_role) REFERENCES public.system_roles(id);
