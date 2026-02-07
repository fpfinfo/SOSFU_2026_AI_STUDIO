-- 1. ADICIONAR COLUNA DE ANALISTA RESPONSÁVEL
-- Permite saber com quem está o processo dentro da SOSFU
ALTER TABLE public.solicitations 
ADD COLUMN IF NOT EXISTS analyst_id UUID REFERENCES public.profiles(id);

ALTER TABLE public.accountabilities 
ADD COLUMN IF NOT EXISTS analyst_id UUID REFERENCES public.profiles(id);

-- 2. POLÍTICA DE ATUALIZAÇÃO PARA SOSFU
-- Garante que membros da SOSFU possam "pegar" (update) qualquer processo
DROP POLICY IF EXISTS "SOSFU gerencia tudo" ON public.solicitations;
CREATE POLICY "SOSFU gerencia tudo" ON public.solicitations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    JOIN public.dperfil dp ON p.perfil_id = dp.id
    WHERE p.id = auth.uid() AND dp.slug IN ('ADMIN', 'SOSFU')
  )
);

DROP POLICY IF EXISTS "SOSFU gerencia PC" ON public.accountabilities;
CREATE POLICY "SOSFU gerencia PC" ON public.accountabilities
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    JOIN public.dperfil dp ON p.perfil_id = dp.id
    WHERE p.id = auth.uid() AND dp.slug IN ('ADMIN', 'SOSFU')
  )
);
