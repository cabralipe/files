import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// Singleton browser client — one GoTrueClient per browser context
export const supabase = createClient(supabaseUrl, supabaseKey)
