-- 20240914000004_add_paid_month.sql

-- 1. Adiciona coluna para registrar o mês/ano de referência do pagamento (ex: 'Setembro/2026')
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS paid_month TEXT;

-- 2. Atualiza a view view_player_cards para incluir o campo paid_month
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
