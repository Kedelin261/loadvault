const EQUIPMENT_TYPES = [
  'Dry Van', 'Reefer', 'Refrigerated', 'Flatbed', 'Step Deck',
  'RGN', 'Power Only', 'Tanker', 'Hotshot',
];

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export function parseFields(text) {
  if (!text || !text.trim()) return {};

  const fields = {};
  const lower = text.toLowerCase();

  // ── MC / DOT ────────────────────────────────────────────
  const mcMatch = text.match(/\bMC[-#:\s]*(\d{4,7})\b/i);
  if (mcMatch) fields.mcNumber = `MC-${mcMatch[1]}`;

  const dotMatch = text.match(/\b(?:USDOT|DOT)[-#:\s]*(\d{5,8})\b/i);
  if (dotMatch) fields.dotNumber = dotMatch[1];

  // ── Email ──────────────────────────────────────────────
  const emailMatch = text.match(/\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/);
  if (emailMatch) fields.companyEmail = emailMatch[0];

  // ── Phone ──────────────────────────────────────────────
  const phoneMatch = text.match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/);
  if (phoneMatch) fields.companyPhone = phoneMatch[0];

  // ── Rate ───────────────────────────────────────────────
  const rateLabeledMatch = text.match(/(?:total\s+)?rate[:\s]+\$?\s*([\d,]+(?:\.\d{0,2})?)/i);
  const rateFlatMatch = text.match(/\$\s*([\d,]+(?:\.\d{0,2})?)\s*(?:flat|all[-\s]in|total)/i);
  const rateDollarMatch = text.match(/\$\s*([\d,]+(?:\.\d{0,2})?)/);

  const rateMatch = rateLabeledMatch || rateFlatMatch || rateDollarMatch;
  if (rateMatch) {
    const val = parseFloat(rateMatch[1].replace(/,/g, ''));
    if (val >= 100 && val <= 50000) fields.rate = val;
  }

  // ── Load number ─────────────────────────────────────────
  const loadNumMatch = text.match(
    /(?:load\s*(?:number|no\.?|#)|order\s*(?:number|no\.?|#)|ref(?:erence)?\s*(?:number|no\.?|#)|po\s*(?:number|no\.?|#)|conf(?:irmation)?\s*(?:number|no\.?|#))[:\s]+([A-Z0-9\-]{3,20})/i,
  ) || text.match(/[Ll]oad\s*#\s*([A-Z0-9\-]{3,20})/);
  if (loadNumMatch) fields.loadNumber = loadNumMatch[1].trim();

  // ── Weight ─────────────────────────────────────────────
  const weightMatch = text.match(/([\d,]+)\s*(?:lbs?|pounds?)\b/i);
  if (weightMatch) {
    const w = parseInt(weightMatch[1].replace(/,/g, ''), 10);
    if (w > 0 && w <= 120000) fields.weight = w;
  }

  // ── Equipment type ──────────────────────────────────────
  for (const eq of EQUIPMENT_TYPES) {
    if (lower.includes(eq.toLowerCase())) {
      fields.equipmentType = eq;
      break;
    }
  }

  // ── Commodity ──────────────────────────────────────────
  const commMatch = text.match(/(?:commodity|product|freight|description|cargo)[:\s]+([^\n\r,]{3,60})/i);
  if (commMatch) fields.commodity = commMatch[1].trim();

  // ── Origin / Pickup ─────────────────────────────────────
  const originMatch = text.match(/(?:pick\s*up|pickup|origin|shipper|pu)[:\s]+([^\n\r]{5,80})/i);
  if (originMatch) {
    const loc = parseLocation(originMatch[1]);
    if (loc.city) fields.originCity = loc.city;
    if (loc.state) fields.originState = loc.state;
  }

  // ── Destination / Delivery ──────────────────────────────
  const destMatch = text.match(/(?:deliver(?:y|ing)?\s*(?:to)?|destination|consignee|del)[:\s]+([^\n\r]{5,80})/i);
  if (destMatch) {
    const loc = parseLocation(destMatch[1]);
    if (loc.city) fields.destCity = loc.city;
    if (loc.state) fields.destState = loc.state;
  }

  // ── Dates ──────────────────────────────────────────────
  const pickupSection = getSection(text, /(?:pick\s*up|pickup|pu|origin)/i, 4);
  if (pickupSection) {
    const d = parseDate(pickupSection);
    if (d) fields.pickupDate = d;
  }

  const deliverySection = getSection(text, /(?:deliver|destination|drop|consignee)/i, 4);
  if (deliverySection) {
    const d = parseDate(deliverySection);
    if (d && d !== fields.pickupDate) fields.deliveryDate = d;
  }

  // Fallback: use first date found anywhere in doc as pickup
  if (!fields.pickupDate) {
    const d = parseDate(text);
    if (d) fields.pickupDate = d;
  }

  // ── Company name ────────────────────────────────────────
  const companyPatterns = [
    /(?:broker|carrier|company|bill\s*to)[:\s]+([^\n\r]{3,60})/i,
    /^([A-Z][A-Za-z0-9\s&,.\-']+(?:LLC|Inc\.?|Corp\.?|Co\.?|Logistics|Transport(?:ation)?|Trucking|Freight|Brokerage|Group|Solutions))\s*$/m,
  ];
  for (const pattern of companyPatterns) {
    const m = text.match(pattern);
    if (m && m[1] && m[1].trim().length >= 3 && m[1].trim().length <= 60) {
      fields.companyName = m[1].trim();
      break;
    }
  }

  // ── Contact name ────────────────────────────────────────
  const contactMatch = text.match(/(?:contact|attention|attn|rep|agent|dispatcher)[:\s]+([A-Za-z]+\s+[A-Za-z]+)/i);
  if (contactMatch) fields.contactName = contactMatch[1].trim();

  return fields;
}

function parseLocation(text) {
  const m = text.match(/([A-Za-z][A-Za-z\s]{1,28}),\s*([A-Z]{2})\b/);
  if (m) {
    const city = m[1].trim();
    const state = m[2];
    if (city.length >= 2 && city.length <= 30 && /^[A-Z]{2}$/.test(state)) {
      return { city, state };
    }
  }
  return {};
}

function parseDate(text) {
  if (!text) return null;

  // MM/DD/YYYY or MM-DD-YYYY
  const mdy = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (mdy) {
    const month = mdy[1].padStart(2, '0');
    const day = mdy[2].padStart(2, '0');
    if (parseInt(month, 10) <= 12 && parseInt(day, 10) <= 31) {
      return `${mdy[3]}-${month}-${day}`;
    }
  }

  // Month DD, YYYY
  const named1 = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i);
  if (named1) {
    const m = MONTHS[named1[1].toLowerCase().slice(0, 3)];
    if (m) return `${named1[3]}-${String(m).padStart(2, '0')}-${named1[2].padStart(2, '0')}`;
  }

  // DD Month YYYY
  const named2 = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})\b/i);
  if (named2) {
    const m = MONTHS[named2[2].toLowerCase().slice(0, 3)];
    if (m) return `${named2[3]}-${String(m).padStart(2, '0')}-${named2[1].padStart(2, '0')}`;
  }

  return null;
}

function getSection(text, keyPattern, numLines) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (keyPattern.test(lines[i])) {
      return lines.slice(i, i + numLines + 1).join('\n');
    }
  }
  return null;
}
