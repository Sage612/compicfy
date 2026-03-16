-- 1. Feature flags table
CREATE TABLE feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  enabled_for_roles TEXT[] DEFAULT ARRAY['admin']::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert affiliate feature flag
INSERT INTO feature_flags (name, description, enabled, enabled_for_roles) 
VALUES ('affiliate_links', 'Enable affiliate merchandise links on comic pages', false, ARRAY['admin']);

-- 2. Affiliate clicks tracking
CREATE TABLE affiliate_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comic_id UUID NOT NULL, -- Assuming recommendations(id) or comics(id) in your schema
  comic_title TEXT NOT NULL,
  platform TEXT NOT NULL,
  product_type TEXT NOT NULL,
  genre TEXT,
  user_id UUID, -- References auth.users or profiles
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  converted BOOLEAN DEFAULT false,
  commission_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Affiliate earnings tracking
CREATE TABLE affiliate_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  click_id UUID REFERENCES affiliate_clicks(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Product mappings (genre to affiliate products)
CREATE TABLE affiliate_product_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  genre TEXT NOT NULL,
  platform TEXT NOT NULL,
  product_type TEXT NOT NULL,
  search_query_template TEXT NOT NULL,
  commission_range TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(genre, platform, product_type)
);

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_product_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view feature flags" ON feature_flags FOR SELECT USING (true);
-- Note: Replace 'profiles' with your actual user table if different, or handle admin checks via auth.jwt()
CREATE POLICY "Anyone can insert clicks" ON affiliate_clicks FOR INSERT WITH CHECK (true);