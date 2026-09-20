import type { VercelRequest } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Server-only Supabase client using the service_role key — this bypasses
// Row Level Security, so it must NEVER be used to return raw data to the
// client without checking auth.uid() ourselves first (see getAuthedUserId).
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase is not configured on the server yet');
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Verifies the Supabase access token the app sends in the Authorization
// header and returns the real, server-confirmed user id — never trust a
// user id the client claims directly.
export async function getAuthedUserId(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length);
  if (!token) return null;
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}
