/**
 * Turns raw receipt OCR text into candidate line items.
 *
 * Receipts have no standard layout, so this is heuristic:
 *   1. Drop lines that are clearly not products (totals, payment info, store
 *      header/footer, dates, barcodes, coupon lines...).
 *   2. From the rest, peel off a trailing price ("2.49", "$2.49", "2.49 F") and a
 *      quantity ("2 x", "2 @ 1.25", "QTY 2").
 *   3. Whatever is left, minus product codes, is the item name.
 *
 * Users review the result before anything is saved, so we favour recall over
 * precision: an occasional junk line is cheaper than a missed grocery.
 */

export interface ParsedReceiptLine {
  name: string;
  quantity: number;
  price: number | null;
  /** The original OCR line, kept so the UI can show what was read. */
  raw: string;
}

const NON_ITEM_PATTERNS: RegExp[] = [
  /\b(sub\s*total|total|tax|change|cash|tender|balance|due|amount)\b/i,
  /\b(visa|master\s*card|mastercard|amex|debit|credit|card|payment|approved|auth|chip|contactless)\b/i,
  /\b(thank|welcome|receipt|cashier|store|manager|register|lane|trans(action)?|ref|invoice)\b/i,
  /\b(coupon|discount|savings?|you saved|member|rewards?|points|loyalty)\b/i,
  /\b(www\.|\.com|http|tel|phone)\b/i,
  /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/, // dates
  /\b\d{1,2}:\d{2}\b/, // times
  /\(\d{3}\)\s*\d{3}[-\s]\d{4}|\b\d{3}[-.]\d{3}[-.]\d{4}\b/, // phone numbers
  /^[\d\s.,$#*:-]*$/, // nothing but numbers / punctuation
  /^\s*\d+\s+\w+\s+(st|street|ave|avenue|rd|road|blvd|dr|drive|hwy)\b/i, // addresses
];

const PRICE_AT_END = /(?:[$]?\s*(-?\d{1,4}[.,]\d{2}))\s*(?:[A-Z]{1,2}|\*)?\s*$/;
const LEADING_QTY = /^\s*(\d{1,2})\s*(?:x|@|\*)\s+/i;
const QTY_AT_PRICE = /(\d{1,2})\s*(?:@|x)\s*[$]?\d{1,4}[.,]\d{2}/i;
const QTY_KEYWORD = /\bqty\s*:?\s*(\d{1,2})\b/i;
const PRODUCT_CODE = /\b\d{5,}\b/g;

export function isNonItemLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3) return true;
  return NON_ITEM_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function parseReceiptLine(line: string): ParsedReceiptLine | null {
  if (isNonItemLine(line)) return null;

  let working = line.trim();
  let quantity = 1;
  let price: number | null = null;

  const priceMatch = working.match(PRICE_AT_END);
  if (priceMatch) {
    price = parseFloat(priceMatch[1].replace(',', '.'));
    working = working.slice(0, priceMatch.index).trim();
  }

  const qtyAtPrice = working.match(QTY_AT_PRICE);
  if (qtyAtPrice) {
    quantity = parseInt(qtyAtPrice[1], 10);
    working = working.replace(QTY_AT_PRICE, ' ').trim();
  }
  const leadingQty = working.match(LEADING_QTY);
  if (leadingQty) {
    quantity = parseInt(leadingQty[1], 10);
    working = working.slice(leadingQty[0].length).trim();
  }
  const qtyKeyword = working.match(QTY_KEYWORD);
  if (qtyKeyword) {
    quantity = parseInt(qtyKeyword[1], 10);
    working = working.replace(QTY_KEYWORD, ' ').trim();
  }

  const name = working
    .replace(PRODUCT_CODE, ' ')
    .replace(/[^A-Za-z0-9%&'\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Require something that looks like a word; reject barcode-only or letter-soup lines.
  const letters = (name.match(/[A-Za-z]/g) || []).length;
  const digits = (name.match(/\d/g) || []).length;
  if (letters < 3 || digits > letters) return null;

  return { name, quantity: Math.max(1, quantity), price, raw: line.trim() };
}

/**
 * Parses every line of a receipt. If at least one line carries a price, lines
 * without one are treated as noise (store header, "2 @ 1.25" continuation rows,
 * "ORGANIC" descriptors...) - on a real receipt every product row has a price.
 * Receipts where OCR lost all prices keep every candidate line instead.
 */
export function parseReceipt(text: string): ParsedReceiptLine[] {
  const candidates = text
    .split(/\r?\n/)
    .map(parseReceiptLine)
    .filter((line): line is ParsedReceiptLine => line !== null);

  const hasPrices = candidates.some((line) => line.price !== null);
  const seen = new Set<string>();
  const items: ParsedReceiptLine[] = [];
  for (const parsed of candidates) {
    if (hasPrices && parsed.price === null) continue;
    // OCR occasionally duplicates rows (e.g. table mode + wrapped text); keep the first.
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(parsed);
  }
  return items;
}
