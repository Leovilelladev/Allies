-- P0: limites de Storage e rate limit server-side do chat.
-- Pré-requisito: schema legado do Allies já aplicado e private.current_user_id().

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('mesa-imagens', 'mesa-imagens', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[]),
  ('mesa-mapas', 'mesa-mapas', true, 20971520, ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[]),
  ('mesa-sons', 'mesa-sons', false, 26214400, ARRAY['audio/*']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $cleanup_storage$DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        coalesce(qual, '') ~ $bucket$(mesa-imagens|mesa-mapas|leo-mapas|leo-retratos)$bucket$
        OR coalesce(with_check, '') ~ $bucket$(mesa-imagens|mesa-mapas|leo-mapas|leo-retratos)$bucket$
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END$cleanup_storage$;

CREATE POLICY mesa_imagens_storage_select ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'mesa-imagens');
CREATE POLICY mesa_imagens_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'mesa-imagens'
    AND (storage.foldername(name))[2] ~ '^[0-9]+$'
    AND private.eh_membro_campanha(((storage.foldername(name))[2])::INTEGER)
  );
CREATE POLICY mesa_imagens_storage_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'mesa-imagens'
    AND (storage.foldername(name))[2] ~ '^[0-9]+$'
    AND (owner_id = (SELECT auth.uid()::text) OR private.eh_mestre_campanha(((storage.foldername(name))[2])::INTEGER))
  )
  WITH CHECK (bucket_id = 'mesa-imagens');
CREATE POLICY mesa_imagens_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'mesa-imagens'
    AND (storage.foldername(name))[2] ~ '^[0-9]+$'
    AND (owner_id = (SELECT auth.uid()::text) OR private.eh_mestre_campanha(((storage.foldername(name))[2])::INTEGER))
  );

CREATE POLICY mesa_mapas_storage_select ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'mesa-mapas');
CREATE POLICY mesa_mapas_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'mesa-mapas'
    AND (storage.foldername(name))[2] ~ '^[0-9]+$'
    AND private.eh_mestre_campanha(((storage.foldername(name))[2])::INTEGER)
  );
CREATE POLICY mesa_mapas_storage_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'mesa-mapas'
    AND (storage.foldername(name))[2] ~ '^[0-9]+$'
    AND private.eh_mestre_campanha(((storage.foldername(name))[2])::INTEGER)
  )
  WITH CHECK (bucket_id = 'mesa-mapas');
CREATE POLICY mesa_mapas_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'mesa-mapas'
    AND (storage.foldername(name))[2] ~ '^[0-9]+$'
    AND private.eh_mestre_campanha(((storage.foldername(name))[2])::INTEGER)
  );

CREATE POLICY leo_mapas_storage_select ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'leo-mapas');
CREATE POLICY leo_mapas_storage_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'leo-mapas');
CREATE POLICY leo_mapas_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'leo-mapas' AND owner_id = (SELECT auth.uid()::text));

CREATE POLICY leo_retratos_storage_select ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'leo-retratos');
CREATE POLICY leo_retratos_storage_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'leo-retratos');
CREATE POLICY leo_retratos_storage_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'leo-retratos' AND owner_id = (SELECT auth.uid()::text))
  WITH CHECK (bucket_id = 'leo-retratos');
CREATE POLICY leo_retratos_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'leo-retratos' AND owner_id = (SELECT auth.uid()::text));

UPDATE storage.buckets
SET file_size_limit = CASE id
  WHEN 'mesa-sons' THEN 26214400 -- 25 MiB
  WHEN 'mesa-mapas' THEN 20971520 -- 20 MiB
  WHEN 'leo-mapas' THEN 20971520 -- 20 MiB
  WHEN 'mesa-imagens' THEN 5242880 -- 5 MiB
  WHEN 'leo-retratos' THEN 5242880 -- 5 MiB
END,
allowed_mime_types = CASE
  WHEN id IN ('mesa-mapas', 'leo-mapas', 'mesa-imagens', 'leo-retratos')
    THEN ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[]
  WHEN id = 'mesa-sons' THEN ARRAY['audio/*']::text[]
END
WHERE id IN ('mesa-imagens','mesa-mapas','mesa-sons','leo-mapas','leo-retratos');

CREATE INDEX IF NOT EXISTS idx_chat_usuario_tempo
  ON public.mesa_chat(usuario_id, criado_em DESC);

CREATE OR REPLACE FUNCTION private.limitar_chat_campanha()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_usuario_id INTEGER;
  v_qtd INTEGER;
BEGIN
  v_usuario_id := private.current_user_id();
  IF v_usuario_id IS NULL OR NEW.usuario_id IS DISTINCT FROM v_usuario_id THEN
    RAISE EXCEPTION 'Usuário autenticado inválido para esta mensagem.' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(781234, v_usuario_id);
  SELECT count(*) INTO v_qtd
  FROM public.mesa_chat
  WHERE usuario_id = v_usuario_id
    AND criado_em > now() - interval '1 minute';

  IF v_qtd >= 60 THEN
    RAISE EXCEPTION 'Limite de mensagens atingido. Tente novamente em instantes.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.limitar_chat_campanha() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS mesa_chat_rate_limit ON public.mesa_chat;
CREATE TRIGGER mesa_chat_rate_limit
  BEFORE INSERT ON public.mesa_chat
  FOR EACH ROW EXECUTE FUNCTION private.limitar_chat_campanha();

COMMIT;
