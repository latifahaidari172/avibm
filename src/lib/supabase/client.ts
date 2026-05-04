import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client. Used inside client components (sign-in
// page, profile dashboard form submits, etc.). Cookie-backed session.
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
