-- 20240914000002_triggers_and_functions.sql

-- 1. Criação automática de perfil ao cadastrar no Supabase Auth
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

-- 2. Determinação automática de Vaga (confirmed vs waiting) ao se inscrever
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

-- 3. Promoção automática da fila de espera quando alguém desiste (status = 'dropped')
CREATE OR REPLACE FUNCTION public.handle_attendee_promotion()
RETURNS TRIGGER AS $$
DECLARE
    v_cutoff TIMESTAMPTZ;
    v_next_waiting_id UUID;
BEGIN
    IF OLD.status = 'confirmed' AND NEW.status = 'dropped' THEN
        SELECT cutoff_time INTO v_cutoff FROM public.matches WHERE id = NEW.match_id;

        IF NOW() > v_cutoff THEN
            UPDATE public.profiles
            SET no_show_count = no_show_count + 1
            WHERE id = NEW.user_id;
        END IF;

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
