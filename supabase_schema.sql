-- Allies RPG — migração Auth/RLS compatível com o banco legado.
--
-- O domínio existente usa IDs inteiros e já possui dados. A migração preserva
-- essas chaves e cria usuarios.auth_id como ponte para auth.users. Não substitua
-- as tabelas por UUID sem uma migração de dados planejada.
--
-- Execute em uma transação no projeto Supabase após backup. token_hash é
-- removido porque o cliente usa exclusivamente Supabase Auth.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

-- Identidade e compatibilidade de colunas
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS auth_id UUID;

UPDATE public.usuarios AS u
SET auth_id = a.id
FROM auth.users AS a
WHERE u.auth_id IS NULL
  AND lower(u.nome_usuario) = lower(split_part(a.email, '@', 1));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.usuarios WHERE auth_id IS NULL) THEN
    RAISE EXCEPTION 'Há perfis sem correspondência em auth.users; migração interrompida.';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_auth_id ON public.usuarios(auth_id);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'usuarios_auth_id_fkey' AND conrelid = 'public.usuarios'::regclass
  ) THEN
    ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_auth_id_fkey
      FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END
$$;
ALTER TABLE public.usuarios ALTER COLUMN auth_id SET NOT NULL;
ALTER TABLE public.usuarios DROP COLUMN IF EXISTS token_hash;

ALTER TABLE public.campanhas
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ;
UPDATE public.campanhas SET nome = COALESCE(NULLIF(nome, ''), titulo), atualizado_em = COALESCE(atualizado_em, criado_em, now())
WHERE nome IS NULL OR atualizado_em IS NULL;

ALTER TABLE public.campanha_personagens ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ;
UPDATE public.campanha_personagens SET criado_em = COALESCE(criado_em, adicionado_em, now()) WHERE criado_em IS NULL;

ALTER TABLE public.sessoes
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS data TEXT,
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ;
UPDATE public.sessoes SET nome = COALESCE(NULLIF(nome, ''), titulo), data = COALESCE(data, data_agendada::text), atualizado_em = COALESCE(atualizado_em, criado_em, now())
WHERE nome IS NULL OR data IS NULL OR atualizado_em IS NULL;

ALTER TABLE public.sessao_participantes ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ;
UPDATE public.sessao_participantes SET criado_em = COALESCE(criado_em, now()) WHERE criado_em IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sessao_participante ON public.sessao_participantes(sessao_id, usuario_id);

ALTER TABLE public.mesa_cenas
  ADD COLUMN IF NOT EXISTS largura_quadrados INTEGER,
  ADD COLUMN IF NOT EXISTS altura_quadrados INTEGER,
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ;
UPDATE public.mesa_cenas SET atualizado_em = COALESCE(atualizado_em, criado_em, now()) WHERE atualizado_em IS NULL;

