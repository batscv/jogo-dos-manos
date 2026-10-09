-- ==============================================================================
-- FUNÇÕES RPC PARA OPERAÇÕES ADMINISTRATIVAS (SECURITY DEFINER)
-- Essas funções verificam is_admin internamente e bypassam o RLS.
-- Execute este arquivo no SQL Editor do Supabase Dashboard.
-- ==============================================================================

-- 1. Excluir partida (com cascata manual por segurança)
CREATE OR REPLACE FUNCTION public.admin_delete_match(p_match_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Verificar se o usuário atual é admin
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado: apenas admins podem excluir partidas.');
  END IF;

  -- Cascata manual (já existe ON DELETE CASCADE, mas por segurança)
  DELETE FROM public.match_stats WHERE match_id = p_match_id;
  DELETE FROM public.match_attendees WHERE match_id = p_match_id;
  DELETE FROM public.matches WHERE id = p_match_id;

  RETURN jsonb_build_object('success', true, 'deleted_id', p_match_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_delete_match(UUID) TO authenticated;

-- 2. Criar partida
CREATE OR REPLACE FUNCTION public.admin_create_match(
  p_match_date TIMESTAMPTZ,
  p_cutoff_time TIMESTAMPTZ,
  p_location TEXT,
  p_max_players INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_new_match RECORD;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado.');
  END IF;

  INSERT INTO public.matches (match_date, cutoff_time, location, max_players, status)
  VALUES (p_match_date, p_cutoff_time, p_location, p_max_players, 'open')
  RETURNING * INTO v_new_match;

  RETURN jsonb_build_object(
    'success', true,
    'match', row_to_json(v_new_match)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_create_match(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INTEGER) TO authenticated;

-- 3. Atualizar status da partida
CREATE OR REPLACE FUNCTION public.admin_update_match_status(
  p_match_id UUID,
  p_status TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_updated RECORD;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado.');
  END IF;

  UPDATE public.matches
  SET status = p_status
  WHERE id = p_match_id
  RETURNING * INTO v_updated;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Partida não encontrada.');
  END IF;

  RETURN jsonb_build_object('success', true, 'match', row_to_json(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_update_match_status(UUID, TEXT) TO authenticated;

-- 4. Alternar pagamento de jogador
CREATE OR REPLACE FUNCTION public.admin_toggle_payment(
  p_user_id UUID,
  p_is_paid BOOLEAN,
  p_paid_month TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_updated RECORD;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado.');
  END IF;

  UPDATE public.profiles
  SET is_paid = p_is_paid,
      paid_month = p_paid_month,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO v_updated;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil não encontrado.');
  END IF;

  RETURN jsonb_build_object('success', true, 'profile', row_to_json(v_updated));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_toggle_payment(UUID, BOOLEAN, TEXT) TO authenticated;

-- 5. Registrar estatísticas de jogo
CREATE OR REPLACE FUNCTION public.admin_record_match_stat(
  p_match_id UUID,
  p_user_id UUID,
  p_goals INTEGER,
  p_assists INTEGER,
  p_is_mvp BOOLEAN,
  p_is_fair_play BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado.');
  END IF;

  INSERT INTO public.match_stats (match_id, user_id, goals, assists, is_mvp, is_fair_play)
  VALUES (p_match_id, p_user_id, p_goals, p_assists, p_is_mvp, p_is_fair_play)
  ON CONFLICT (match_id, user_id) DO UPDATE SET
    goals = EXCLUDED.goals,
    assists = EXCLUDED.assists,
    is_mvp = EXCLUDED.is_mvp,
    is_fair_play = EXCLUDED.is_fair_play;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_record_match_stat(UUID, UUID, INTEGER, INTEGER, BOOLEAN, BOOLEAN) TO authenticated;

-- 6. Lançar movimentação financeira
CREATE OR REPLACE FUNCTION public.admin_add_financial_entry(
  p_description TEXT,
  p_amount NUMERIC,
  p_category TEXT,
  p_entry_date DATE
)
RETURNS JSONB AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_new_entry RECORD;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado.');
  END IF;

  INSERT INTO public.financial_ledger (description, amount, category, entry_date, created_by)
  VALUES (p_description, p_amount, p_category, p_entry_date, auth.uid())
  RETURNING * INTO v_new_entry;

  RETURN jsonb_build_object('success', true, 'entry', row_to_json(v_new_entry));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_add_financial_entry(TEXT, NUMERIC, TEXT, DATE) TO authenticated;

-- 7. Atribuir times a jogadores inscritos
CREATE OR REPLACE FUNCTION public.admin_assign_team(
  p_match_id UUID,
  p_user_id UUID,
  p_team TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado.');
  END IF;

  UPDATE public.match_attendees
  SET team = p_team
  WHERE match_id = p_match_id AND user_id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_assign_team(UUID, UUID, TEXT) TO authenticated;
