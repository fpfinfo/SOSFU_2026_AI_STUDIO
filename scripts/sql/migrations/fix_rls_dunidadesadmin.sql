-- Migration: fix_rls_dunidadesadmin
-- Corrige RLS da tabela dUnidadesAdmin para permitir CRUD por usuários autenticados
-- Problema: a policy original só permitia escrita via service_role (403 no frontend)

-- 1. Remover a policy restritiva existente (service_role only)
DROP POLICY IF EXISTS "Unidades editáveis por admin" ON public."dUnidadesAdmin";

-- 2. Criar policies granulares para usuários autenticados

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
