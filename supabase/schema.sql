-- ==============================================================================
-- FUTSAL DOS IRMÃOS - ESQUEMA COMPLETO DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- ==============================================================================

-- 1. TABELAS BÁSICAS
-- ------------------------------------------------------------------------------

-- Perfis de Usuários (conectado com auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    is_brother BOOLEAN DEFAULT FALSE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE NOT NULL, -- Trava crítica para voto/inscrição
    is_monthly BOOLEAN DEFAULT FALSE NOT NULL,
    paid_month TEXT, -- Mês de referência do pagamento (ex: 'Setembro/2026')
    no_show_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Avaliações estilo FIFA (1 a 99)
CREATE TABLE IF NOT EXISTS public.player_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    evaluated_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pace INTEGER NOT NULL CHECK (pace BETWEEN 1 AND 99),
    shooting INTEGER NOT NULL CHECK (shooting BETWEEN 1 AND 99),
    passing INTEGER NOT NULL CHECK (passing BETWEEN 1 AND 99),
    dribbling INTEGER NOT NULL CHECK (dribbling BETWEEN 1 AND 99),
    defense INTEGER NOT NULL CHECK (defense BETWEEN 1 AND 99),
    physical INTEGER NOT NULL CHECK (physical BETWEEN 1 AND 99),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_evaluator_evaluated UNIQUE (evaluator_id, evaluated_id),
    CONSTRAINT cannot_evaluate_self CHECK (evaluator_id <> evaluated_id)
);

-- Partidas Semanais
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_date TIMESTAMPTZ NOT NULL,
    cutoff_time TIMESTAMPTZ NOT NULL, -- Limite para desistências sem penalidade
    max_players INTEGER DEFAULT 14 NOT NULL CHECK (max_players > 0),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'finished')),
    location TEXT DEFAULT 'Quadra Principal' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Inscrições de Jogadores e Fila de Espera
CREATE TABLE IF NOT EXISTS public.match_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('confirmed', 'waiting', 'dropped')),
    team TEXT NOT NULL DEFAULT 'none' CHECK (team IN ('A', 'B', 'none')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_match_user UNIQUE (match_id, user_id)
);

-- Estatísticas Pós-Jogo
CREATE TABLE IF NOT EXISTS public.match_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    goals INTEGER NOT NULL DEFAULT 0 CHECK (goals >= 0),
    assists INTEGER NOT NULL DEFAULT 0 CHECK (assists >= 0),
    is_mvp BOOLEAN NOT NULL DEFAULT FALSE,
    is_fair_play BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_match_stat_user UNIQUE (match_id, user_id)
);

