CREATE TABLE public.saved_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  link text NOT NULL UNIQUE,
  summary text NOT NULL DEFAULT '',
  image_url text,
  category text NOT NULL DEFAULT 'জাতীয়',
  feed_id uuid REFERENCES public.rss_feeds(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_stories TO authenticated;
GRANT ALL ON public.saved_stories TO service_role;
ALTER TABLE public.saved_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Editorial view saved" ON public.saved_stories FOR SELECT TO authenticated USING (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial add saved" ON public.saved_stories FOR INSERT TO authenticated WITH CHECK (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial update saved" ON public.saved_stories FOR UPDATE TO authenticated USING (private.is_editorial(auth.uid())) WITH CHECK (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial delete saved" ON public.saved_stories FOR DELETE TO authenticated USING (private.is_editorial(auth.uid()));
CREATE TRIGGER saved_stories_updated_at BEFORE UPDATE ON public.saved_stories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.rss_feeds ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'feed';
ALTER TABLE public.editions ADD COLUMN IF NOT EXISTS design jsonb NOT NULL DEFAULT '{}'::jsonb;