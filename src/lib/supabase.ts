import { createClient } from '@supabase/supabase-js'

// Try to get from environment variables first, then fallback to hardcoded values if needed
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ixvnzfxvqvfkxnwfnbxs.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4dm56Znh2cXZma3hud2ZuYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk2NTI0NzcsImV4cCI6MjAyNTIyODQ3N30.Wd0jdhgKpZWRXEQQcCBFIlQQGQoFW5VW6PrZF2Xbq8Y'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  )
}

if (supabaseUrl.includes('your-project-url') || supabaseAnonKey.includes('your-anon-key')) {
  throw new Error(
    'Please update your Supabase environment variables in the .env file with your actual project URL and API key from your Supabase dashboard.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
})