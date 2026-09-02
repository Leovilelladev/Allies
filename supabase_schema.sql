-- ==============================================================================
-- SCHEMA COMPLETO DO BANCO DE DADOS - ALLIES RPG (SUPABASE)
-- Execute este script no SQL Editor do painel Supabase (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. LIMPEZA DE TABELAS ANTIGAS / LEGACY (SE EXISTIREM)
DROP TABLE IF EXISTS sessao_participantes CASCADE;
DROP TABLE IF EXISTS campanha_personagens CASCADE;
DROP TABLE IF EXISTS personagens CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS mesa_sons CASCADE;
DROP TABLE IF EXISTS mesa_iniciativa CASCADE;
DROP TABLE IF EXISTS mesa_chat CASCADE;
DROP TABLE IF EXISTS mesa_tokens CASCADE;
DROP TABLE IF EXISTS cenas CASCADE;
DROP TABLE IF EXISTS fichas CASCADE;
DROP TABLE IF EXISTS sessoes CASCADE;
DROP TABLE IF EXISTS campanha_membros CASCADE;
DROP TABLE IF EXISTS campanhas CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 3. TABELA PROFILES (VINCULADA AO SUPABASE AUTH)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  usuario TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. TABELA CAMPANHAS
CREATE TABLE public.campanhas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mestre_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  sistema TEXT DEFAULT 'D&D 5E',
  descricao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. TABELA CAMPANHA_MEMBROS
CREATE TABLE public.campanha_membros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campanha_id UUID NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  adicionado_em TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(campanha_id, usuario_id)
);

-- 6. TABELA SESSOES
CREATE TABLE public.sessoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campanha_id UUID NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  numero INT NOT NULL,
  nome TEXT,
  data TEXT,
  resumo TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(campanha_id, numero)
);

-- 7. TABELA FICHAS (PERSONAGENS)
CREATE TABLE public.fichas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campanha_id UUID REFERENCES public.campanhas(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome_personagem TEXT NOT NULL,
  dados JSONB DEFAULT '{}'::jsonb NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  atualizado_em TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7.1 TABELA PERSONAGEM_ACOES (HABILIDADES E ACTION SLOTS RELACIONAIS D&D 5E)
CREATE TABLE IF NOT EXISTS public.personagem_acoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ficha_id UUID REFERENCES public.fichas(id) ON DELETE CASCADE,
  personagem_id INT REFERENCES public.personagens(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'action' NOT NULL,
  icone_url TEXT,
  descricao TEXT,
  alcance TEXT,
  alvo TEXT,
  tem_ataque BOOLEAN DEFAULT TRUE NOT NULL,
  atributo_base TEXT DEFAULT 'for',
  proficiente BOOLEAN DEFAULT TRUE NOT NULL,
  bonus_adicional_acerto INT DEFAULT 0 NOT NULL,
  formula_dano TEXT,
  tipo_dano TEXT DEFAULT 'slashing',
  tem_salvaguarda BOOLEAN DEFAULT FALSE NOT NULL,
  salvaguarda_atributo TEXT,
  salvaguarda_dc_custom INT,
  tem_cargas BOOLEAN DEFAULT FALSE NOT NULL,
  max_cargas INT,
  cargas_atuais INT,
  tipo_recarga TEXT DEFAULT 'long_rest',
  criado_em TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  atualizado_em TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_personagem_acoes_ficha ON public.personagem_acoes(ficha_id);
CREATE INDEX IF NOT EXISTS idx_personagem_acoes_pers ON public.personagem_acoes(personagem_id);


-- 8. TABELA CENAS (MAPAS DA MESA VIRTUAL)
CREATE TABLE public.cenas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campanha_id UUID NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  sessao_id UUID NOT NULL REFERENCES public.sessoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  mapa_url TEXT,
  grid_tamanho INT DEFAULT 50 NOT NULL,
  fog_ativo BOOLEAN DEFAULT FALSE NOT NULL,
  fog_revelado JSONB DEFAULT '[]'::jsonb,
  criado_em TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. TABELA MESA_TOKENS
CREATE TABLE public.mesa_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cena_id UUID NOT NULL REFERENCES public.cenas(id) ON DELETE CASCADE,
  ficha_id UUID REFERENCES public.fichas(id) ON DELETE SET NULL,
  nome TEXT,
  x FLOAT DEFAULT 0 NOT NULL,
  y FLOAT DEFAULT 0 NOT NULL,
  tamanho FLOAT DEFAULT 50 NOT NULL,
  rotacao FLOAT DEFAULT 0 NOT NULL,
  cor TEXT,
  imagem_url TEXT,
  dados JSONB DEFAULT '{}'::jsonb NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10. TABELA MESA_CHAT (MENSAGENS E ROLAGENS DE DADOS)
CREATE TABLE public.mesa_chat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cena_id UUID NOT NULL REFERENCES public.cenas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  autor_nome TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT DEFAULT 'texto' NOT NULL,
  dados JSONB DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 11. TABELA MESA_INICIATIVA
CREATE TABLE public.mesa_iniciativa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cena_id UUID NOT NULL REFERENCES public.cenas(id) ON DELETE CASCADE,
  token_id TEXT,
  nome TEXT NOT NULL,
  valor INT DEFAULT 0 NOT NULL,
  ativo BOOLEAN DEFAULT TRUE NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 12. TABELA MESA_SONS
CREATE TABLE public.mesa_sons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campanha_id UUID NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  som_url TEXT NOT NULL,
  volume FLOAT DEFAULT 1.0 NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) & POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanha_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesa_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesa_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesa_iniciativa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesa_sons ENABLE ROW LEVEL SECURITY;

-- Políticas de Profiles (Todos autenticados podem ver perfis, cada um edita o seu)
CREATE POLICY "Perfis visíveis para todos os autenticados" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários podem inserir e atualizar seu próprio perfil" ON public.profiles
  FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Políticas de Campanhas (Membros e mestres têm acesso total)
CREATE POLICY "Campanhas acessíveis por membros e mestres" ON public.campanhas
  FOR SELECT TO authenticated USING (
    mestre_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.campanha_membros WHERE campanha_id = campanhas.id AND usuario_id = auth.uid())
  );

CREATE POLICY "Mestres podem criar campanhas" ON public.campanhas
  FOR INSERT TO authenticated WITH CHECK (mestre_id = auth.uid());

CREATE POLICY "Mestre pode atualizar e deletar sua campanha" ON public.campanhas
  FOR ALL TO authenticated USING (mestre_id = auth.uid());

-- Políticas de Campanha Membros
CREATE POLICY "Membros visíveis para quem está na campanha" ON public.campanha_membros
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Mestre e próprio jogador gerenciam membros" ON public.campanha_membros
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas de Sessões
CREATE POLICY "Sessões visíveis para membros da campanha" ON public.sessoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas de Fichas
CREATE POLICY "Fichas visíveis e gerenciáveis por jogadores e mestres" ON public.fichas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas de Cenas, Tokens, Chat, Iniciativa, Sons (Mesa Virtual)
CREATE POLICY "Cenas acessíveis para autenticados" ON public.cenas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Tokens acessíveis para autenticados" ON public.mesa_tokens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Chat acessível para autenticados" ON public.mesa_chat
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Iniciativa acessível para autenticados" ON public.mesa_iniciativa
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Sons acessíveis para autenticados" ON public.mesa_sons
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- REALTIME (HABILITAR PUBLICACAO EM TEMPO REAL PARA AS TABELAS)
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.campanhas;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessoes;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cenas;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fichas;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mesa_tokens;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mesa_chat;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mesa_iniciativa;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;
