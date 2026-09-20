// Server-side source of truth for premium lesson-tier one-time pricing.
// Keep in sync with src/data/premiumTiers.ts in the Nivesha app repo.
export type TierId = 'Beginner' | 'Intermediate' | 'Advanced';

export interface TierDef {
  amount: number; // paise, GST-inclusive
  currency: 'INR';
  label: string;
}

export const TIERS: Record<TierId, TierDef> = {
  Beginner: { amount: 11700, currency: 'INR', label: 'Nivesha Beginner Tier (Lessons 1–15)' }, // ₹117 (₹99 + 18% GST)
  Intermediate: { amount: 18800, currency: 'INR', label: 'Nivesha Intermediate Tier (Lessons 16–35)' }, // ₹188 (₹159 + 18% GST)
  Advanced: { amount: 30600, currency: 'INR', label: 'Nivesha Advanced Tier (Lessons 36–50)' }, // ₹306 (₹259 + 18% GST)
};

export function isTierId(v: unknown): v is TierId {
  return v === 'Beginner' || v === 'Intermediate' || v === 'Advanced';
}
