-- ==========================================================
-- Medimall Patient Feedback Messenger: Supabase Schema (v1.0)
-- Matches SRS Section 5 Data Model & Security Requirements
-- ==========================================================

-- 1. Create Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    review_link TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
    visit_time TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    sent_language TEXT CHECK (sent_language IN ('en', 'ml')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Create Message Templates Table
CREATE TABLE IF NOT EXISTS public.templates (
    language TEXT PRIMARY KEY CHECK (language IN ('en', 'ml')),
    body TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Create Indexes for High Performance Queries (FR-4 Table search & visit_time sorting)
CREATE INDEX IF NOT EXISTS idx_patients_visit_time ON public.patients(visit_time DESC);
CREATE INDEX IF NOT EXISTS idx_patients_name_phone ON public.patients(name, phone);
CREATE INDEX IF NOT EXISTS idx_patients_branch_id ON public.patients(branch_id);

-- 5. Row Level Security (RLS)
-- Per SRS: Supabase tables have row-level security enabled with no public policies.
-- Only the server uses the service-role key.
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Note: No PUBLIC policies are added. The service_role key bypasses RLS on the server routes.

-- 6. Default Seed Data
INSERT INTO public.branches (name, review_link) VALUES
('Kunnamangalam', 'https://search.google.com/local/writereview?placeid=ChIJWy50EdNdpjsR4vFgODmfdh8'),
('Malappuram', 'https://search.google.com/local/writereview?placeid=ChIJ7VJ-NwBLpjsRptYYI9zGaHo')
ON CONFLICT (name) DO UPDATE 
SET review_link = EXCLUDED.review_link;

INSERT INTO public.templates (language, body) VALUES
('en', 'Hello {name}, thank you for visiting Medimall {branch}. Your feedback means a lot to us. Could you please take a minute to share your experience on Google? {review_link}'),
('ml', 'നമസ്കാരം {name}, Medimall {branch} സന്ദർശിച്ചതിന് നന്ദി. താങ്കളുടെ അഭിപ്രായം ഞങ്ങൾക്ക് വളരെ വിലപ്പെട്ടതാണ്. ദയവായി ഒരു ഗൂഗിൾ റിവ്യൂ നൽകാമോ? {review_link}')
ON CONFLICT (language) DO UPDATE
SET body = EXCLUDED.body, updated_at = NOW();
