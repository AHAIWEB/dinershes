DO $$ BEGIN PERFORM cron.unschedule('publish-due-epaper-editions'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP FUNCTION IF EXISTS public.publish_due_editions();

ALTER TABLE public.editions ADD COLUMN IF NOT EXISTS approved_by uuid, ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.edition_pages ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approved_by uuid, ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;
UPDATE public.edition_pages p SET status='published', published_at=e.published_at
  FROM public.editions e WHERE e.id=p.edition_id AND e.status='published';
UPDATE public.editions SET approved_at = coalesce(published_at, now()) WHERE status='published' AND approved_at IS NULL;
UPDATE public.editions SET status='review', scheduled_for=NULL WHERE status='scheduled';

CREATE OR REPLACE FUNCTION private.can_approve(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_uid AND role IN ('admin','editor'))
$$;
REVOKE ALL ON FUNCTION private.can_approve(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_approve(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_edition_workflow() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE trusted boolean := auth.uid() IS NULL AND current_user NOT IN ('anon','authenticated');
BEGIN
  IF NEW.status = 'scheduled' THEN RAISE EXCEPTION 'স্বয়ংক্রিয় প্রকাশ বন্ধ; সংস্করণ হাতে প্রকাশ করুন।'; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' AND NEW.status <> 'published' AND NOT trusted THEN
    RAISE EXCEPTION 'প্রকাশিত সংস্করণ পরিবর্তন করা যাবে না।'; END IF;
  IF NEW.status = 'approved' AND (TG_OP='INSERT' OR OLD.status <> 'approved') THEN
    IF NOT trusted AND NOT private.can_approve(auth.uid()) THEN RAISE EXCEPTION 'শুধু সম্পাদক অনুমোদন দিতে পারেন।'; END IF;
    NEW.approved_by := coalesce(auth.uid(), NEW.approved_by); NEW.approved_at := now();
  ELSIF NEW.status IN ('draft','review') THEN
    NEW.approved_by := NULL; NEW.approved_at := NULL; NEW.published_at := NULL;
  ELSIF NEW.status = 'published' AND (TG_OP='INSERT' OR OLD.status <> 'published') THEN
    IF NOT trusted AND NOT private.can_approve(auth.uid()) THEN RAISE EXCEPTION 'শুধু সম্পাদক প্রকাশ করতে পারেন।'; END IF;
    IF TG_OP='INSERT' OR OLD.status <> 'approved' OR NEW.approved_at IS NULL THEN
      RAISE EXCEPTION 'সম্পাদকের অনুমোদন ছাড়া সংস্করণ প্রকাশ হবে না।'; END IF;
    IF (SELECT count(*) FROM public.edition_pages p WHERE p.edition_id = NEW.id) <> 4 THEN
      RAISE EXCEPTION 'পুরো সংস্করণ প্রকাশে চারটি পাতা লাগবে।'; END IF;
    NEW.published_at := now();
    UPDATE public.edition_pages SET status='published', published_at=coalesce(published_at, now()),
      approved_at=coalesce(approved_at, NEW.approved_at), approved_by=coalesce(approved_by, NEW.approved_by)
      WHERE edition_id = NEW.id AND status <> 'published';
  END IF;
  NEW.scheduled_for := NULL;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS editions_workflow ON public.editions;
CREATE TRIGGER editions_workflow BEFORE INSERT OR UPDATE ON public.editions FOR EACH ROW EXECUTE FUNCTION public.enforce_edition_workflow();

CREATE OR REPLACE FUNCTION public.enforce_page_workflow() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE trusted boolean := auth.uid() IS NULL AND current_user NOT IN ('anon','authenticated');
BEGIN
  IF NEW.status NOT IN ('draft','approved','published') THEN RAISE EXCEPTION 'অবৈধ পাতার অবস্থা'; END IF;
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.status='published' AND NEW.status <> 'published' AND NOT trusted THEN
    RAISE EXCEPTION 'প্রকাশিত পাতা পরিবর্তন করা যাবে না।'; END IF;
  IF NEW.status='approved' AND (TG_OP='INSERT' OR OLD.status <> 'approved') THEN
    IF NOT trusted AND NOT private.can_approve(auth.uid()) THEN RAISE EXCEPTION 'শুধু সম্পাদক অনুমোদন দিতে পারেন।'; END IF;
    NEW.approved_by := coalesce(auth.uid(), NEW.approved_by); NEW.approved_at := now();
  ELSIF NEW.status='draft' THEN
    NEW.approved_by := NULL; NEW.approved_at := NULL; NEW.published_at := NULL;
  ELSIF NEW.status='published' AND (TG_OP='INSERT' OR OLD.status <> 'published') THEN
    IF NOT trusted AND NOT private.can_approve(auth.uid()) THEN RAISE EXCEPTION 'শুধু সম্পাদক প্রকাশ করতে পারেন।'; END IF;
    IF TG_OP='INSERT' OR OLD.status <> 'approved' OR NEW.approved_at IS NULL THEN
      RAISE EXCEPTION 'সম্পাদকের অনুমোদন ছাড়া পাতা প্রকাশ হবে না।'; END IF;
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS edition_pages_workflow ON public.edition_pages;
CREATE TRIGGER edition_pages_workflow BEFORE INSERT OR UPDATE ON public.edition_pages FOR EACH ROW EXECUTE FUNCTION public.enforce_page_workflow();

DROP POLICY IF EXISTS "Published editions are public" ON public.editions;
CREATE POLICY "Published editions are public" ON public.editions FOR SELECT TO anon, authenticated
USING (status='published' OR private.is_editorial(auth.uid())
  OR EXISTS (SELECT 1 FROM public.edition_pages p WHERE p.edition_id=editions.id AND p.status='published'));

DROP POLICY IF EXISTS "Published edition pages are public" ON public.edition_pages;
CREATE POLICY "Published edition pages are public" ON public.edition_pages FOR SELECT TO anon, authenticated
USING (status='published' OR private.is_editorial(auth.uid()));

DROP POLICY IF EXISTS "Published page blocks are public" ON public.page_blocks;
CREATE POLICY "Published page blocks are public" ON public.page_blocks FOR SELECT TO anon, authenticated
USING (private.is_editorial(auth.uid()) OR EXISTS (SELECT 1 FROM public.edition_pages p WHERE p.id=page_blocks.page_id AND p.status='published'));

REVOKE EXECUTE ON FUNCTION public.enforce_edition_workflow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_page_workflow() FROM PUBLIC, anon, authenticated;