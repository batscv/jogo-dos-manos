-- 20240914000003_storage_and_rls.sql

-- 1. Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

-- 2. Função auxiliar is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. Políticas de Profiles
CREATE POLICY "Perfis visíveis para todos"
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Usuário edita o próprio perfil"
ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins gerenciam perfis"
ON public.profiles FOR ALL USING (public.is_admin());

-- 4. Políticas de Player Ratings
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

-- 5. Políticas de Matches
CREATE POLICY "Partidas públicas para leitura"
ON public.matches FOR SELECT USING (true);

CREATE POLICY "Apenas admins criam ou alteram partidas"
ON public.matches FOR ALL USING (public.is_admin());

-- 6. Políticas de Match Attendees (com trava is_paid)
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

-- 7. Políticas de Match Stats
CREATE POLICY "Estatísticas públicas para leitura"
ON public.match_stats FOR SELECT USING (true);

CREATE POLICY "Apenas admins lançam estatísticas"
ON public.match_stats FOR ALL USING (public.is_admin());

-- 8. Políticas de Financial Ledger
CREATE POLICY "Jogadores autenticados visualizam a caixinha"
ON public.financial_ledger FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Apenas admins lançam despesas e receitas"
ON public.financial_ledger FOR ALL USING (public.is_admin());

-- 9. Storage Bucket: Avatars
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