-- Livro Caixa / Finanças Comunitárias
CREATE TABLE IF NOT EXISTS public.financial_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL, -- Positivo = arrecadação / Negativo = aluguel de quadra/coletes
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL DEFAULT 'geral',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_attendees_match ON public.match_attendees(match_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_ratings_evaluated ON public.player_ratings(evaluated_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(match_date DESC);

-- ==============================================================================
-- 2. VIEW: CARTÃO FIFA DO JOGADOR (view_player_cards)
-- ==============================================================================

DROP VIEW IF EXISTS public.view_player_cards CASCADE;

CREATE VIEW public.view_player_cards AS
SELECT 
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.is_brother,
    p.is_admin,
    p.is_paid,
    p.is_monthly,
    p.paid_month,
    p.no_show_count,
    p.created_at,
    COUNT(r.id)::INTEGER AS total_evaluations,
    ROUND(COALESCE(AVG(r.pace), 50))::INTEGER AS pace,
    ROUND(COALESCE(AVG(r.shooting), 50))::INTEGER AS shooting,
    ROUND(COALESCE(AVG(r.passing), 50))::INTEGER AS passing,
    ROUND(COALESCE(AVG(r.dribbling), 50))::INTEGER AS dribbling,
    ROUND(COALESCE(AVG(r.defense), 50))::INTEGER AS defense,
    ROUND(COALESCE(AVG(r.physical), 50))::INTEGER AS physical,
    ROUND(
        COALESCE(
            (AVG(r.pace) + AVG(r.shooting) + AVG(r.passing) + AVG(r.dribbling) + AVG(r.defense) + AVG(r.physical)) / 6.0,
            50
        )
    )::INTEGER AS overall
FROM public.profiles p
LEFT JOIN public.player_ratings r ON p.id = r.evaluated_id
GROUP BY p.id;

GRANT SELECT ON public.view_player_cards TO authenticated, anon;

-- ==============================================================================
-- 3. FUNÇÕES E TRIGGERS DE AUTOMAÇÃO
-- ==============================================================================

-- 3.1 Criação automática de perfil ao cadastrar no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        username, 
        full_name, 
        avatar_url, 
        is_brother,
        is_admin,
        is_paid
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Jogador'),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE((NEW.raw_user_meta_data->>'is_brother')::boolean, false),
        COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false),
        COALESCE((NEW.raw_user_meta_data->>'is_paid')::boolean, false)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3.2 Determinação automática de Vaga (confirmed vs waiting) ao se inscrever
CREATE OR REPLACE FUNCTION public.handle_attendee_registration()
RETURNS TRIGGER AS $$
DECLARE
    v_max_players INTEGER;
    v_confirmed_count INTEGER;
BEGIN
    SELECT max_players INTO v_max_players FROM public.matches WHERE id = NEW.match_id;
    
    IF NEW.status IS NULL OR NEW.status NOT IN ('confirmed', 'waiting', 'dropped') THEN
        SELECT COUNT(*) INTO v_confirmed_count 
        FROM public.match_attendees 
        WHERE match_id = NEW.match_id AND status = 'confirmed';
        
        IF v_confirmed_count < v_max_players THEN
            NEW.status := 'confirmed';
        ELSE
            NEW.status := 'waiting';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_attendee_inserted ON public.match_attendees;
CREATE TRIGGER on_attendee_inserted
    BEFORE INSERT ON public.match_attendees
    FOR EACH ROW EXECUTE FUNCTION public.handle_attendee_registration();

-- 3.3 Promoção automática da fila de espera quando alguém desiste (status = 'dropped')
CREATE OR REPLACE FUNCTION public.handle_attendee_promotion()
RETURNS TRIGGER AS $$
DECLARE
    v_cutoff TIMESTAMPTZ;
    v_next_waiting_id UUID;
BEGIN
    IF OLD.status = 'confirmed' AND NEW.status = 'dropped' THEN
        SELECT cutoff_time INTO v_cutoff FROM public.matches WHERE id = NEW.match_id;

        -- Se a desistência for após o cutoff, registra no-show
        IF NOW() > v_cutoff THEN
            UPDATE public.profiles
            SET no_show_count = no_show_count + 1
            WHERE id = NEW.user_id;
        END IF;

        -- Promove o primeiro da fila de espera
        SELECT id INTO v_next_waiting_id
        FROM public.match_attendees
        WHERE match_id = NEW.match_id AND status = 'waiting'
        ORDER BY created_at ASC
        LIMIT 1;

        IF v_next_waiting_id IS NOT NULL THEN
            UPDATE public.match_attendees
            SET status = 'confirmed'
            WHERE id = v_next_waiting_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_attendee_status_change ON public.match_attendees;
CREATE TRIGGER on_attendee_status_change
    AFTER UPDATE OF status ON public.match_attendees
    FOR EACH ROW EXECUTE FUNCTION public.handle_attendee_promotion();

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para checar status de admin sem recursão
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4.1 Perfis
CREATE POLICY "Perfis visíveis para todos"
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Usuário edita o próprio perfil"
ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins gerenciam perfis"
ON public.profiles FOR ALL USING (public.is_admin());

-- 4.2 Avaliações FIFA
CREATE POLICY "Notas são públicas para leitura"
ON public.player_ratings FOR SELECT USING (true);

CREATE POLICY "Jogadores autenticados podem avaliar outros"
ON public.player_ratings FOR INSERT
WITH CHECK (auth.uid() = evaluator_id AND evaluator_id <> evaluated_id);

CREATE POLICY "Jogadores editam apenas a própria avaliação enviada"
ON public.player_ratings FOR UPDATE USING (auth.uid() = evaluator_id);

CREATE POLICY "Jogadores ou Admins podem deletar avaliações"
ON public.player_ratings FOR DELETE
USING (auth.uid() = evaluator_id OR public.is_admin());

-- 4.3 Partidas
CREATE POLICY "Partidas públicas para leitura"
ON public.matches FOR SELECT USING (true);

CREATE POLICY "Apenas admins criam ou alteram partidas"
ON public.matches FOR ALL USING (public.is_admin());

-- 4.4 Inscrições (com trava de is_paid)
CREATE POLICY "Inscrições públicas para leitura"
ON public.match_attendees FOR SELECT USING (true);

CREATE POLICY "Apenas jogadores com is_paid = true podem se inscrever"
ON public.match_attendees FOR INSERT
WITH CHECK (
    auth.uid() = user_id 
    AND (SELECT is_paid FROM public.profiles WHERE id = auth.uid()) = true
);

CREATE POLICY "Jogador pode atualizar seu próprio status ou Admin"
ON public.match_attendees FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Jogador pode cancelar sua inscrição ou Admin"
ON public.match_attendees FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

-- 4.5 Estatísticas
CREATE POLICY "Estatísticas públicas para leitura"
ON public.match_stats FOR SELECT USING (true);

CREATE POLICY "Apenas admins lançam estatísticas"
ON public.match_stats FOR ALL USING (public.is_admin());

-- 4.6 Livro Caixa (Transparência total)
CREATE POLICY "Jogadores autenticados visualizam a caixinha"
ON public.financial_ledger FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Apenas admins lançam despesas e receitas"
ON public.financial_ledger FOR ALL USING (public.is_admin());

-- ==============================================================================
-- 5. STORAGE BUCKET: AVATARS
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Avatares públicos para leitura"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Usuários autenticados sobem foto"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados atualizam foto"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados removem foto"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
