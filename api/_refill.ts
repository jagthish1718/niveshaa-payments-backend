// Server-side source of truth for the Paper Trading balance refill price.
// This is a one-time top-up of virtual (practice) cash inside the app —
// not a real financial instrument. Keep in sync with the "Refill" UI in
// src/screens/PaperTradingScreen.tsx in the Niveshaa app repo.
export const REFILL = {
  amount: 2900, // paise — ₹29
  currency: 'INR' as const,
  label: 'Niveshaa Paper Trading Refill',
  virtualCash: 100000, // ₹1,00,000 added to the player's paper-trading cash
};
