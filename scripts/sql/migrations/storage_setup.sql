-- 1. Cria o bucket 'avatars' se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- NOTA: Removemos o comando 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;'
-- O Supabase já habilita isso por padrão e tentar rodar gera o erro 42501.

-- 2. Política: Todos podem ver (download) avatares
DROP POLICY IF EXISTS "Public Avatars View" ON storage.objects;
CREATE POLICY "Public Avatars View"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- 3. Política: Usuários autenticados podem fazer upload de seus próprios avatares
-- Regra: O arquivo deve ser salvo em uma pasta com o ID do usuário (ex: user_id/foto.jpg)
DROP POLICY IF EXISTS "Authenticated Avatar Upload" ON storage.objects;
CREATE POLICY "Authenticated Avatar Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Política: Usuários podem atualizar seus próprios avatares
DROP POLICY IF EXISTS "Authenticated Avatar Update" ON storage.objects;
CREATE POLICY "Authenticated Avatar Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Política: Usuários podem deletar seus próprios avatares
DROP POLICY IF EXISTS "Authenticated Avatar Delete" ON storage.objects;
CREATE POLICY "Authenticated Avatar Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);