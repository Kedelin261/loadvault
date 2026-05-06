/**
 * Shared utilities used by all type-specific parsers.
 * Core rule: only set a field when the evidence is explicit and specific.
 */

export const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export const EQUIPMENT_TYPES = [
  'Dry Van', 'Reefer', 'Refrigerated', 'Flatbed', 'Step Deck',
  'RGN', 'Power Only', 'Tanker', 'Hotshot',
];

// Email prefixes that belong to departments/roles, not real people
export const GENERIC_EMAIL_PREFIXES = new Set([
  'invoice', 'invoices', 'billing', 'bill', 'bills',
  'quickpay', 'payment', 'payments', 'payable', 'payables',
  'accounts', 'accountsreceivable', 'accountspayable',
  'ar', 'ap', 'support', 'dispatch', 'dispatching',
  'info', 'information', 'noreply', 'noreply', 'donotreply',
  'freightbill', 'freight', 'sales', 'admin', 'hello',
  'contact', 'accounting', 'claims', 'edi', 'operations',
  'ops', 'loadconfirmations', 'ratecon', 'ratecons',
  'loads', 'docs', 'documents', 'paperwork', 'settlements',
  'settlement', 'carriers', 'carrier', 'brokers', 'broker',
  'help', 'general', 'office', 'team', 'group',
]);

export function isGenericEmail(email) {
  if (!email) return true;
  const prefix = email.split('@')[0].toLowerCase().replace(/[^a-z]/g, '');
  return GENERIC_EMAIL_PREFIXES.has(prefix);
}

export function getEmailDomain(email) {
  if (!email || !email.includes('@')) return '';
  return email.split('@')[1].toLowerCase().trim();
}

/**
 * Returns true if name looks like a real person (First Last or First Middle Last).
 * Rejects single words, all-caps abbreviations, generic labels.
 */
export function isRealPersonName(name) {
  if (!name) return false;
  const cleaned = name.trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length < 2 || parts.length > 4) return false;
  // Each part: starts uppercase, rest lowercase/uppercase, all alpha
  const GENERIC_LABELS = /^(dispatch(er)?|agent|contact|broker|carrier|driver|manager|coordinator|rep|representative|office|team|staff|admin|billing|accounting|support|load|planner|scheduler|specialist)$/i;
  return parts.every((p) => /^[A-Z][a-zA-Z'\-]{1,25}$/.test(p) && !GENERIC_LABELS.test(p));
}

export function parseDate(text) {
  if (!text) return null;

  // MM/DD/YYYY or MM-DD-YYYY
  const mdy = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (mdy) {
    const m = parseInt(mdy[1], 10);
    const d = parseInt(mdy[2], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${mdy[3]}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Month DD, YYYY
  const named1 = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i);
  if (named1) {
    const mo = MONTHS[named1[1].toLowerCase().slice(0, 3)];
    if (mo) return `${named1[3]}-${String(mo).padStart(2, '0')}-${named1[2].padStart(2, '0')}`;
  }

  // DD Month YYYY
  const named2 = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{4})\b/i);
  if (named2) {
    const mo = MONTHS[named2[2].toLowerCase().slice(0, 3)];
    if (mo) return `${named2[3]}-${String(mo).padStart(2, '0')}-${named2[1].padStart(2, '0')}`;
  }

  return null;
}

export function parseLocation(text) {
  if (!text) return {};
  // "City, ST" or "City, State"
  const m = text.match(/([A-Za-z][A-Za-z\s\.\-]{1,28}),\s*([A-Z]{2})\b/);
  if (m) {
    const city = m[1].trim().replace(/\s+/g, ' ');
    const state = m[2];
    if (city.length >= 2 && city.length <= 35) {
      return { city, state };
    }
  }
  return {};
}

/** Extract N lines starting from line matching pattern */
export function getSection(text, pattern, numLines = 5) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      return lines.slice(i, i + numLines + 1).join('\n');
    }
  }
  return null;
}

/** Returns first email in text that is NOT generic */
export function extractPersonalEmail(text) {
  const emails = [...text.matchAll(/\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/g)]
    .map((m) => m[1]);
  return emails.find((e) => !isGenericEmail(e)) || null;
}

/** Returns first email in text that IS generic (billing/invoices etc.) */
export function extractBillingEmail(text) {
  const emails = [...text.matchAll(/\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/g)]
    .map((m) => m[1]);
  return emails.find((e) => isGenericEmail(e)) || null;
}

/** All emails found in text */
export function extractAllEmails(text) {
  return [...text.matchAll(/\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/g)]
    .map((m) => m[1]);
}

export function extractPhone(text) {
  const m = text.match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/);
  return m ? m[0] : null;
}

export function extractRate(text) {
  // Labeled rate takes priority
  const labeled = text.match(/(?:total\s+)?(?:carrier\s+)?rate[:\s]+\$?\s*([\d,]+(?:\.\d{0,2})?)/i)
    || text.match(/\$\s*([\d,]+(?:\.\d{0,2})?)\s*(?:flat|all[-\s]in|total)/i);
  if (labeled) {
    const val = parseFloat(labeled[1].replace(/,/g, ''));
    if (val >= 100 && val <= 50000) return val;
  }
  return null;
}
