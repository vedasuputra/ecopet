import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Anon key is safe in the browser: row-level security limits each user to their own rows.
export const supabase = url && anon ? createClient(url, anon) : null
