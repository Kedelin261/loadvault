/**
 * Invoice Parser
 *
 * Critical rule: Invoices MUST attach to an existing load via PO number.
 * Do NOT create new loads or companies from invoices.
 */
import {
  parseDate, extractRate, extractAllEmails, isGenericEmail,
} from './shared.js';

export function parseInvoice(text) {
  const fields = {};

  // ── Invoice Number ────────────────────────────────────────────────────────
  const invMatch = text.match(/(?:invoice\s*(?:number|no\.?|#))[:\s#]*([A-Z0-9\-]{2,20})/i)
    || text.match(/\binv[.\s#:]+([A-Z0-9\-]{2,20})/i);
  if (invMatch) fields.invoiceNumber = invMatch[1].trim().toUpperCase();

  // ── PO / Reference Number (CRITICAL — used to match to a load) ───────────
  const poPatterns = [
    /(?:p\.?o\.?|purchase\s+order|order)\s*(?:number|no\.?|#)?\s*[:#]?\s*([A-Z0-9\-]{3,20})/i,
    /(?:load|ref(?:erence)?|conf(?:irmation)?)\s*(?:number|no\.?|#)\s*[:#]?\s*([A-Z0-9\-]{3,20})/i,
    /\b(?:load|ref|po|order)\s*#\s*([A-Z0-9\-]{3,20})/i,
  ];
  for (const p of poPatterns) {
    const m = text.match(p);
    if (m && m[1]) { fields.poNumber = m[1].trim().toUpperCase(); break; }
  }

  // ── Amount / Total ────────────────────────────────────────────────────────
  const amountMatch = text.match(/(?:total\s+(?:amount|due)|amount\s+due|invoice\s+total|total)[:\s]+\$?\s*([\d,]+(?:\.\d{0,2})?)/i)
    || text.match(/\$\s*([\d,]+(?:\.\d{0,2})?)/);
  if (amountMatch) {
    const val = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (val >= 1 && val <= 500000) fields.amount = val;
  }

  // ── Date ──────────────────────────────────────────────────────────────────
  const dateMatch = text.match(/(?:invoice\s+date|date)[:\s]+(.{5,30})/i);
  if (dateMatch) {
    const d = parseDate(dateMatch[1]);
    if (d) fields.invoiceDate = d;
  }
  if (!fields.invoiceDate) {
    const d = parseDate(text);
    if (d) fields.invoiceDate = d;
  }

  // ── Company Name (optional — for display only, not for company creation) ──
  const lines = text.split('\n');
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i].trim();
    if (
      line.length >= 3 && line.length <= 80 &&
      /(?:LLC|Inc\.?|Corp\.?|Co\.?|Logistics|Transport(?:ation)?|Trucking|Freight|Brokerage)\b/i.test(line)
    ) {
      fields.companyName = line;
      break;
    }
  }

  return fields;
}
