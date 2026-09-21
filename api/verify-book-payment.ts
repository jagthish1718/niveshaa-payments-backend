import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { isBookId } from './_books';
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

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return res.status(500).json({ error: 'Server is not configured with Razorpay keys yet' });
  }

  const userId = await getAuthedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Please sign in.' });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookId } = (req.body ?? {}) as {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    bookId?: unknown;
  };

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !isBookId(bookId)) {
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

  // Signature checks out — add this book to the account's owned list in
  // Supabase (same entitlements row subscriptions live on), so ownership
  // survives a reinstall instead of living only on one device.
  let purchasedBooks: string[] = [];
  try {
    const admin = getSupabaseAdmin();
    const { data: existing } = await admin
      .from('entitlements')
      .select('purchased_books')
      .eq('user_id', userId)
      .maybeSingle();

    purchasedBooks = Array.from(new Set([...(existing?.purchased_books ?? []), bookId]));

    const { error: upsertError } = await admin.from('entitlements').upsert({
      user_id: userId,
      purchased_books: purchasedBooks,
      updated_at: new Date().toISOString(),
    });
    if (upsertError) throw upsertError;
  } catch (err) {
    console.error('failed to record book purchase after verified payment', err);
    // The payment itself is genuine and verified — don't tell the user it
    // failed. Include bookId below regardless so the client can still
    // unlock it optimistically for this session.
  }

  return res.status(200).json({
    verified: true,
    bookId,
    paymentId: razorpay_payment_id,
    purchasedBooks,
  });
}
