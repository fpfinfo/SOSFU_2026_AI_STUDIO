-- ============================================================
-- SCRIPT DE GERAÇÃO DE DOCUMENTOS (AUTO-ATESTO GESTOR)
-- ============================================================

DROP TRIGGER IF EXISTS trg_generate_docs ON public.solicitations;
DROP FUNCTION IF EXISTS public.handle_new_solicitation_docs();

CREATE OR REPLACE FUNCTION public.handle_new_solicitation_docs()
RETURNS TRIGGER AS $$
DECLARE
  v_role_slug TEXT;
  v_user_name TEXT;
  v_user_email TEXT;
BEGIN
  -- 1. Identificar o Perfil do Usuário Solicitante
  SELECT d.slug, p.full_name, p.email 
  INTO v_role_slug, v_user_name, v_user_email
  FROM public.profiles p
  JOIN public.dperfil d ON p.perfil_id = d.id
  WHERE p.id = NEW.user_id;

  -- A. GERAÇÃO DA CAPA DO PROCESSO
  INSERT INTO public.process_documents (
    solicitation_id, title, description, document_type, status, created_at
  ) VALUES (
    NEW.id, 'CAPA DO PROCESSO', 'Identificação oficial do protocolo e metadados estruturais.', 'COVER', 'GENERATED', NEW.created_at
  );

  -- B. GERAÇÃO DO REQUERIMENTO INICIAL
  INSERT INTO public.process_documents (
    solicitation_id, title, description, document_type, status, created_at
  ) VALUES (
    NEW.id, 'REQUERIMENTO INICIAL', 'Justificativa e plano de aplicação assinado digitalmente.', 'REQUEST', 'GENERATED', NEW.created_at + interval '1 second'
  );

  -- C. LÓGICA DE AUTO-ATESTO (SE FOR GESTOR OU ADMIN)
  -- Se o solicitante já é o Gestor (ou Admin agindo como tal), ele auto-atesta a necessidade no momento do pedido.
  IF v_role_slug IN ('GESTOR', 'ADMIN') THEN
      INSERT INTO public.process_documents (
        solicitation_id, title, description, document_type, status, created_at, metadata
      ) VALUES (
        NEW.id, 
        'CERTIDÃO DE ATESTO (AUTO)', 
        'Certidão emitida automaticamente. O solicitante é Ordenador/Gestor da unidade.', 
        'ATTESTATION', 
        'SIGNED', 
        NEW.created_at + interval '2 seconds',
        jsonb_build_object('auto_generated', true, 'signer', v_user_name)
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_generate_docs
  AFTER INSERT ON public.solicitations
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_solicitation_docs();