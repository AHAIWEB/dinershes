CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'designer');
CREATE TYPE public.edition_status AS ENUM ('draft', 'review', 'approved', 'scheduled', 'published');
CREATE TYPE public.article_status AS ENUM ('source', 'ai_draft', 'approved', 'placed', 'published');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_editorial(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'editor', 'designer')
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_editorial(uuid) TO authenticated;

CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can add roles" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can remove roles" ON public.user_roles
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_number text NOT NULL UNIQUE,
  publication_date date NOT NULL,
  date_bn text NOT NULL,
  hijri_date text NOT NULL DEFAULT '',
  status public.edition_status NOT NULL DEFAULT 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.editions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.editions TO authenticated;
GRANT ALL ON public.editions TO service_role;
ALTER TABLE public.editions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published editions are public" ON public.editions
FOR SELECT TO anon, authenticated USING (status = 'published' OR public.is_editorial(auth.uid()));
CREATE POLICY "Editorial users create editions" ON public.editions
FOR INSERT TO authenticated WITH CHECK (public.is_editorial(auth.uid()));
CREATE POLICY "Editorial users update editions" ON public.editions
FOR UPDATE TO authenticated USING (public.is_editorial(auth.uid())) WITH CHECK (public.is_editorial(auth.uid()));
CREATE POLICY "Admins delete editions" ON public.editions
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.edition_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  page_number integer NOT NULL CHECK (page_number > 0),
  title text NOT NULL,
  section text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (edition_id, page_number)
);
GRANT SELECT ON public.edition_pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.edition_pages TO authenticated;
GRANT ALL ON public.edition_pages TO service_role;
ALTER TABLE public.edition_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published edition pages are public" ON public.edition_pages
FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM public.editions e WHERE e.id = edition_id AND (e.status = 'published' OR public.is_editorial(auth.uid())))
);
CREATE POLICY "Editorial users create pages" ON public.edition_pages
FOR INSERT TO authenticated WITH CHECK (public.is_editorial(auth.uid()));
CREATE POLICY "Editorial users update pages" ON public.edition_pages
FOR UPDATE TO authenticated USING (public.is_editorial(auth.uid())) WITH CHECK (public.is_editorial(auth.uid()));
CREATE POLICY "Editorial users delete pages" ON public.edition_pages
FOR DELETE TO authenticated USING (public.is_editorial(auth.uid()));

CREATE TABLE public.source_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text,
  source_domain text,
  source_title text NOT NULL DEFAULT '',
  raw_text text NOT NULL DEFAULT '',
  key_facts text NOT NULL DEFAULT '',
  lead_image_url text,
  fetch_status text NOT NULL DEFAULT 'manual',
  fetch_error text,
  fetched_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.source_items TO authenticated;
