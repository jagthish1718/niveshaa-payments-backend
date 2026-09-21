// Server-side source of truth for book pricing. Keep in sync with
// src/data/books.ts in the Nivesha app repo (id + price there).
export type BookId = 'book-en' | 'book-ta' | 'book-hi' | 'book-quiz';

export interface BookDef {
  amount: number; // paise, final price (no separate GST line for these)
  currency: 'INR';
  label: string;
}

export const BOOKS: Record<BookId, BookDef> = {
  'book-en': { amount: 14900, currency: 'INR', label: 'Niveshaa Trading Guide (English)' },
  'book-ta': { amount: 14900, currency: 'INR', label: 'நிவேஷா டிரேடிங் வழிகாட்டி (Tamil)' },
  'book-hi': { amount: 14900, currency: 'INR', label: 'निवेशा ट्रेडिंग गाइड (Hindi)' },
  'book-quiz': { amount: 7900, currency: 'INR', label: 'Niveshaa Daily Quiz Booklet' },
};

export function isBookId(v: unknown): v is BookId {
  return v === 'book-en' || v === 'book-ta' || v === 'book-hi' || v === 'book-quiz';
}
