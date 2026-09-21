import type { VercelRequest, VercelResponse } from '@vercel/node';
import Razorpay from 'razorpay';
import { BOOKS, isBookId } from './_books';
import { getAuthedUserId } from './_supabaseAdmin';

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
    return res.status(401).json({ error: 'Please sign in to buy a book.' });
  }

  const { bookId } = (req.body ?? {}) as { bookId?: unknown };
  if (!isBookId(bookId)) {
    return res.status(400).json({ error: 'Unknown bookId' });
  }

  const def = BOOKS[bookId];
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  try {
    const order = await razorpay.orders.create({
      amount: def.amount,
      currency: def.currency,
      receipt: `nivesha_book_${bookId}_${Date.now()}`,
      notes: { bookId, label: def.label, userId },
    });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      bookId,
      label: def.label,
    });
  } catch (err: any) {
    console.error('create-book-order failed', err);
    return res.status(502).json({ error: 'Could not create Razorpay order' });
  }
}
