import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { isPlanId, type PlanId } from './_plans';
import { getSupabaseAdmin, getAuthedUserId } from './_supabaseAdmin';

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const PLAN_DURATION_MONTHS: Record<PlanId, number> = {
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  annual: 12,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return res.status(500).json({ error: 'Server is not configured with Razorpay keys yet' });
  }

  const userId = await getAuthedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Please sign in.' });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = (req.body ?? {}) as {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    planId?: unknown;
  };

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !isPlanId(planId)) {
    return res.status(400).json({ error: 'Missing payment fields' });
  }

  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const verified = expected === razorpay_signature;

  if (!verified) {
    return res.status(400).json({ verified: false, error: 'Signature mismatch' });
  }

  // Signature checks out — extend (or start) this account's membership
  // period in Supabase. This is the single source of truth the app reads
  // back from /api/get-entitlements; local device storage is just a cache.
  let currentPeriodEnd: string | null = null;
  try {
    const admin = getSupabaseAdmin();
    const { data: existing } = await admin
      .from('entitlements')
      .select('current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    const now = new Date();
    const existingEnd = existing?.current_period_end ? new Date(existing.current_period_end) : null;
    const base = existingEnd && existingEnd > now ? existingEnd : now;
    const periodEnd = new Date(base);
    periodEnd.setMonth(periodEnd.getMonth() + PLAN_DURATION_MONTHS[planId]);
    currentPeriodEnd = periodEnd.toISOString();

    const { error: upsertError } = await admin.from('entitlements').upsert({
      user_id: userId,
      plan_id: planId,
      last_payment_id: razorpay_payment_id,
      current_period_end: currentPeriodEnd,
      updated_at: now.toISOString(),
    });
    if (upsertError) throw upsertError;
  } catch (err) {
    console.error('failed to record entitlement after verified payment', err);
    // The payment itself is genuine and verified — don't tell the user it
    // failed. The account just won't show as subscribed until this is
    // retried; log it loudly so it gets noticed.
  }

  return res.status(200).json({
    verified: true,
    planId,
    paymentId: razorpay_payment_id,
    currentPeriodEnd,
  });
}
