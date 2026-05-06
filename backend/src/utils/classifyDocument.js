/**
 * Classifies document text into one of:
 * RATE_CONFIRMATION, INVOICE, BOL, RECEIPT, UNKNOWN
 *
 * Rules applied in priority order — first match wins.
 */
export function classifyDocument(text) {
  if (!text || text.trim().length < 10) return 'UNKNOWN';

  // Check first 2000 chars (header region) with higher weight
  const header = text.slice(0, 2000);

  if (
    /rate\s+confirmation/i.test(header) ||
    /rate\s*con(?:firmation)?\b/i.test(header) ||
    /\bratecon\b/i.test(header) ||
    /carrier\s+rate\s+agreement/i.test(header) ||
    /load\s+confirmation\s+agreement/i.test(header)
  ) return 'RATE_CONFIRMATION';

  if (
    /\binvoice\b/i.test(header) &&
    !/rate\s+confirmation/i.test(header)
  ) return 'INVOICE';

  if (
    /bill\s+of\s+lading/i.test(text) ||
    /\bbol\b/i.test(header) ||
    /proof\s+of\s+delivery/i.test(text) ||
    /\bp\.?o\.?d\.?\b/i.test(header)
  ) return 'BOL';

  if (/\breceipt\b/i.test(header)) return 'RECEIPT';

  // Looser full-doc scan for invoice (sometimes the word appears mid-doc)
  if (/\binvoice\b/i.test(text)) return 'INVOICE';

  return 'UNKNOWN';
}

/** Maps detected type to the DB's document `type` column values */
export function detectedTypeToDocType(detectedType) {
  const map = {
    RATE_CONFIRMATION: 'ratecon',
    INVOICE:          'invoice',
    BOL:              'bol',
    RECEIPT:          'other',
    UNKNOWN:          'other',
  };
  return map[detectedType] || 'other';
}
