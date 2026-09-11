-- Wayne Portfolio — Full Database Schema with RLS
-- Run this in Supabase SQL Editor

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- TABLES
-- ============================================================

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT,
  role TEXT,
  summary TEXT,
  description TEXT,
  problem TEXT,
  objective TEXT,
  strategy TEXT,
  execution TEXT,
  results TEXT,
  lessons TEXT,
  image TEXT,
  link TEXT,
  featured BOOLEAN DEFAULT FALSE,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_published ON projects(published);
CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects(featured);

-- Case Studies (linked to projects)
CREATE TABLE IF NOT EXISTS case_studies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  context TEXT,
  problem TEXT,
  objective TEXT,
  research TEXT,
  strategy TEXT,
  execution TEXT,
  challenges TEXT,
  decisions TEXT,
  results TEXT,
  lessons TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_studies_project_id ON case_studies(project_id);

-- Articles
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  category TEXT,
  tags TEXT[],
  cover_image TEXT,
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  reading_time INTEGER,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);

-- Experience
CREATE TABLE IF NOT EXISTS experience (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization TEXT NOT NULL,
  role TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  achievements TEXT[],
  link TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experience_order ON experience(order_index);

-- Services
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  audience TEXT,
  deliverables TEXT[],
  published BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metrics (attached to projects)
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  context TEXT,
  date_range TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_project_id ON metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_metrics_verified ON metrics(verified);

-- Testimonials
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT,
  organization TEXT,
  quote TEXT NOT NULL,
  image TEXT,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  reason TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'unread',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- Media library
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  type TEXT,
  size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_studies_updated_at
  BEFORE UPDATE ON case_studies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Projects: public can read published; authenticated can do all
CREATE POLICY "Public can read published projects"
  ON projects FOR SELECT
  USING (published = TRUE);

CREATE POLICY "Authenticated can manage projects"
  ON projects FOR ALL
  USING (auth.role() = 'authenticated');

-- Case Studies: public can read if project is published
CREATE POLICY "Public can read case studies for published projects"
  ON case_studies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = case_studies.project_id
      AND projects.published = TRUE
    )
  );

CREATE POLICY "Authenticated can manage case studies"
  ON case_studies FOR ALL
  USING (auth.role() = 'authenticated');

-- Articles: public can read published and past-dated articles
CREATE POLICY "Public can read published articles"
  ON articles FOR SELECT
  USING (published = TRUE AND (published_at IS NULL OR published_at <= NOW()));

CREATE POLICY "Authenticated can manage articles"
  ON articles FOR ALL
  USING (auth.role() = 'authenticated');

-- Experience: public can read all
CREATE POLICY "Public can read experience"
  ON experience FOR SELECT
  USING (TRUE);

CREATE POLICY "Authenticated can manage experience"
  ON experience FOR ALL
  USING (auth.role() = 'authenticated');

-- Services: public can read published
CREATE POLICY "Public can read published services"
  ON services FOR SELECT
  USING (published = TRUE);

CREATE POLICY "Authenticated can manage services"
  ON services FOR ALL
  USING (auth.role() = 'authenticated');

-- Metrics: public can read verified metrics
CREATE POLICY "Public can read verified metrics"
  ON metrics FOR SELECT
  USING (verified = TRUE);

CREATE POLICY "Authenticated can manage metrics"
  ON metrics FOR ALL
  USING (auth.role() = 'authenticated');

-- Testimonials: public can read published
CREATE POLICY "Public can read published testimonials"
  ON testimonials FOR SELECT
  USING (published = TRUE);

CREATE POLICY "Authenticated can manage testimonials"
  ON testimonials FOR ALL
  USING (auth.role() = 'authenticated');

-- Messages: authenticated only (no public read or insert via RLS; use server action)
CREATE POLICY "Authenticated can manage messages"
  ON messages FOR ALL
  USING (auth.role() = 'authenticated');

-- Allow insert for anonymous (contact form) via service role
CREATE POLICY "Service role can insert messages"
  ON messages FOR INSERT
  WITH CHECK (TRUE);

-- Media: public can read
CREATE POLICY "Public can read media"
  ON media FOR SELECT
  USING (TRUE);

CREATE POLICY "Authenticated can manage media"
  ON media FOR ALL
  USING (auth.role() = 'authenticated');

-- Settings: public can read
CREATE POLICY "Public can read settings"
  ON settings FOR SELECT
  USING (TRUE);

CREATE POLICY "Authenticated can manage settings"
  ON settings FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================================
-- DEFAULT SETTINGS SEED
-- ============================================================

INSERT INTO settings (key, value) VALUES
  ('site_name', 'Wayne'),
  ('site_tagline', 'Web3 Growth Strategist, Researcher & Builder'),
  ('bio_short', '[PLACEHOLDER — Add your short bio here]'),
  ('bio_long', '[PLACEHOLDER — Add your full bio here]'),
  ('profile_image', ''),
  ('x_handle', '@defiwaynex'),
  ('x_url', 'https://x.com/defiwaynex'),
  ('telegram_url', ''),
  ('linkedin_url', ''),
  ('email', ''),
  ('seo_title', 'Wayne — Web3 Growth Strategist, Researcher & Builder'),
  ('seo_description', 'Henshaw Joseph (Wayne) is a Web3 growth strategist, researcher, writer and founder.'),
  ('og_image', ''),
  ('featured_project_ids', '[]'),
  ('featured_article_ids', '[]'),
  ('beliefs', '[]'),
  ('currently', '[PLACEHOLDER — What are you working on right now?]')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- DEFAULT SERVICES SEED
-- ============================================================

INSERT INTO services (title, description, audience, deliverables, published, order_index) VALUES
(
  'Growth Strategy',
  'Growth planning, acquisition, activation and retention strategy for Web3 products and communities.',
  'Web3 founders and teams that have a product but are struggling to grow it sustainably.',
  ARRAY['Growth audit', 'Acquisition strategy', 'Retention framework', 'Community growth plan', 'Monthly advisory'],
  TRUE, 1
),
(
  'Research & Strategy',
  'Market research, protocol analysis, competitive intelligence and strategic recommendations.',
  'Projects that need a clear picture of their market, competitors and user landscape before making decisions.',
  ARRAY['Market research report', 'Protocol analysis', 'Competitive map', 'Strategic recommendations'],
  TRUE, 2
),
(
  'Content & Distribution',
  'Research-led content strategy and founder-led distribution for Web3 products.',
  'Founders and projects that want content that actually builds authority and creates distribution.',
  ARRAY['Content strategy', 'Content calendar', 'Research-led articles', 'Distribution plan'],
  TRUE, 3
),
(
  'Web3 / Product Strategy',
  'Helping early-stage Web3 products understand positioning, users, product direction and go-to-market.',
  'Early-stage Web3 founders building products who need strategic clarity before scaling.',
  ARRAY['Positioning workshop', 'User research synthesis', 'GTM strategy', 'Product strategy session'],
  TRUE, 4
)
ON CONFLICT DO NOTHING;
