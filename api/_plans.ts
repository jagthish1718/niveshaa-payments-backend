// Server-side source of truth for plan pricing. The app only ever sends a
// planId (+ a newUser flag) — never a raw amount — so a tampered client
// can't pay less than the real price. Keep this in sync with
// src/data/subscription.ts in the Nivesha app repo if pricing ever changes.
export type PlanId = 'monthly' | 'quarterly' | 'half_yearly' | 'annual';

export interface PlanDef {
  amount: number; // paise, GST-inclusive — regular (returning member) price
  newUserAmount: number; // paise, GST-inclusive — first-ever-subscription price (5% off)
  currency: 'INR';
  label: string;
}

export const PLANS: Record<PlanId, PlanDef> = {
  monthly: {
    amount: 16800, // ₹168 (₹142 + 18% GST)
    newUserAmount: 15900, // ₹159 (₹135 + 18% GST)
    currency: 'INR',
    label: 'Nivesha Monthly Membership',
  },
  quarterly: {
    amount: 47100, // ₹471 (₹399 + 18% GST)
    newUserAmount: 44700, // ₹447 (₹379 + 18% GST)
    currency: 'INR',
    label: 'Nivesha 3-Month Membership',
  },
  half_yearly: {
    amount: 88400, // ₹884 (₹749 + 18% GST)
    newUserAmount: 84000, // ₹840 (₹712 + 18% GST)
    currency: 'INR',
    label: 'Nivesha 6-Month Membership',
  },
  annual: {
    amount: 168600, // ₹1,686 (₹1,429 + 18% GST)
    newUserAmount: 160200, // ₹1,602 (₹1,358 + 18% GST)
    currency: 'INR',
    label: 'Nivesha Annual Membership',
  },
};

export function isPlanId(v: unknown): v is PlanId {
  return v === 'monthly' || v === 'quarterly' || v === 'half_yearly' || v === 'annual';
}
