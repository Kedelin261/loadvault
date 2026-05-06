/**
 * Rate Confirmation Parser
 *
 * Extracts structured data specifically from rate confirmation documents.
 * Only sets a field when evidence is explicit. Empty > incorrect.
 */
import {
  isGenericEmail, isRealPersonName, getEmailDomain,
  parseDate, parseLocation, getSection,
  extractPersonalEmail, extractBillingEmail, extractAllEmails,
  extractPhone, extractRate, EQUIPMENT_TYPES,
} from './shared.js';

export function parseRateConfirmation(text) {
  const fields = {};
  const lines = text.split('\n');

  // ── PO / Load Number (PRIMARY MATCH KEY) ────────────────────────────────
  // Look for explicit labels first — order #, PO #, load #, conf #
  const poPatterns = [
    /(?:order|p\.?o\.?|purchase\s+order)\s*(?:number|no\.?|#)?\s*[:#]?\s*([A-Z0-9\-]{3,20})/i,
    /(?:load|ref(?:erence)?|conf(?:irmation)?)\s*(?:number|no\.?|#)\s*[:#]?\s*([A-Z0-9\-]{3,20})/i,
    /\b(?:load|ref|po|order|conf)\s*#\s*([A-Z0-9\-]{3,20})/i,
  ];
  for (const p of poPatterns) {
    const m = text.match(p);
    if (m && m[1]) { fields.poNumber = m[1].trim().toUpperCase(); break; }
  }

  // ── Rate ────────────────────────────────────────────────────────────────
  const rate = extractRate(text);
  if (rate) fields.rate = rate;

  // ── Equipment Type ───────────────────────────────────────────────────────
  for (const eq of EQUIPMENT_TYPES) {
    if (new RegExp(`\\b${eq.replace(' ', '\\s+')}\\b`, 'i').test(text)) {
      fields.equipmentType = eq;
      break;
    }
  }

  // ── Commodity ───────────────────────────────────────────────────────────
  const commMatch = text.match(/(?:commodity|product|freight\s+type|description|cargo)[:\s]+([^\n\r,]{3,60})/i);
  if (commMatch) {
    const commodity = commMatch[1].trim();
    if (commodity.length >= 2 && commodity.length <= 60) {
      fields.commodity = commodity;
    }
  }

  // ── Weight ───────────────────────────────────────────────────────────────
  const weightMatch = text.match(/([\d,]+)\s*(?:lbs?|pounds?)\b/i);
  if (weightMatch) {
    const w = parseInt(weightMatch[1].replace(/,/g, ''), 10);
    if (w > 0 && w <= 120000) fields.weight = w;
  }

  // ── MC Number ────────────────────────────────────────────────────────────
  const mcMatch = text.match(/\bMC[-#:\s]*(\d{4,7})\b/i);
  if (mcMatch) fields.mcNumber = `MC-${mcMatch[1]}`;

  const dotMatch = text.match(/\b(?:USDOT|DOT)[-#:\s]*(\d{5,8})\b/i);
  if (dotMatch) fields.dotNumber = dotMatch[1];

  // ── Company Name (Broker) ────────────────────────────────────────────────
  // Prioritize explicit broker label
  const brokerSection = getSection(text, /\bbroker\b|\bbill\s+to\b/i, 6);
  if (brokerSection) {
    const bLine = brokerSection.split('\n').find((l) =>
      l.trim().length >= 3 && l.trim().length <= 80 &&
      !/^(broker|bill\s*to|mc|dot|phone|email|fax|contact)/i.test(l.trim())
    );
    if (bLine && bLine.trim().length >= 3) {
      const candidate = bLine.trim();
      // Basic sanity: has at least one word character, not a label
      if (/[A-Za-z]{2,}/.test(candidate) && candidate.length <= 80) {
        fields.companyName = candidate;
      }
    }
  }

  // Fallback: prominent company-looking line near top of doc
  if (!fields.companyName) {
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const line = lines[i].trim();
      if (
        line.length >= 4 && line.length <= 80 &&
        /(?:LLC|Inc\.?|Corp\.?|Co\.?|Logistics|Transport(?:ation)?|Trucking|Freight|Brokerage|Group|Solutions)\b/i.test(line)
      ) {
        fields.companyName = line;
        break;
      }
    }
  }

  // ── Carrier Name ─────────────────────────────────────────────────────────
  const carrierSection = getSection(text, /\bcarrier\b/i, 4);
  if (carrierSection) {
    const cLine = carrierSection.split('\n').find((l) =>
      l.trim().length >= 3 && l.trim().length <= 80 &&
      !/^carrier/i.test(l.trim())
    );
    if (cLine) fields.carrierName = cLine.trim();
  }

  // ── Emails: separate personal contact email from billing email ───────────
  const allEmails = extractAllEmails(text);
  const personalEmail = allEmails.find((e) => !isGenericEmail(e));
  const billingEmail  = allEmails.find((e) => isGenericEmail(e));

  if (personalEmail) {
    fields.companyEmail = personalEmail;
    fields.emailDomain  = getEmailDomain(personalEmail);
  }
  if (billingEmail) {
    fields.billingEmail = billingEmail;
  }

  // ── Phone ────────────────────────────────────────────────────────────────
  const phone = extractPhone(text);
  if (phone) fields.companyPhone = phone;

  // ── Broker Contact Name ───────────────────────────────────────────────────
  // Only accept if it looks like a real person's name
  const contactPatterns = [
    /(?:contact|dispatcher|agent|rep|broker\s+rep|your\s+rep)[:\s]+([A-Za-z]+(?:\s+[A-Za-z]+){1,3})/i,
    /(?:attention|attn)[:\s]+([A-Za-z]+(?:\s+[A-Za-z]+){1,3})/i,
  ];
  for (const p of contactPatterns) {
    const m = text.match(p);
    if (m && isRealPersonName(m[1])) {
      const parts = m[1].trim().split(/\s+/);
      fields.contactFirstName = parts[0];
      fields.contactLastName  = parts.slice(1).join(' ');
      break;
    }
  }

  // ── Pickup ───────────────────────────────────────────────────────────────
  const puSection = getSection(text, /\b(?:pick\s*up|pickup|shipper|origin|pu\b)/i, 8);
  if (puSection) {
    const loc = parseLocation(puSection);
    if (loc.city) { fields.originCity  = loc.city;  fields.originState = loc.state; }
    const date = parseDate(puSection);
    if (date) fields.pickupDate = date;
    // Time
    const timeMatch = puSection.match(/\b(\d{1,2}:\d{2})\s*(AM|PM)?\b/i);
    if (timeMatch) fields.pickupTime = timeMatch[0].trim();
  }

  // ── Delivery ─────────────────────────────────────────────────────────────
  const delSection = getSection(text, /\b(?:deliver(?:y|ing)?|consignee|destination|del\b|drop)/i, 8);
  if (delSection) {
    const loc = parseLocation(delSection);
    if (loc.city) { fields.destCity  = loc.city;  fields.destState = loc.state; }
    const date = parseDate(delSection);
    if (date && date !== fields.pickupDate) fields.deliveryDate = date;
    const timeMatch = delSection.match(/\b(\d{1,2}:\d{2})\s*(AM|PM)?\b/i);
    if (timeMatch) fields.deliveryTime = timeMatch[0].trim();
  }

  // If same date appears for both, keep only pickup
  if (fields.pickupDate && fields.deliveryDate === fields.pickupDate) {
    delete fields.deliveryDate;
  }

  return fields;
}