ALTER TABLE public.mesa_tokens
  ADD COLUMN IF NOT EXISTS ficha_id INTEGER,
  ADD COLUMN IF NOT EXISTS tamanho DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS luz DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS criado_por INTEGER,
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ;
UPDATE public.mesa_tokens SET ficha_id = COALESCE(ficha_id, personagem_id), tamanho = COALESCE(tamanho, raio), atualizado_em = COALESCE(atualizado_em, criado_em, now())
WHERE ficha_id IS NULL OR tamanho IS NULL OR atualizado_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON public.usuarios(auth_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_mestre ON public.campanhas(mestre_id);
CREATE INDEX IF NOT EXISTS idx_cp_campanha ON public.campanha_personagens(campanha_id);
CREATE INDEX IF NOT EXISTS idx_cp_usuario ON public.campanha_personagens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_cp_personagem ON public.campanha_personagens(personagem_id);
CREATE INDEX IF NOT EXISTS idx_personagens_usuario ON public.personagens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_campanha_data ON public.sessoes(campanha_id, data_agendada);
CREATE INDEX IF NOT EXISTS idx_cenas_sessao ON public.mesa_cenas(sessao_id);
CREATE INDEX IF NOT EXISTS idx_cenas_iniciativa_atual ON public.mesa_cenas(iniciativa_atual_id);
CREATE INDEX IF NOT EXISTS idx_tokens_cena ON public.mesa_tokens(cena_id);
CREATE INDEX IF NOT EXISTS idx_tokens_personagem ON public.mesa_tokens(personagem_id);
CREATE INDEX IF NOT EXISTS idx_areas_criado_por ON public.mesa_areas(criado_por);
CREATE INDEX IF NOT EXISTS idx_chat_cena_tempo ON public.mesa_chat(cena_id, criado_em DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_chat_usuario ON public.mesa_chat(usuario_id);
CREATE INDEX IF NOT EXISTS idx_iniciativa_criado_por ON public.mesa_iniciativa(criado_por);
CREATE INDEX IF NOT EXISTS idx_sons_campanha ON public.mesa_sons(campanha_id);
CREATE INDEX IF NOT EXISTS idx_participantes_usuario ON public.sessao_participantes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON public.notificacoes(usuario_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_ator ON public.notificacoes(ator_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_campanha ON public.notificacoes(campanha_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_personagem ON public.notificacoes(personagem_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_sessao ON public.notificacoes(sessao_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_notificacao_sessao_proxima ON public.notificacoes(usuario_id, tipo, sessao_id) WHERE tipo = 'sessao_proxima';
DROP INDEX IF EXISTS public.mesa_cenas_sessao_idx;
DROP INDEX IF EXISTS public.mesa_tokens_cena_idx;
DROP INDEX IF EXISTS public.uniq_notificacao_sessao_proxima;

-- Funções de identidade e autorização (os IDs do domínio continuam inteiros)
CREATE OR REPLACE FUNCTION private.current_user_id()
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.usuarios WHERE auth_id = (SELECT auth.uid()) LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.eh_mestre_campanha(p_campanha_id INTEGER)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_campanha_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.campanhas WHERE id = p_campanha_id AND mestre_id = private.current_user_id()
  );
$$;

CREATE OR REPLACE FUNCTION private.eh_membro_campanha(p_campanha_id INTEGER)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.eh_mestre_campanha(p_campanha_id) OR EXISTS (
    SELECT 1 FROM public.campanha_personagens
    WHERE campanha_id = p_campanha_id AND usuario_id = private.current_user_id()
  );
$$;

CREATE OR REPLACE FUNCTION private.campanha_da_cena(p_cena_id INTEGER)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT campanha_id FROM public.mesa_cenas WHERE id = p_cena_id;
$$;

CREATE OR REPLACE FUNCTION private.cena_da_ficha(p_ficha_id INTEGER)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id FROM public.campanha_personagens cp
  JOIN public.mesa_cenas c ON c.campanha_id = cp.campanha_id
  WHERE cp.personagem_id = p_ficha_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.criar_perfil_auth()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_usuario TEXT;
  v_nome TEXT;
  v_sufixo TEXT := substr(replace(new.id::text, '-', ''), 1, 6);
BEGIN
  v_usuario := lower(coalesce(nullif(new.raw_user_meta_data ->> 'usuario', ''), split_part(new.email, '@', 1)));
  v_usuario := trim(both '_' from regexp_replace(v_usuario, '[^a-z0-9_]', '_', 'g'));
  IF length(v_usuario) < 3 THEN v_usuario := 'user_' || v_sufixo; END IF;
  v_usuario := left(v_usuario, 20);
  IF EXISTS (SELECT 1 FROM public.usuarios WHERE nome_usuario = v_usuario AND auth_id <> new.id) THEN
    v_usuario := left(v_usuario, 13) || '_' || v_sufixo;
  END IF;
  v_nome := coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), v_usuario);
  INSERT INTO public.usuarios (auth_id, nome_usuario, nome_exibicao)
  VALUES (new.id, v_usuario, v_nome)
  ON CONFLICT (auth_id) DO UPDATE SET nome_exibicao = excluded.nome_exibicao, atualizado_em = now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.criar_perfil_auth();

CREATE OR REPLACE FUNCTION private.gerar_lembretes_sessoes()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid INTEGER := private.current_user_id(); v_qtd INTEGER := 0;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR v_uid IS NULL THEN
    RAISE EXCEPTION 'Apenas usuários autenticados com perfil podem gerar lembretes.';
  END IF;
  WITH minhas_sessoes AS (
    SELECT DISTINCT s.id, s.titulo, s.data_agendada, s.campanha_id, c.titulo AS campanha_titulo
    FROM public.sessoes s JOIN public.campanhas c ON c.id = s.campanha_id
    LEFT JOIN public.campanha_personagens cp ON cp.campanha_id = s.campanha_id
    WHERE s.data_agendada IS NOT NULL AND s.data_agendada >= now()
      AND s.data_agendada <= now() + interval '48 hours'
      AND coalesce(s.status, 'agendada') <> 'cancelada'
      AND (c.mestre_id = v_uid OR cp.usuario_id = v_uid)
  ), inseridas AS (
    INSERT INTO public.notificacoes (usuario_id, tipo, titulo, mensagem, campanha_id, sessao_id)
    SELECT v_uid, 'sessao_proxima', coalesce(ms.titulo, 'Sessão') || ' está chegando',
      coalesce(ms.campanha_titulo, 'Sua campanha') || ' — ' || to_char(ms.data_agendada, 'DD/MM "às" HH24:MI'), ms.campanha_id, ms.id
    FROM minhas_sessoes ms
    ON CONFLICT (usuario_id, tipo, sessao_id) WHERE (tipo = 'sessao_proxima') DO NOTHING
    RETURNING 1
  ) SELECT count(*) INTO v_qtd FROM inseridas;
  RETURN v_qtd;
END;
$$;

-- Wrappers invoker ficam disponíveis apenas para as chamadas necessárias do app;
-- a elevação de privilégio permanece isolada no schema private.
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS INTEGER LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT private.current_user_id();
$$;
CREATE OR REPLACE FUNCTION public.eh_mestre_campanha(p_campanha_id INTEGER)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT private.eh_mestre_campanha(p_campanha_id);
$$;
CREATE OR REPLACE FUNCTION public.eh_membro_campanha(p_campanha_id INTEGER)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT private.eh_membro_campanha(p_campanha_id);
$$;
CREATE OR REPLACE FUNCTION public.campanha_da_cena(p_cena_id INTEGER)
RETURNS INTEGER LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT private.campanha_da_cena(p_cena_id);
$$;
CREATE OR REPLACE FUNCTION public.cena_da_ficha(p_ficha_id INTEGER)
RETURNS INTEGER LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT private.cena_da_ficha(p_ficha_id);
$$;
CREATE OR REPLACE FUNCTION public.gerar_lembretes_sessoes()
RETURNS INTEGER LANGUAGE sql SET search_path = '' AS $$
  SELECT private.gerar_lembretes_sessoes();
$$;

REVOKE ALL ON FUNCTION private.current_user_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.eh_mestre_campanha(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.eh_membro_campanha(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.campanha_da_cena(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.cena_da_ficha(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.criar_perfil_auth() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.gerar_lembretes_sessoes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.eh_mestre_campanha(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.eh_membro_campanha(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.campanha_da_cena(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cena_da_ficha(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.gerar_lembretes_sessoes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.eh_mestre_campanha(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION private.eh_membro_campanha(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION private.campanha_da_cena(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION private.cena_da_ficha(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION private.gerar_lembretes_sessoes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.eh_mestre_campanha(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eh_membro_campanha(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.campanha_da_cena(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cena_da_ficha(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_lembretes_sessoes() TO authenticated;

-- Revoga funções SECURITY DEFINER antigas que não participam do fluxo atual.
REVOKE ALL ON FUNCTION public.adicionar_mestre_como_membro() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_campanha_member(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_membro_campanha(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_membro_de_sessao(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_mestre_campanha(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_mestre_de_personagem(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_mestre_de_sessao(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_mestre_ou_membro_de_personagem(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notificar_membros_campanha(INTEGER, INTEGER, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_notificar_campanha_personagem() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_notificar_sessao_nova() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_notificar_sessao_remarcada() FROM PUBLIC, anon, authenticated;

-- RLS somente para autenticados; autorização sempre deriva de auth.uid().
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END
$$;

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanha_personagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessao_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesa_cenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesa_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesa_paredes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesa_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesa_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesa_iniciativa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesa_sons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personagem_acoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuarios_select ON public.usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY usuarios_insert ON public.usuarios FOR INSERT TO authenticated WITH CHECK (auth_id = (SELECT auth.uid()));
CREATE POLICY usuarios_update ON public.usuarios FOR UPDATE TO authenticated USING (auth_id = (SELECT auth.uid())) WITH CHECK (auth_id = (SELECT auth.uid()));
CREATE POLICY usuarios_delete ON public.usuarios FOR DELETE TO authenticated USING (auth_id = (SELECT auth.uid()));

CREATE POLICY campanhas_select ON public.campanhas FOR SELECT TO authenticated USING (public.eh_membro_campanha(id));
CREATE POLICY campanhas_insert ON public.campanhas FOR INSERT TO authenticated WITH CHECK (mestre_id = public.current_user_id());
CREATE POLICY campanhas_update ON public.campanhas FOR UPDATE TO authenticated USING (mestre_id = public.current_user_id()) WITH CHECK (mestre_id = public.current_user_id());
CREATE POLICY campanhas_delete ON public.campanhas FOR DELETE TO authenticated USING (mestre_id = public.current_user_id());

CREATE POLICY cp_select ON public.campanha_personagens FOR SELECT TO authenticated USING (public.eh_membro_campanha(campanha_id) OR usuario_id = public.current_user_id());
CREATE POLICY cp_insert ON public.campanha_personagens FOR INSERT TO authenticated WITH CHECK (public.eh_mestre_campanha(campanha_id));
CREATE POLICY cp_update ON public.campanha_personagens FOR UPDATE TO authenticated USING (public.eh_mestre_campanha(campanha_id)) WITH CHECK (public.eh_mestre_campanha(campanha_id));
CREATE POLICY cp_delete ON public.campanha_personagens FOR DELETE TO authenticated USING (public.eh_mestre_campanha(campanha_id) OR usuario_id = public.current_user_id());

CREATE POLICY personagens_select ON public.personagens FOR SELECT TO authenticated USING (usuario_id = public.current_user_id() OR EXISTS (SELECT 1 FROM public.campanha_personagens cp WHERE cp.personagem_id = public.personagens.id AND public.eh_membro_campanha(cp.campanha_id)));
CREATE POLICY personagens_insert ON public.personagens FOR INSERT TO authenticated WITH CHECK (usuario_id = public.current_user_id());
CREATE POLICY personagens_update ON public.personagens FOR UPDATE TO authenticated USING (usuario_id = public.current_user_id() OR EXISTS (SELECT 1 FROM public.campanha_personagens cp WHERE cp.personagem_id = public.personagens.id AND public.eh_mestre_campanha(cp.campanha_id))) WITH CHECK (usuario_id = public.current_user_id() OR EXISTS (SELECT 1 FROM public.campanha_personagens cp WHERE cp.personagem_id = public.personagens.id AND public.eh_mestre_campanha(cp.campanha_id)));
CREATE POLICY personagens_delete ON public.personagens FOR DELETE TO authenticated USING (usuario_id = public.current_user_id() OR EXISTS (SELECT 1 FROM public.campanha_personagens cp WHERE cp.personagem_id = public.personagens.id AND public.eh_mestre_campanha(cp.campanha_id)));

CREATE POLICY sessoes_select ON public.sessoes FOR SELECT TO authenticated USING (public.eh_membro_campanha(campanha_id));
CREATE POLICY sessoes_insert ON public.sessoes FOR INSERT TO authenticated WITH CHECK (public.eh_mestre_campanha(campanha_id));
CREATE POLICY sessoes_update ON public.sessoes FOR UPDATE TO authenticated USING (public.eh_mestre_campanha(campanha_id)) WITH CHECK (public.eh_mestre_campanha(campanha_id));
CREATE POLICY sessoes_delete ON public.sessoes FOR DELETE TO authenticated USING (public.eh_mestre_campanha(campanha_id));

CREATE POLICY participantes_select ON public.sessao_participantes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.sessoes s WHERE s.id = sessao_id AND public.eh_membro_campanha(s.campanha_id)));
CREATE POLICY participantes_insert ON public.sessao_participantes FOR INSERT TO authenticated WITH CHECK (usuario_id = public.current_user_id() AND EXISTS (SELECT 1 FROM public.sessoes s WHERE s.id = sessao_id AND public.eh_membro_campanha(s.campanha_id)));
CREATE POLICY participantes_update ON public.sessao_participantes FOR UPDATE TO authenticated USING (usuario_id = public.current_user_id() OR EXISTS (SELECT 1 FROM public.sessoes s WHERE s.id = sessao_id AND public.eh_mestre_campanha(s.campanha_id))) WITH CHECK (usuario_id = public.current_user_id() OR EXISTS (SELECT 1 FROM public.sessoes s WHERE s.id = sessao_id AND public.eh_mestre_campanha(s.campanha_id)));
CREATE POLICY participantes_delete ON public.sessao_participantes FOR DELETE TO authenticated USING (usuario_id = public.current_user_id() OR EXISTS (SELECT 1 FROM public.sessoes s WHERE s.id = sessao_id AND public.eh_mestre_campanha(s.campanha_id)));

CREATE POLICY cenas_select ON public.mesa_cenas FOR SELECT TO authenticated USING (public.eh_membro_campanha(campanha_id));
CREATE POLICY cenas_insert ON public.mesa_cenas FOR INSERT TO authenticated WITH CHECK (public.eh_mestre_campanha(campanha_id));
CREATE POLICY cenas_update ON public.mesa_cenas FOR UPDATE TO authenticated USING (public.eh_mestre_campanha(campanha_id)) WITH CHECK (public.eh_mestre_campanha(campanha_id));
CREATE POLICY cenas_delete ON public.mesa_cenas FOR DELETE TO authenticated USING (public.eh_mestre_campanha(campanha_id));

CREATE POLICY tokens_select ON public.mesa_tokens FOR SELECT TO authenticated USING (public.eh_membro_campanha(public.campanha_da_cena(cena_id)));
CREATE POLICY tokens_insert ON public.mesa_tokens FOR INSERT TO authenticated WITH CHECK (public.eh_mestre_campanha(public.campanha_da_cena(cena_id)) OR EXISTS (SELECT 1 FROM public.personagens p WHERE p.id = coalesce(ficha_id, personagem_id) AND p.usuario_id = public.current_user_id()));
CREATE POLICY tokens_update ON public.mesa_tokens FOR UPDATE TO authenticated USING (public.eh_mestre_campanha(public.campanha_da_cena(cena_id)) OR EXISTS (SELECT 1 FROM public.personagens p WHERE p.id = coalesce(ficha_id, personagem_id) AND p.usuario_id = public.current_user_id())) WITH CHECK (public.eh_mestre_campanha(public.campanha_da_cena(cena_id)) OR EXISTS (SELECT 1 FROM public.personagens p WHERE p.id = coalesce(ficha_id, personagem_id) AND p.usuario_id = public.current_user_id()));
CREATE POLICY tokens_delete ON public.mesa_tokens FOR DELETE TO authenticated USING (public.eh_mestre_campanha(public.campanha_da_cena(cena_id)) OR EXISTS (SELECT 1 FROM public.personagens p WHERE p.id = coalesce(ficha_id, personagem_id) AND p.usuario_id = public.current_user_id()));

CREATE POLICY paredes_select ON public.mesa_paredes FOR SELECT TO authenticated USING (public.eh_membro_campanha(public.campanha_da_cena(cena_id)));
CREATE POLICY paredes_insert ON public.mesa_paredes FOR INSERT TO authenticated WITH CHECK (public.eh_mestre_campanha(public.campanha_da_cena(cena_id)));
CREATE POLICY paredes_update ON public.mesa_paredes FOR UPDATE TO authenticated USING (public.eh_mestre_campanha(public.campanha_da_cena(cena_id))) WITH CHECK (public.eh_mestre_campanha(public.campanha_da_cena(cena_id)));
CREATE POLICY paredes_delete ON public.mesa_paredes FOR DELETE TO authenticated USING (public.eh_mestre_campanha(public.campanha_da_cena(cena_id)));
CREATE POLICY areas_select ON public.mesa_areas FOR SELECT TO authenticated USING (public.eh_membro_campanha(public.campanha_da_cena(cena_id)));
CREATE POLICY areas_insert ON public.mesa_areas FOR INSERT TO authenticated WITH CHECK (public.eh_mestre_campanha(public.campanha_da_cena(cena_id)));
CREATE POLICY areas_update ON public.mesa_areas FOR UPDATE TO authenticated USING (public.eh_mestre_campanha(public.campanha_da_cena(cena_id))) WITH CHECK (public.eh_mestre_campanha(public.campanha_da_cena(cena_id)));
CREATE POLICY areas_delete ON public.mesa_areas FOR DELETE TO authenticated USING (public.eh_mestre_campanha(public.campanha_da_cena(cena_id)));

CREATE POLICY chat_select ON public.mesa_chat FOR SELECT TO authenticated USING (public.eh_membro_campanha(public.campanha_da_cena(cena_id)));
CREATE POLICY chat_insert ON public.mesa_chat FOR INSERT TO authenticated WITH CHECK (usuario_id = public.current_user_id() AND public.eh_membro_campanha(public.campanha_da_cena(cena_id)));
CREATE POLICY chat_delete ON public.mesa_chat FOR DELETE TO authenticated USING (usuario_id = public.current_user_id() OR public.eh_mestre_campanha(public.campanha_da_cena(cena_id)));
CREATE POLICY iniciativa_select ON public.mesa_iniciativa FOR SELECT TO authenticated USING (public.eh_membro_campanha(public.campanha_da_cena(cena_id)));
CREATE POLICY iniciativa_insert ON public.mesa_iniciativa FOR INSERT TO authenticated WITH CHECK (criado_por = public.current_user_id() AND public.eh_membro_campanha(public.campanha_da_cena(cena_id)));
CREATE POLICY iniciativa_delete ON public.mesa_iniciativa FOR DELETE TO authenticated USING (criado_por = public.current_user_id() OR public.eh_mestre_campanha(public.campanha_da_cena(cena_id)));

CREATE POLICY sons_select ON public.mesa_sons FOR SELECT TO authenticated USING (public.eh_membro_campanha(campanha_id));
CREATE POLICY sons_insert ON public.mesa_sons FOR INSERT TO authenticated WITH CHECK (public.eh_mestre_campanha(campanha_id));
CREATE POLICY sons_update ON public.mesa_sons FOR UPDATE TO authenticated USING (public.eh_mestre_campanha(campanha_id)) WITH CHECK (public.eh_mestre_campanha(campanha_id));
CREATE POLICY sons_delete ON public.mesa_sons FOR DELETE TO authenticated USING (public.eh_mestre_campanha(campanha_id));
CREATE POLICY acoes_owner_all ON public.personagem_acoes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.personagens p WHERE p.id = personagem_id AND p.usuario_id = public.current_user_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.personagens p WHERE p.id = personagem_id AND p.usuario_id = public.current_user_id()));
CREATE POLICY notificacoes_select ON public.notificacoes FOR SELECT TO authenticated USING (usuario_id = public.current_user_id());
CREATE POLICY notificacoes_update ON public.notificacoes FOR UPDATE TO authenticated USING (usuario_id = public.current_user_id()) WITH CHECK (usuario_id = public.current_user_id());
CREATE POLICY notificacoes_delete ON public.notificacoes FOR DELETE TO authenticated USING (usuario_id = public.current_user_id());
CREATE POLICY notificacoes_insert ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (usuario_id = public.current_user_id());

-- Storage privado de sons; o primeiro segmento do caminho é o ID inteiro da campanha.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('mesa-imagens', 'mesa-imagens', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[]),
  ('mesa-mapas', 'mesa-mapas', true, 20971520, ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[]),
  ('mesa-sons', 'mesa-sons', false, 26214400, ARRAY['audio/*']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
UPDATE storage.buckets
SET file_size_limit = CASE id
  WHEN 'mesa-sons' THEN 26214400
  WHEN 'mesa-mapas' THEN 20971520
  WHEN 'leo-mapas' THEN 20971520
  WHEN 'mesa-imagens' THEN 5242880
  WHEN 'leo-retratos' THEN 5242880
END,
allowed_mime_types = CASE
  WHEN id IN ('mesa-mapas', 'leo-mapas') THEN ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[]
  WHEN id IN ('mesa-imagens', 'leo-retratos') THEN ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[]
  WHEN id = 'mesa-sons' THEN ARRAY['audio/*']::text[]
END
WHERE id IN ('mesa-imagens','mesa-mapas','mesa-sons','leo-mapas','leo-retratos');
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
    AND (coalesce(qual, '') ILIKE '%mesa-sons%' OR coalesce(with_check, '') ILIKE '%mesa-sons%') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END
$$;
CREATE POLICY mesa_sons_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'mesa-sons' AND (storage.foldername(name))[1] ~ '^[0-9]+$' AND public.eh_membro_campanha(((storage.foldername(name))[1])::INTEGER));
CREATE POLICY mesa_sons_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mesa-sons' AND (storage.foldername(name))[1] ~ '^[0-9]+$' AND public.eh_mestre_campanha(((storage.foldername(name))[1])::INTEGER));
CREATE POLICY mesa_sons_storage_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'mesa-sons' AND (storage.foldername(name))[1] ~ '^[0-9]+$' AND public.eh_mestre_campanha(((storage.foldername(name))[1])::INTEGER))
  WITH CHECK (bucket_id = 'mesa-sons' AND (storage.foldername(name))[1] ~ '^[0-9]+$' AND public.eh_mestre_campanha(((storage.foldername(name))[1])::INTEGER));
CREATE POLICY mesa_sons_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'mesa-sons' AND (storage.foldername(name))[1] ~ '^[0-9]+$' AND public.eh_mestre_campanha(((storage.foldername(name))[1])::INTEGER));

-- Buckets públicos para leitura, mas nunca para escrita anônima.
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
    AND public.eh_membro_campanha(((storage.foldername(name))[2])::INTEGER)
  );
CREATE POLICY mesa_imagens_storage_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'mesa-imagens'
    AND (storage.foldername(name))[2] ~ '^[0-9]+$'
    AND (owner_id = (SELECT auth.uid()::text) OR public.eh_mestre_campanha(((storage.foldername(name))[2])::INTEGER))
  )
  WITH CHECK (bucket_id = 'mesa-imagens');
CREATE POLICY mesa_imagens_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'mesa-imagens'
    AND (storage.foldername(name))[2] ~ '^[0-9]+$'
    AND (owner_id = (SELECT auth.uid()::text) OR public.eh_mestre_campanha(((storage.foldername(name))[2])::INTEGER))
  );

CREATE POLICY mesa_mapas_storage_select ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'mesa-mapas');
CREATE POLICY mesa_mapas_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'mesa-mapas'
    AND (storage.foldername(name))[2] ~ '^[0-9]+$'
    AND public.eh_mestre_campanha(((storage.foldername(name))[2])::INTEGER)
  );
CREATE POLICY mesa_mapas_storage_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'mesa-mapas'
    AND (storage.foldername(name))[2] ~ '^[0-9]+$'
    AND public.eh_mestre_campanha(((storage.foldername(name))[2])::INTEGER)
  )
  WITH CHECK (bucket_id = 'mesa-mapas');
CREATE POLICY mesa_mapas_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'mesa-mapas'
    AND (storage.foldername(name))[2] ~ '^[0-9]+$'
    AND public.eh_mestre_campanha(((storage.foldername(name))[2])::INTEGER)
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

-- Limite de mensagens para evitar spam/abuso sem depender apenas do cliente.
CREATE INDEX IF NOT EXISTS idx_chat_usuario_tempo ON public.mesa_chat(usuario_id, criado_em DESC);
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

DO $$
DECLARE nome_tabela TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH nome_tabela IN ARRAY ARRAY['public.campanhas','public.campanha_personagens','public.personagens','public.sessoes','public.sessao_participantes','public.mesa_cenas','public.mesa_tokens','public.mesa_paredes','public.mesa_areas','public.mesa_chat','public.mesa_iniciativa','public.mesa_sons','public.notificacoes'] LOOP
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %s', nome_tabela);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END LOOP;
  END IF;
END
$$;

COMMIT;
