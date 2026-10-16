-- Serialize registrations per match, including reactivation, so capacity is respected.
CREATE OR REPLACE FUNCTION public.handle_attendee_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_match public.matches; v_count integer; v_paid boolean;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = NEW.match_id FOR UPDATE;
  IF TG_OP = 'UPDATE' THEN
    IF NOT public.is_admin() AND auth.uid() IS NOT NULL AND
       (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.match_id IS DISTINCT FROM OLD.match_id OR NEW.team IS DISTINCT FROM OLD.team) THEN
      RAISE EXCEPTION 'Não pode alterar jogador, partida ou time.';
    END IF;
    IF NOT (OLD.status = 'dropped' AND NEW.status <> 'dropped') THEN
      IF auth.uid() IS NOT NULL AND NOT public.is_admin() AND NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Não pode alterar a ordem da fila.';
      END IF;
      IF NEW.status = 'dropped' AND v_match.status = 'finished' THEN RAISE EXCEPTION 'A partida já terminou.'; END IF;
      IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status <> 'dropped'
         AND auth.uid() IS NOT NULL AND NOT public.is_admin() AND pg_trigger_depth() = 1 THEN
        RAISE EXCEPTION 'Não pode escolher o status da inscrição.';
      END IF;
      IF NEW.status = 'dropped' THEN NEW.team := 'none'; END IF;
      RETURN NEW;
    END IF;
  END IF;
  SELECT * INTO v_match FROM public.matches WHERE id = NEW.match_id FOR UPDATE;
  IF NOT FOUND OR v_match.status <> 'open' OR v_match.match_date <= now() THEN
    RAISE EXCEPTION 'Esta partida não está aceitando inscrições.';
  END IF;
  SELECT is_paid INTO v_paid FROM public.profiles WHERE id = NEW.user_id;
  IF NOT coalesce(v_paid, false) THEN RAISE EXCEPTION 'Pagamento pendente: confirme o pagamento com o administrador.'; END IF;
  SELECT count(*) INTO v_count FROM public.match_attendees WHERE match_id = NEW.match_id AND status = 'confirmed' AND id <> NEW.id;
  NEW.status := CASE WHEN v_count < v_match.max_players THEN 'confirmed' ELSE 'waiting' END;
  NEW.team := 'none';
  NEW.created_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS on_attendee_inserted ON public.match_attendees;
CREATE TRIGGER on_attendee_inserted BEFORE INSERT OR UPDATE ON public.match_attendees
FOR EACH ROW EXECUTE FUNCTION public.handle_attendee_registration();

-- Existing members retain their role. New signups cannot choose admin/payment flags.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles(id, username, full_name, avatar_url, is_brother, is_admin, is_paid)
  VALUES (NEW.id, coalesce(nullif(NEW.raw_user_meta_data->>'username',''),split_part(NEW.email,'@',1)),
    coalesce(nullif(NEW.raw_user_meta_data->>'full_name',''),'Jogador'),NULL,
    coalesce(NEW.raw_user_meta_data->>'is_brother','false') = 'true',false,false);
  RETURN NEW;
END $$;

