/**
 * Bill of Lading / Proof of Delivery Parser
 *
 * BOLs enrich existing loads. They do not create companies.
 */
import { parseDate, parseLocation, getSection, extractPhone } from './shared.js';

export function parseBol(text) {
  const fields = {};

  // ── BOL / PRO Number ──────────────────────────────────────────────────────
  const bolMatch = text.match(/(?:bol|b\.o\.l\.|bill\s+of\s+lading\s*(?:number|no\.?|#)?)[:\s#]*([A-Z0-9\-]{3,20})/i)
    || text.match(/\bpro\s*(?:number|no\.?|#)?[:\s#]*([A-Z0-9\-]{3,20})/i);
  if (bolMatch) fields.bolNumber = bolMatch[1].trim().toUpperCase();

  // ── PO / Reference (to match back to a load) ─────────────────────────────
  const poMatch = text.match(/(?:p\.?o\.?|purchase\s+order|order|load|ref)\s*(?:number|no\.?|#)?\s*[:#]?\s*([A-Z0-9\-]{3,20})/i);
  if (poMatch) fields.poNumber = poMatch[1].trim().toUpperCase();

  // ── Shipper / Pickup ──────────────────────────────────────────────────────
  const puSection = getSection(text, /\b(?:shipper|ship\s+from|pickup|origin|consignor)\b/i, 8);
  if (puSection) {
    const loc = parseLocation(puSection);
    if (loc.city) { fields.originCity = loc.city; fields.originState = loc.state; }
    const date = parseDate(puSection);
    if (date) fields.pickupDate = date;
  }

  // ── Consignee / Delivery ──────────────────────────────────────────────────
  const delSection = getSection(text, /\b(?:consignee|ship\s+to|deliver(?:y|ed)\s+to|destination|receiver)\b/i, 8);
  if (delSection) {
    const loc = parseLocation(delSection);
    if (loc.city) { fields.destCity = loc.city; fields.destState = loc.state; }
    const date = parseDate(delSection);
    if (date && date !== fields.pickupDate) fields.deliveryDate = date;
  }

  // ── Commodity / Description ───────────────────────────────────────────────
  const commMatch = text.match(/(?:description|commodity|freight\s+description|item|cargo)[:\s]+([^\n\r,]{3,60})/i);
  if (commMatch) {
    const c = commMatch[1].trim();
    if (c.length >= 2 && c.length <= 60) fields.commodity = c;
  }

  // ── Weight ────────────────────────────────────────────────────────────────
  const weightMatch = text.match(/([\d,]+)\s*(?:lbs?|pounds?)\b/i);
  if (weightMatch) {
    const w = parseInt(weightMatch[1].replace(/,/g, ''), 10);
    if (w > 0 && w <= 120000) fields.weight = w;
  }

  return fields;
}
