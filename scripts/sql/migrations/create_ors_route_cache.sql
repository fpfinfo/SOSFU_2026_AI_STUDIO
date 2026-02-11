-- Create table for ORS route caching
CREATE TABLE IF NOT EXISTS public.ors_route_cache (
    cache_key text PRIMARY KEY,
    from_label text,
    to_label text,
    distance_km double precision,
    duration_minutes double precision,
    route_data jsonb,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.ors_route_cache ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON public.ors_route_cache
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow insert/update access for authenticated users (or service role)
-- Assuming authenticated users (system) can populate cache
CREATE POLICY "Enable insert/update for authenticated users" ON public.ors_route_cache
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_ors_cache_expires ON public.ors_route_cache(expires_at);

comment on table public.ors_route_cache is 'Cache de rotas do OpenRouteService para evitar chamadas repetidas e rate limits.';
