
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are readable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Apiaries (пасіки)
CREATE TABLE public.apiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apiaries TO authenticated;
GRANT ALL ON public.apiaries TO service_role;
ALTER TABLE public.apiaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own apiaries" ON public.apiaries FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER apiaries_updated_at BEFORE UPDATE ON public.apiaries
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Hives (вулики/бджолосім'ї)
CREATE TABLE public.hives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  apiary_id UUID REFERENCES public.apiaries(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  breed TEXT,
  queen_year INT,
  queen_mark TEXT,
  installed_at DATE,
  frames_total INT,
  frames_brood INT,
  strength TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hives TO authenticated;
GRANT ALL ON public.hives TO service_role;
ALTER TABLE public.hives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own hives" ON public.hives FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER hives_updated_at BEFORE UPDATE ON public.hives
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX hives_user_idx ON public.hives(user_id);

-- Inspections (огляди)
CREATE TABLE public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hive_id UUID NOT NULL REFERENCES public.hives(id) ON DELETE CASCADE,
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  frames_brood INT,
  frames_bees INT,
  queen_seen BOOLEAN,
  mood TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO authenticated;
GRANT ALL ON public.inspections TO service_role;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own inspections" ON public.inspections FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX inspections_hive_idx ON public.inspections(hive_id);

-- Feedings (годування)
CREATE TABLE public.feedings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hive_id UUID NOT NULL REFERENCES public.hives(id) ON DELETE CASCADE,
  fed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  feed_type TEXT,
  amount TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedings TO authenticated;
GRANT ALL ON public.feedings TO service_role;
ALTER TABLE public.feedings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own feedings" ON public.feedings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Treatments (обробки)
CREATE TABLE public.treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hive_id UUID NOT NULL REFERENCES public.hives(id) ON DELETE CASCADE,
  treated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  product TEXT,
  dose TEXT,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatments TO authenticated;
GRANT ALL ON public.treatments TO service_role;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own treatments" ON public.treatments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Harvests (збір меду)
CREATE TABLE public.harvests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hive_id UUID REFERENCES public.hives(id) ON DELETE SET NULL,
  harvested_at DATE NOT NULL DEFAULT CURRENT_DATE,
  honey_kg NUMERIC,
  honey_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.harvests TO authenticated;
GRANT ALL ON public.harvests TO service_role;
ALTER TABLE public.harvests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own harvests" ON public.harvests FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Queen rearing batches (виведення маток)
CREATE TABLE public.queen_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grafted_on DATE NOT NULL,
  mother_hive TEXT,
  count INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.queen_batches TO authenticated;
GRANT ALL ON public.queen_batches TO service_role;
ALTER TABLE public.queen_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own queen batches" ON public.queen_batches FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Calendar events (календар пасічника)
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  description TEXT,
  category TEXT,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own events" ON public.calendar_events FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Marketplace listings (купи/продай)
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'sell',
  category TEXT,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  currency TEXT DEFAULT 'UAH',
  contact TEXT,
  location TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT SELECT ON public.listings TO anon;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Listings public read" ON public.listings FOR SELECT USING (true);
CREATE POLICY "Owner insert listing" ON public.listings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update listing" ON public.listings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner delete listing" ON public.listings FOR DELETE USING (auth.uid() = user_id);

-- Chat messages (чат бджолярів)
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users read chat" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users post chat" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner delete own message" ON public.chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