GRANT ALL ON public.source_items TO service_role;
ALTER TABLE public.source_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Editorial users view sources" ON public.source_items
FOR SELECT TO authenticated USING (public.is_editorial(auth.uid()));
CREATE POLICY "Editorial users create sources" ON public.source_items
FOR INSERT TO authenticated WITH CHECK (public.is_editorial(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Editorial users update sources" ON public.source_items
FOR UPDATE TO authenticated USING (public.is_editorial(auth.uid())) WITH CHECK (public.is_editorial(auth.uid()));
CREATE POLICY "Editorial users delete sources" ON public.source_items
FOR DELETE TO authenticated USING (public.is_editorial(auth.uid()));

CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.source_items(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  key_facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_caption text NOT NULL DEFAULT '',
  source_note text NOT NULL DEFAULT '',
  section text NOT NULL DEFAULT 'প্রচ্ছদ',
  status public.article_status NOT NULL DEFAULT 'source',
  created_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Editorial users view articles" ON public.articles
FOR SELECT TO authenticated USING (public.is_editorial(auth.uid()));
CREATE POLICY "Editorial users create articles" ON public.articles
FOR INSERT TO authenticated WITH CHECK (public.is_editorial(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Editorial users update articles" ON public.articles
FOR UPDATE TO authenticated USING (public.is_editorial(auth.uid())) WITH CHECK (public.is_editorial(auth.uid()));
CREATE POLICY "Editorial users delete articles" ON public.articles
FOR DELETE TO authenticated USING (public.is_editorial(auth.uid()));

CREATE TABLE public.page_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.edition_pages(id) ON DELETE CASCADE,
  article_id uuid REFERENCES public.articles(id) ON DELETE SET NULL,
  block_type text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  column_start integer NOT NULL DEFAULT 1 CHECK (column_start BETWEEN 1 AND 6),
  column_span integer NOT NULL DEFAULT 1 CHECK (column_span BETWEEN 1 AND 6),
  section text NOT NULL DEFAULT 'প্রচ্ছদ',
  label text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  credit text NOT NULL DEFAULT '',
  image_url text,
  style jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.page_blocks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.page_blocks TO authenticated;
GRANT ALL ON public.page_blocks TO service_role;
ALTER TABLE public.page_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published page blocks are public" ON public.page_blocks
FOR SELECT TO anon, authenticated USING (
  EXISTS (
    SELECT 1 FROM public.edition_pages p
    JOIN public.editions e ON e.id = p.edition_id
    WHERE p.id = page_id AND (e.status = 'published' OR public.is_editorial(auth.uid()))
  )
);
CREATE POLICY "Editorial users create blocks" ON public.page_blocks
FOR INSERT TO authenticated WITH CHECK (public.is_editorial(auth.uid()));
CREATE POLICY "Editorial users update blocks" ON public.page_blocks
FOR UPDATE TO authenticated USING (public.is_editorial(auth.uid())) WITH CHECK (public.is_editorial(auth.uid()));
CREATE POLICY "Editorial users delete blocks" ON public.page_blocks
FOR DELETE TO authenticated USING (public.is_editorial(auth.uid()));

CREATE TABLE public.share_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid REFERENCES public.editions(id) ON DELETE CASCADE,
  article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE,
  preset text NOT NULL CHECK (preset IN ('facebook', 'instagram', 'story')),
  headline text NOT NULL,
  section text NOT NULL DEFAULT '',
  image_url text,
  source_note text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (edition_id IS NOT NULL OR article_id IS NOT NULL)
);
GRANT SELECT ON public.share_cards TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.share_cards TO authenticated;
GRANT ALL ON public.share_cards TO service_role;
ALTER TABLE public.share_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published share cards are public" ON public.share_cards
FOR SELECT TO anon, authenticated USING (
  (edition_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.editions e WHERE e.id = edition_id AND e.status = 'published'))
  OR public.is_editorial(auth.uid())
);
CREATE POLICY "Editorial users create share cards" ON public.share_cards
FOR INSERT TO authenticated WITH CHECK (public.is_editorial(auth.uid()));
CREATE POLICY "Editorial users update share cards" ON public.share_cards
FOR UPDATE TO authenticated USING (public.is_editorial(auth.uid())) WITH CHECK (public.is_editorial(auth.uid()));
CREATE POLICY "Editorial users delete share cards" ON public.share_cards
FOR DELETE TO authenticated USING (public.is_editorial(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER editions_updated_at BEFORE UPDATE ON public.editions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER edition_pages_updated_at BEFORE UPDATE ON public.edition_pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER source_items_updated_at BEFORE UPDATE ON public.source_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER articles_updated_at BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER page_blocks_updated_at BEFORE UPDATE ON public.page_blocks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER share_cards_updated_at BEFORE UPDATE ON public.share_cards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX editions_publication_date_idx ON public.editions (publication_date DESC);
CREATE INDEX edition_pages_edition_idx ON public.edition_pages (edition_id, page_number);
CREATE INDEX page_blocks_page_idx ON public.page_blocks (page_id, sort_order);
CREATE INDEX articles_status_idx ON public.articles (status, updated_at DESC);

INSERT INTO public.editions (id, edition_number, publication_date, date_bn, hijri_date, status, published_at)
VALUES ('10000000-0000-4000-8000-000000000010', '১০', '2024-09-10', 'রবিবার, ১০ সেপ্টেম্বর ২০২৪', 'ঢাকা · ১৪৪৬ হিজরি', 'published', '2024-09-10T12:00:00Z');

INSERT INTO public.edition_pages (id, edition_id, page_number, title, section) VALUES
('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000010', 1, 'প্রচ্ছদ', 'প্রচ্ছদ'),
('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000010', 2, 'দেশ', 'দেশ'),
('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000010', 3, 'নগর', 'নগর'),
('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000010', 4, 'মতামত', 'মতামত');

INSERT INTO public.page_blocks (page_id, block_type, sort_order, column_start, column_span, section, label, body, credit, style) VALUES
('20000000-0000-4000-8000-000000000001', 'headline', 1, 1, 4, 'প্রচ্ছদ', 'নতুন দিনের শহর, মানুষের গল্প', 'পরিবর্তনের ভেতরেও শহর খুঁজে নেয় তার নিজস্ব ছন্দ। আমাদের বিশেষ প্রতিবেদনে থাকছে নাগরিক জীবনের নানা রঙ।', 'নিজস্ব প্রতিবেদক', '{"fontScale":1.35}'),
('20000000-0000-4000-8000-000000000001', 'article', 2, 5, 2, 'দেশ', 'শহরের নকশায় নতুন অধ্যায়', 'পরিকল্পনা ও বাস্তবতার মাঝখানে দাঁড়িয়ে বদলে যাচ্ছে নগরজীবনের রূপরেখা।', 'বার্তা ডেস্ক', '{}'),
('20000000-0000-4000-8000-000000000002', 'headline', 1, 1, 3, 'দেশ', 'গ্রাম থেকে শহর, বদলের হিসাব', 'কৃষি, শিক্ষা আর স্বাস্থ্যসেবার নতুন হিসাব মিলছে মাঠপর্যায়ের প্রতিবেদনে।', 'দেশ ডেস্ক', '{"fontScale":1.2}'),
('20000000-0000-4000-8000-000000000002', 'article', 2, 4, 3, 'দেশ', 'স্থানীয় বাজারে স্বস্তির আশা', 'সরবরাহ বাড়লে দাম কমবে—ব্যবসায়ীদের ভাষ্যে এমন আশাই শোনা গেল।', 'নিজস্ব প্রতিবেদক', '{}'),
('20000000-0000-4000-8000-000000000003', 'headline', 1, 1, 4, 'নগর', 'একটি শহর, অনেক স্মৃতি', 'ছবির অ্যালবামে ফিরে দেখা পুরোনো পাড়া, চেনা রাস্তা আর হারিয়ে যাওয়া বিকেল।', 'নগর ডেস্ক', '{"fontScale":1.2}'),
('20000000-0000-4000-8000-000000000003', 'quote', 2, 5, 2, 'মতামত', '‘শহর গড়ে ওঠে মানুষের অভ্যাসে’', '', 'নগর পরিকল্পনাবিদ', '{}'),
('20000000-0000-4000-8000-000000000004', 'headline', 1, 1, 3, 'মতামত', 'দিনের শেষ খবর, দিনের সবটুকু হিসাব', 'সারাদিনের গুরুত্বপূর্ণ খবর এক সংকলনে—পাঠকের জন্য সন্ধ্যার পাঠ।', 'সম্পাদকীয় বিভাগ', '{"fontScale":1.2}'),
('20000000-0000-4000-8000-000000000004', 'article', 2, 4, 3, 'মতামত', 'সম্পাদকীয়: তথ্যের দায়', 'খবর শুধু ঘটনা নয়, দায়িত্বও। পাঠকের আস্থা রক্ষাই আমাদের প্রথম শর্ত।', 'সম্পাদকীয় বিভাগ', '{}');