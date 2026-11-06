CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.render_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL, url text NOT NULL, api_key text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL, name text NOT NULL, token text NOT NULL DEFAULT '',
  render_server_id uuid REFERENCES public.render_servers(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway_id uuid REFERENCES public.gateways(id) ON DELETE SET NULL,
  external_id text, event text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL DEFAULT 'outro',
  customer_name text NOT NULL DEFAULT '', customer_email text NOT NULL DEFAULT '', customer_phone text NOT NULL DEFAULT '',
  product text NOT NULL DEFAULT '', value numeric NOT NULL DEFAULT 0, fee numeric NOT NULL DEFAULT 0,
  checkout_url text NOT NULL DEFAULT '', pix_code text NOT NULL DEFAULT '',
  recovered boolean NOT NULL DEFAULT false,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gateway_id, external_id)
);
CREATE INDEX orders_user_created ON public.orders(user_id, created_at DESC);
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL, role text NOT NULL DEFAULT 'suporte', prompt text NOT NULL DEFAULT '',
  channels text[] NOT NULL DEFAULT '{}', active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL, trigger text NOT NULL DEFAULT 'carrinho_abandonado',
  active boolean NOT NULL DEFAULT false,
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb, edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER flows_updated BEFORE UPDATE ON public.flows FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TABLE public.flow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flow_id uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  node_id text, status text NOT NULL DEFAULT 'waiting', resume_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX flow_runs_due ON public.flow_runs(status, resume_at);
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  flow_id uuid REFERENCES public.flows(id) ON DELETE SET NULL,
  channel text NOT NULL, recipient text NOT NULL, body text NOT NULL,
  ok boolean NOT NULL DEFAULT true, error text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name text NOT NULL DEFAULT 'Minha loja',
  ai_provider text NOT NULL DEFAULT 'deepseek',
  ai_base_url text NOT NULL DEFAULT 'https://api.deepseek.com',
  ai_key text NOT NULL DEFAULT '', ai_model text NOT NULL DEFAULT 'deepseek-chat',
  telegram_token text NOT NULL DEFAULT '',
  whatsapp_server_id uuid REFERENCES public.render_servers(id) ON DELETE SET NULL,
  sms_server_id uuid REFERENCES public.render_servers(id) ON DELETE SET NULL,
  email_server_id uuid REFERENCES public.render_servers(id) ON DELETE SET NULL,
  product_cost_percent numeric NOT NULL DEFAULT 0,
  marketing_spend numeric NOT NULL DEFAULT 0,
  tax_percent numeric NOT NULL DEFAULT 0,
  cron_secret text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['render_servers','gateways','orders','agents','flows','flow_runs','messages','settings'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "owner_all" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);
  END LOOP;
END $$;