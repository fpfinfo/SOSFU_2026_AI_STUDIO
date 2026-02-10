-- =============================================================
-- Tabela: dUnidadesAdmin — Unidades Administrativas do TJPA
-- =============================================================
-- O TJPA é composto por dois eixos organizacionais:
--   1) Comarcas (jurisdicionais)  → tabela dcomarcas
--   2) Unidades Administrativas   → tabela dUnidadesAdmin (ESTA)
--
-- Unidades administrativas incluem Secretarias, Departamentos,
-- Coordenadorias, Serviços e Assessorias. Cada uma possui gestor
-- e equipe, e os servidores podem ser lotados nelas.
-- =============================================================

CREATE TABLE IF NOT EXISTS public."dUnidadesAdmin" (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  sigla TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'Secretaria',
    'Departamento',
    'Coordenadoria',
    'Serviço',
    'Assessoria',
    'Seção',
    'Gabinete',
    'Outro'
  )),
  vinculacao TEXT,                  -- Órgão superior (Ex: "SEFIN", "Presidência")
  responsavel TEXT,                 -- Nome do titular
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para coordenadas
CREATE INDEX IF NOT EXISTS idx_dunidadesadmin_coords
  ON public."dUnidadesAdmin" (latitude, longitude)
  WHERE latitude IS NOT NULL;

-- Index para busca por tipo
CREATE INDEX IF NOT EXISTS idx_dunidadesadmin_tipo
  ON public."dUnidadesAdmin" (tipo);

-- RLS
ALTER TABLE public."dUnidadesAdmin" ENABLE ROW LEVEL SECURITY;

-- Leitura: todos autenticados
CREATE POLICY "Unidades visíveis para autenticados"
  ON public."dUnidadesAdmin" FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: qualquer autenticado pode criar
CREATE POLICY "Unidades inseríveis por autenticados"
  ON public."dUnidadesAdmin" FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: qualquer autenticado pode editar
CREATE POLICY "Unidades editáveis por autenticados"
  ON public."dUnidadesAdmin" FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: qualquer autenticado pode excluir
CREATE POLICY "Unidades removíveis por autenticados"
  ON public."dUnidadesAdmin" FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================
-- SEED: Unidades administrativas do TJPA (estrutura real)
-- =============================================================
INSERT INTO public."dUnidadesAdmin" (nome, sigla, tipo, vinculacao, responsavel, latitude, longitude) VALUES
-- Secretarias
('Secretaria de Finanças',                'SEFIN',    'Secretaria',     'Presidência',        NULL, -1.45502, -48.50240),
('Secretaria de Administração',           'SECAD',    'Secretaria',     'Presidência',        NULL, -1.45502, -48.50240),
('Secretaria de Planejamento',            'SEPLAN',   'Secretaria',     'Presidência',        NULL, -1.45502, -48.50240),
('Secretaria de Informática',             'SECIN',    'Secretaria',     'Presidência',        NULL, -1.45502, -48.50240),
('Secretaria de Gestão de Pessoas',       'SEGEP',    'Secretaria',     'Presidência',        NULL, -1.45502, -48.50240),

-- Departamentos (SEFIN)
('Departamento de Execução Financeira',   'DEFIN',    'Departamento',   'SEFIN',              NULL, -1.45502, -48.50240),

-- Seções (DEFIN)
('Seção de Suprimento de Fundos',         'SOSFU',    'Seção',          'DEFIN',              NULL, -1.45502, -48.50240),
('Seção de Diárias e Passagens',          'SODPA',    'Seção',          'DEFIN',              NULL, -1.45502, -48.50240),

-- Coordenadorias (SEFIN)
('Coordenadoria de Orçamento',            'COORC',    'Coordenadoria',  'SEFIN',              NULL, -1.45502, -48.50240),
('Coordenadoria de Arrecadação',          'CODAR',    'Coordenadoria',  'SEFIN',              NULL, -1.45502, -48.50240),

-- Assessorias
('Assessoria Jurídica da SEFIN',          'AJSEFIN',  'Assessoria',     'SEFIN',              NULL, -1.45502, -48.50240),
('Assessoria de Planejamento da SEFIN',   'ASSEFIN',  'Assessoria',     'SEFIN',              NULL, -1.45502, -48.50240),

-- Gabinetes
('Gabinete da Presidência',               'GABPRES',  'Gabinete',       'Presidência',        NULL, -1.45502, -48.50240),
('Gabinete da Vice-Presidência',          'GABVICE',  'Gabinete',       'Vice-Presidência',   NULL, -1.45502, -48.50240),
('Gabinete da Corregedoria',              'GABCOR',   'Gabinete',       'Corregedoria',       NULL, -1.45502, -48.50240),

-- Outros
('Tribunal de Contas do Estado',          'TCE',      'Outro',          'Externo',            NULL, -1.44754, -48.49245),
('Escola Judicial',                       'EJUD',     'Serviço',        'Presidência',        NULL, -1.45502, -48.50240),
('Serviço de Transporte',                 'SETRAN',   'Serviço',        'SECAD',              NULL, -1.45502, -48.50240);

-- Comentários
COMMENT ON TABLE public."dUnidadesAdmin" IS 'Cadastro das unidades administrativas do TJPA. Complementa dcomarcas — o servidor pode estar lotado em comarca OU unidade administrativa.';
COMMENT ON COLUMN public."dUnidadesAdmin".tipo IS 'Tipo da unidade: Secretaria, Departamento, Coordenadoria, Serviço, Assessoria, Seção, Gabinete, Outro';
COMMENT ON COLUMN public."dUnidadesAdmin".vinculacao IS 'Órgão superior ao qual a unidade está vinculada';
