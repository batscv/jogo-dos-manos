-- Run inside a transaction after the repair migration; no test rows survive.
BEGIN;
SELECT set_config('test.u1',gen_random_uuid()::text,true),
       set_config('test.u2',gen_random_uuid()::text,true),
       set_config('test.u3',gen_random_uuid()::text,true),
       set_config('test.admin',gen_random_uuid()::text,true);
INSERT INTO auth.users(id,email,raw_user_meta_data)
SELECT current_setting('test.'||k)::uuid, current_setting('test.'||k)||'@example.invalid',
 jsonb_build_object('username','test_'||replace(current_setting('test.'||k),'-',''),'full_name','Regression test','is_admin',true,'is_paid',true)
FROM unnest(ARRAY['u1','u2','u3','admin']) k;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.profiles WHERE id=current_setting('test.u1')::uuid AND (is_admin OR is_paid)) THEN RAISE EXCEPTION 'Signup privilege escalation'; END IF;
END $$;
UPDATE public.profiles SET is_paid=true WHERE id IN (current_setting('test.u1')::uuid,current_setting('test.u2')::uuid);
UPDATE public.profiles SET is_admin=true WHERE id=current_setting('test.admin')::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('test.admin'), true);
DO $$ DECLARE r jsonb; BEGIN
 r := public.admin_create_match(now()+interval '2 days',now()-interval '1 hour','Regression fixture',1);
 IF NOT (r->>'success')::boolean THEN RAISE EXCEPTION 'Create match failed: %',r; END IF;
 PERFORM set_config('test.match',r->'match'->>'id',true);
 r := public.admin_toggle_payment(current_setting('test.u1')::uuid,true,'Outubro/2026');
 IF NOT (r->>'success')::boolean THEN RAISE EXCEPTION 'Payment failed: %',r; END IF;
 r := public.admin_add_financial_entry('Regression fixture',1,'test',current_date);
 IF NOT (r->>'success')::boolean THEN RAISE EXCEPTION 'Ledger failed: %',r; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', current_setting('test.u1'), true);
DO $$ DECLARE r jsonb; BEGIN
 r := public.join_match(current_setting('test.match')::uuid);
 IF NOT (r->>'success')::boolean THEN RAISE EXCEPTION 'Join failed: %',r; END IF;
 IF (SELECT status FROM public.match_attendees WHERE user_id=auth.uid() AND match_id=current_setting('test.match')::uuid) <> 'confirmed' THEN RAISE EXCEPTION 'Free slot not confirmed'; END IF;
 r := public.join_match(current_setting('test.match')::uuid);
 IF (r->>'success')::boolean THEN RAISE EXCEPTION 'Duplicate allowed'; END IF;
 r := public.admin_update_match_status(current_setting('test.match')::uuid,'finished');
 IF (r->>'success')::boolean THEN RAISE EXCEPTION 'Non-admin RPC allowed'; END IF;
 BEGIN
   UPDATE public.profiles SET is_admin=true WHERE id=auth.uid();
   RAISE EXCEPTION 'Profile escalation allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 UPDATE public.profiles SET avatar_url='https://example.invalid/test.png' WHERE id=auth.uid();
END $$;
SELECT set_config('request.jwt.claim.sub', current_setting('test.u2'), true);
DO $$ DECLARE r jsonb; BEGIN
 r := public.join_match(current_setting('test.match')::uuid);
 IF NOT (r->>'success')::boolean THEN RAISE EXCEPTION 'Waitlist join failed'; END IF;
 IF (SELECT status FROM public.match_attendees WHERE user_id=auth.uid() AND match_id=current_setting('test.match')::uuid) <> 'waiting' THEN RAISE EXCEPTION 'Capacity exceeded'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', current_setting('test.u3'), true);
DO $$ BEGIN
 IF (public.join_match(current_setting('test.match')::uuid)->>'success')::boolean THEN RAISE EXCEPTION 'Unpaid join allowed'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', current_setting('test.u1'), true);
DO $$ BEGIN
 IF NOT (public.leave_match(current_setting('test.match')::uuid)->>'success')::boolean THEN RAISE EXCEPTION 'Leave failed'; END IF;
 IF (SELECT no_show_count FROM public.profiles WHERE id=auth.uid()) <> 1 THEN RAISE EXCEPTION 'Late cancellation not counted'; END IF;
 IF (SELECT status FROM public.match_attendees WHERE user_id=current_setting('test.u2')::uuid AND match_id=current_setting('test.match')::uuid) <> 'confirmed' THEN RAISE EXCEPTION 'Waitlist not promoted'; END IF;
 IF NOT (public.join_match(current_setting('test.match')::uuid)->>'success')::boolean THEN RAISE EXCEPTION 'Rejoin failed'; END IF;
 IF (SELECT status FROM public.match_attendees WHERE user_id=auth.uid() AND match_id=current_setting('test.match')::uuid) <> 'waiting' THEN RAISE EXCEPTION 'Rejoin exceeded capacity'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', current_setting('test.admin'), true);
DO $$ DECLARE r jsonb; BEGIN
 r := public.admin_assign_team(current_setting('test.match')::uuid,current_setting('test.u2')::uuid,'A');
 IF NOT (r->>'success')::boolean THEN RAISE EXCEPTION 'Teams failed'; END IF;
 r := public.admin_record_match_stat(current_setting('test.match')::uuid,current_setting('test.u2')::uuid,2,1,true,false);
 IF NOT (r->>'success')::boolean THEN RAISE EXCEPTION 'Stats failed'; END IF;
 r := public.admin_update_match_status(current_setting('test.match')::uuid,'finished');
 IF NOT (r->>'success')::boolean THEN RAISE EXCEPTION 'Finish failed'; END IF;
 r := public.admin_delete_match(current_setting('test.match')::uuid);
 IF NOT (r->>'success')::boolean THEN RAISE EXCEPTION 'Delete failed'; END IF;
END $$;
RESET ROLE;
SELECT 'passed: signup, payments, join, capacity, duplicate, waitlist, cancellation, rejoin, permissions, avatar, teams, stats, ledger, finish, delete' AS regression_tests;
ROLLBACK;
