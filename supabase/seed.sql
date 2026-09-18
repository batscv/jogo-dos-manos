-- ==============================================================================
-- FUTSAL DOS IRMÃOS - SEED DATA PARA TESTES
-- ==============================================================================

-- 1. Partida de teste para o próximo domingo
INSERT INTO public.matches (id, match_date, cutoff_time, max_players, status, location)
VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    DATE_TRUNC('week', NOW() + INTERVAL '1 week') + INTERVAL '9 hours', -- Próximo domingo às 09:00
    DATE_TRUNC('week', NOW() + INTERVAL '1 week') + INTERVAL '7 hours', -- Cutoff 2 horas antes
    14,
    'open',
    'Quadra Central dos Irmãos'
) ON CONFLICT (id) DO NOTHING;

-- 2. Entradas financeiras de exemplo
INSERT INTO public.financial_ledger (id, description, amount, entry_date, category)
VALUES 
    (gen_random_uuid(), 'Arrecadação mensalistas - Mês Atual', 450.00, CURRENT_DATE - INTERVAL '5 days', 'mensalidade'),
    (gen_random_uuid(), 'Aluguel da quadra (4 domingos)', -280.00, CURRENT_DATE - INTERVAL '3 days', 'aluguel'),
    (gen_random_uuid(), 'Compra de 2 bolas Penalty Futsal Pro', -160.00, CURRENT_DATE - INTERVAL '2 days', 'material'),
    (gen_random_uuid(), 'Jogo Avulso (3 jogadores)', 45.00, CURRENT_DATE - INTERVAL '1 day', 'avulso')
ON CONFLICT DO NOTHING;
