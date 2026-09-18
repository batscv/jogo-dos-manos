-- 20240914000001_initial_schema.sql

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    is_brother BOOLEAN DEFAULT FALSE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE NOT NULL,
    is_monthly BOOLEAN DEFAULT FALSE NOT NULL,
    no_show_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

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

CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_date TIMESTAMPTZ NOT NULL,
    cutoff_time TIMESTAMPTZ NOT NULL,
    max_players INTEGER DEFAULT 14 NOT NULL CHECK (max_players > 0),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'finished')),
    location TEXT DEFAULT 'Quadra Principal' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.match_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('confirmed', 'waiting', 'dropped')),
    team TEXT NOT NULL DEFAULT 'none' CHECK (team IN ('A', 'B', 'none')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_match_user UNIQUE (match_id, user_id)
);

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

CREATE TABLE IF NOT EXISTS public.financial_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL DEFAULT 'geral',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attendees_match ON public.match_attendees(match_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_ratings_evaluated ON public.player_ratings(evaluated_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(match_date DESC);

CREATE OR REPLACE VIEW public.view_player_cards AS
SELECT 
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.is_brother,
    p.is_admin,
    p.is_paid,
    p.is_monthly,
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
