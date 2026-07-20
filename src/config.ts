/**
 * Supabase-konfiguration för crowdsourcing ("Föreslå plats").
 * Sätts vid bygget via miljövariabler (repo-variabler i GitHub Actions):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 *
 * Anon-nyckeln är säker att exponera i frontend – dataskyddet sköts av
 * Row Level Security i databasen (se docs/SUPABASE.md). Saknas värdena
 * döljs "Föreslå plats"-funktionen och appen fungerar som vanligt.
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const communityEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
