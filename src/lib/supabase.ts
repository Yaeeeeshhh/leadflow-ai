import { createClient } from '@supabase/supabase-js'

const env = import.meta.env
const supabaseUrl = env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY) as string | undefined

export const supabaseConfig = {
  ready: Boolean(supabaseUrl && supabaseKey),
  hasUrl: Boolean(supabaseUrl),
  hasPublicKey: Boolean(supabaseKey),
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null
