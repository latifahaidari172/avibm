import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server-side Supabase client. Used in server components, route handlers,
// and server actions. Reads + writes the session cookie via Next's cookies
// store. Use the anon key here — RLS will gate access. For
// service-role-key operations, keep using the existing supabase.ts.
export async function createSupabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component. Ignore — middleware refresh
            // will pick up the change on the next request.
          }
        },
      },
    },
  )
}
