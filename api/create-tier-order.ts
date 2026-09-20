import type { VercelRequest, VercelResponse } from '@vercel/node';
import Razorpay from 'razorpay';
import { TIERS, isTierId } from './_tiers';

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

  const { tier } = (req.body ?? {}) as { tier?: unknown };
  if (!isTierId(tier)) {
    return res.status(400).json({ error: 'Unknown tier' });
  }

  const def = TIERS[tier];
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  try {
    const order = await razorpay.orders.create({
      amount: def.amount,
      currency: def.currency,
      receipt: `nivesha_tier_${tier}_${Date.now()}`,
      notes: { tier, label: def.label },
    });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      tier,
      label: def.label,
    });
  } catch (err: any) {
    console.error('create-tier-order failed', err);
    return res.status(502).json({ error: 'Could not create Razorpay order' });
  }
}