-- Column privileges allow profile photos without allowing users to pay/promote themselves.
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (avatar_url, full_name, username, updated_at) ON public.profiles TO authenticated;
ALTER VIEW public.view_player_cards SET (security_invoker = true);

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
CREATE OR REPLACE FUNCTION private.change_attendance(p_match_id uuid, p_join boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid := auth.uid(); v_match public.matches; v_att public.match_attendees;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('success',false,'error','Você precisa estar conectado.'); END IF;
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Partida não encontrada.'); END IF;
  SELECT * INTO v_att FROM public.match_attendees WHERE match_id=p_match_id AND user_id=v_user FOR UPDATE;
  IF p_join THEN
    IF v_match.status <> 'open' OR v_match.match_date <= now() THEN
      RETURN jsonb_build_object('success',false,'error','Esta partida não está aceitando inscrições.');
    END IF;
    IF NOT coalesce((SELECT is_paid FROM public.profiles WHERE id=v_user),false) THEN
      RETURN jsonb_build_object('success',false,'error','Pagamento pendente: confirme o pagamento com o administrador.');
    END IF;
    IF v_att.id IS NOT NULL AND v_att.status <> 'dropped' THEN
      RETURN jsonb_build_object('success',false,'error','Você já está inscrito nesta partida.');
    END IF;
    IF v_att.id IS NULL THEN
      INSERT INTO public.match_attendees(match_id,user_id) VALUES(p_match_id,v_user);
    ELSE
      UPDATE public.match_attendees SET status='waiting' WHERE id=v_att.id;
    END IF;
  ELSE
    IF v_match.status = 'finished' THEN RETURN jsonb_build_object('success',false,'error','A partida já terminou.'); END IF;
    IF v_att.id IS NULL OR v_att.status = 'dropped' THEN RETURN jsonb_build_object('success',false,'error','Você não está inscrito nesta partida.'); END IF;
    UPDATE public.match_attendees SET status='dropped' WHERE id=v_att.id;
  END IF;
  RETURN jsonb_build_object('success',true);
END $$;
REVOKE ALL ON FUNCTION private.change_attendance(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.change_attendance(uuid,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.join_match(p_match_id uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.change_attendance(p_match_id,true); $$;
CREATE OR REPLACE FUNCTION public.leave_match(p_match_id uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.change_attendance(p_match_id,false); $$;
REVOKE ALL ON FUNCTION public.join_match(uuid), public.leave_match(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.join_match(uuid), public.leave_match(uuid) TO authenticated;

-- Privileged implementations live outside the API schema; public RPCs are invokers.
GRANT USAGE ON SCHEMA private TO anon;
DO $$ DECLARE f record; v_args text; v_call text; BEGIN
  FOR f IN SELECT p.oid, p.oid::regprocedure AS signature, p.proname, p.proargnames,
      pg_get_function_identity_arguments(p.oid) AS identity_args,
      pg_get_function_arguments(p.oid) AS full_args,
      pg_get_function_result(p.oid) AS result
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prokind='f' AND p.prosecdef
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = %L',f.signature,'');
    EXECUTE format('ALTER FUNCTION %s SET SCHEMA private',f.signature);
    EXECUTE format('REVOKE ALL ON FUNCTION private.%I(%s) FROM PUBLIC, anon, authenticated',f.proname,f.identity_args);
    IF f.result <> 'trigger' THEN
      SELECT string_agg(format('%I',arg),', ') INTO v_call FROM unnest(f.proargnames) arg;
      EXECUTE format('CREATE OR REPLACE FUNCTION public.%I(%s) RETURNS %s LANGUAGE sql SECURITY INVOKER SET search_path = %L AS %L',
        f.proname,f.full_args,f.result,'',format('SELECT private.%I(%s)',f.proname,coalesce(v_call,'')));
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon',f.proname,f.identity_args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION private.%I(%s), public.%I(%s) TO authenticated',f.proname,f.identity_args,f.proname,f.identity_args);
      IF f.proname='is_admin' THEN
        EXECUTE format('GRANT EXECUTE ON FUNCTION private.%I(%s), public.%I(%s) TO anon',f.proname,f.identity_args,f.proname,f.identity_args);
      END IF;
    END IF;
  END LOOP;
END $$;

-- Storage replacements/deletions belong only to the user who uploaded the object.
DROP POLICY IF EXISTS "Usuários autenticados removem foto" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados atualizam foto" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados sobem foto" ON storage.objects;
CREATE POLICY "Usuários autenticados sobem foto" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='avatars' AND ((storage.foldername(name))[1]=(select auth.uid())::text OR name LIKE (select auth.uid())::text || '-%'));
CREATE POLICY "Usuários autenticados atualizam foto" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='avatars' AND owner_id=(select auth.uid())::text)
WITH CHECK (bucket_id='avatars' AND owner_id=(select auth.uid())::text);
CREATE POLICY "Usuários autenticados removem foto" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='avatars' AND owner_id=(select auth.uid())::text);
NOTIFY pgrst, 'reload schema';
