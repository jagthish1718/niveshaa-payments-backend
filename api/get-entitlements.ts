import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, getAuthedUserId } from './_supabaseAdmin';

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = await getAuthedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Please sign in.' });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from('entitlements')
      .select('plan_id, last_payment_id, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    const isSubscribed = !!data?.current_period_end && new Date(data.current_period_end) > new Date();

    return res.status(200).json({
      isSubscribed,
      planId: isSubscribed ? data?.plan_id ?? null : null,
      lastPaymentId: data?.last_payment_id ?? null,
      currentPeriodEnd: data?.current_period_end ?? null,
    });
  } catch (err) {
    console.error('get-entitlements failed', err);
    return res.status(502).json({ error: 'Could not load your membership status' });
  }
}
