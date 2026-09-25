CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, anon;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION private.is_editorial(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'editor', 'designer')
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_editorial(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_editorial(uuid) TO authenticated, anon;

DROP POLICY "Users can view own roles" ON public.user_roles;
DROP POLICY "Admins can add roles" ON public.user_roles;
DROP POLICY "Admins can update roles" ON public.user_roles;
DROP POLICY "Admins can remove roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can add roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can remove roles" ON public.user_roles FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY "Published editions are public" ON public.editions;
DROP POLICY "Editorial users create editions" ON public.editions;
DROP POLICY "Editorial users update editions" ON public.editions;
DROP POLICY "Admins delete editions" ON public.editions;
CREATE POLICY "Published editions are public" ON public.editions FOR SELECT TO anon, authenticated USING (status = 'published' OR private.is_editorial(auth.uid()));
CREATE POLICY "Editorial users create editions" ON public.editions FOR INSERT TO authenticated WITH CHECK (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial users update editions" ON public.editions FOR UPDATE TO authenticated USING (private.is_editorial(auth.uid())) WITH CHECK (private.is_editorial(auth.uid()));
CREATE POLICY "Admins delete editions" ON public.editions FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY "Published edition pages are public" ON public.edition_pages;
DROP POLICY "Editorial users create pages" ON public.edition_pages;
DROP POLICY "Editorial users update pages" ON public.edition_pages;
DROP POLICY "Editorial users delete pages" ON public.edition_pages;
CREATE POLICY "Published edition pages are public" ON public.edition_pages FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.editions e WHERE e.id = edition_id AND (e.status = 'published' OR private.is_editorial(auth.uid()))));
CREATE POLICY "Editorial users create pages" ON public.edition_pages FOR INSERT TO authenticated WITH CHECK (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial users update pages" ON public.edition_pages FOR UPDATE TO authenticated USING (private.is_editorial(auth.uid())) WITH CHECK (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial users delete pages" ON public.edition_pages FOR DELETE TO authenticated USING (private.is_editorial(auth.uid()));

DROP POLICY "Editorial users view sources" ON public.source_items;
DROP POLICY "Editorial users create sources" ON public.source_items;
DROP POLICY "Editorial users update sources" ON public.source_items;
DROP POLICY "Editorial users delete sources" ON public.source_items;
CREATE POLICY "Editorial users view sources" ON public.source_items FOR SELECT TO authenticated USING (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial users create sources" ON public.source_items FOR INSERT TO authenticated WITH CHECK (private.is_editorial(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Editorial users update sources" ON public.source_items FOR UPDATE TO authenticated USING (private.is_editorial(auth.uid())) WITH CHECK (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial users delete sources" ON public.source_items FOR DELETE TO authenticated USING (private.is_editorial(auth.uid()));

DROP POLICY "Editorial users view articles" ON public.articles;
DROP POLICY "Editorial users create articles" ON public.articles;
DROP POLICY "Editorial users update articles" ON public.articles;
DROP POLICY "Editorial users delete articles" ON public.articles;
CREATE POLICY "Editorial users view articles" ON public.articles FOR SELECT TO authenticated USING (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial users create articles" ON public.articles FOR INSERT TO authenticated WITH CHECK (private.is_editorial(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Editorial users update articles" ON public.articles FOR UPDATE TO authenticated USING (private.is_editorial(auth.uid())) WITH CHECK (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial users delete articles" ON public.articles FOR DELETE TO authenticated USING (private.is_editorial(auth.uid()));

DROP POLICY "Published page blocks are public" ON public.page_blocks;
DROP POLICY "Editorial users create blocks" ON public.page_blocks;
DROP POLICY "Editorial users update blocks" ON public.page_blocks;
DROP POLICY "Editorial users delete blocks" ON public.page_blocks;
CREATE POLICY "Published page blocks are public" ON public.page_blocks FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.edition_pages p JOIN public.editions e ON e.id = p.edition_id WHERE p.id = page_id AND (e.status = 'published' OR private.is_editorial(auth.uid()))));
CREATE POLICY "Editorial users create blocks" ON public.page_blocks FOR INSERT TO authenticated WITH CHECK (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial users update blocks" ON public.page_blocks FOR UPDATE TO authenticated USING (private.is_editorial(auth.uid())) WITH CHECK (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial users delete blocks" ON public.page_blocks FOR DELETE TO authenticated USING (private.is_editorial(auth.uid()));

DROP POLICY "Published share cards are public" ON public.share_cards;
DROP POLICY "Editorial users create share cards" ON public.share_cards;
DROP POLICY "Editorial users update share cards" ON public.share_cards;
DROP POLICY "Editorial users delete share cards" ON public.share_cards;
CREATE POLICY "Published share cards are public" ON public.share_cards FOR SELECT TO anon, authenticated USING ((edition_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.editions e WHERE e.id = edition_id AND e.status = 'published')) OR private.is_editorial(auth.uid()));
CREATE POLICY "Editorial users create share cards" ON public.share_cards FOR INSERT TO authenticated WITH CHECK (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial users update share cards" ON public.share_cards FOR UPDATE TO authenticated USING (private.is_editorial(auth.uid())) WITH CHECK (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial users delete share cards" ON public.share_cards FOR DELETE TO authenticated USING (private.is_editorial(auth.uid()));

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_editorial(uuid) FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.has_role(uuid, public.app_role);
DROP FUNCTION public.is_editorial(uuid);