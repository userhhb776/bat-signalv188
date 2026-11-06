CREATE OR REPLACE FUNCTION public.block_new_signups() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) <> 'marketinggeralconta@gmail.com' THEN
    RAISE EXCEPTION 'Cadastro desativado';
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.block_new_signups() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS block_new_signups ON auth.users;
CREATE TRIGGER block_new_signups BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.block_new_signups();