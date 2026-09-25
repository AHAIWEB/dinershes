-- lovable-cron-fallback-reviewed: No delayed workflow provider is configured; minute polling preserves editor-selected publication times to within one minute.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE OR REPLACE FUNCTION public.publish_due_editions() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE published_count integer;
BEGIN
  UPDATE public.editions SET status = 'published', published_at = now(), updated_at = now()
  WHERE status = 'scheduled' AND scheduled_for <= now()
    AND (SELECT count(*) FROM public.edition_pages p WHERE p.edition_id = editions.id) = 4;
  GET DIAGNOSTICS published_count = ROW_COUNT;
  RETURN published_count;
END;
$$;
REVOKE ALL ON FUNCTION public.publish_due_editions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_due_editions() TO service_role;
SELECT cron.schedule('publish-due-epaper-editions', '* * * * *', 'SELECT public.publish_due_editions()');