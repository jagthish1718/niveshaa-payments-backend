import type { VercelRequest, VercelResponse } from '@vercel/node';
import Razorpay from 'razorpay';
import { PLANS, isPlanId } from './_plans';
import { getSupabaseAdmin, getAuthedUserId } from './_supabaseAdmin';

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return res.status(500).json({ error: 'Server is not configured with Razorpay keys yet' });
  }

  const userId = await getAuthedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Please sign in to subscribe.' });
  }

  const { planId } = (req.body ?? {}) as { planId?: unknown };
  if (!isPlanId(planId)) {
    return res.status(400).json({ error: 'Unknown planId' });
  }

  const plan = PLANS[planId];

  // "New user" pricing is decided here, server-side, from the account's own
  // payment history — never from anything the client sends — so it can't
  // be gamed by reinstalling the app.
  let isNewUser = true;
  try {
    const admin = getSupabaseAdmin();
    const { data: existing } = await admin
      .from('entitlements')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    isNewUser = !existing;
  } catch (err) {
    console.error('entitlements lookup failed, defaulting to regular price', err);
    isNewUser = false;
  }

  const amount = isNewUser ? plan.newUserAmount : plan.amount;
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  try {
    const order = await razorpay.orders.create({
      amount,
      currency: plan.currency,
      receipt: `nivesha_${planId}_${Date.now()}`,
      notes: { planId, label: plan.label, userId, newUser: String(isNewUser) },
    });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId, // public key id — safe to send to the client
      planId,
      label: plan.label,
    });
  } catch (err: any) {
    console.error('create-order failed', err);
    return res.status(502).json({ error: 'Could not create Razorpay order' });
  }
}
