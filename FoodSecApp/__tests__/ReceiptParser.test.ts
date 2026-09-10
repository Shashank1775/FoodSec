import { parseReceipt, parseReceiptLine, isNonItemLine } from '../app/services/receipt/ReceiptParser';

describe('ReceiptParser', () => {
  it('drops totals, payment and store boilerplate', () => {
    expect(isNonItemLine('SUBTOTAL 23.45')).toBe(true);
    expect(isNonItemLine('VISA ****1234')).toBe(true);
    expect(isNonItemLine('THANK YOU FOR SHOPPING')).toBe(true);
    expect(isNonItemLine('04/21/2025 10:32')).toBe(true);
    expect(isNonItemLine('(555) 123-4567')).toBe(true);
    expect(isNonItemLine('ORG BANANAS 1.29')).toBe(false);
  });

  it('extracts name, price and quantity from a line', () => {
    expect(parseReceiptLine('ORG BANANAS 2LB $1.29 F')).toEqual({
      name: 'ORG BANANAS 2LB',
      quantity: 1,
      price: 1.29,
      raw: 'ORG BANANAS 2LB $1.29 F',
    });
    expect(parseReceiptLine('2 x GREEK YOGURT 5.98')).toMatchObject({ name: 'GREEK YOGURT', quantity: 2, price: 5.98 });
    expect(parseReceiptLine('CHKN BREAST 3 @ 4.99 14.97')).toMatchObject({ name: 'CHKN BREAST', quantity: 3, price: 14.97 });
  });

  it('strips product codes and rejects letter-soup lines', () => {
    expect(parseReceiptLine('0123456789 WHOLE MILK GAL 3.49')?.name).toBe('WHOLE MILK GAL');
    expect(parseReceiptLine('0123456789 3.49')).toBeNull();
    expect(parseReceiptLine('AB 12 34')).toBeNull();
  });

  it('parses a whole receipt and de-duplicates repeated rows', () => {
    const text = [
      'FRESH MART',
      '123 Main St',
      'ORG BANANAS 1.29',
      'WHOLE MILK GAL 3.49',
      'WHOLE MILK GAL 3.49',
      'SUBTOTAL 4.78',
      'TAX 0.00',
      'TOTAL 4.78',
      'VISA 4.78',
    ].join('\n');
    const items = parseReceipt(text);
    expect(items.map((i) => i.name)).toEqual(['ORG BANANAS', 'WHOLE MILK GAL']);
  });
});

describe('ReceiptParser without prices', () => {
  it('keeps price-less lines when OCR dropped every price', () => {
    expect(parseReceipt('ORG BANANAS\nWHOLE MILK GAL').map((i) => i.name)).toEqual(['ORG BANANAS', 'WHOLE MILK GAL']);
  });
});
