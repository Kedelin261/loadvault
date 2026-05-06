/**
 * Matching Engine
 *
 * Priority: MATCH before CREATE.
 * Never create a duplicate company, load, or invalid contact.
 */
import db from '../db.js';
import { isGenericEmail, isRealPersonName, getEmailDomain } from './parsers/shared.js';

// ── Company name normalization ──────────────────────────────────────────────

const STRIP_SUFFIXES = /\b(llc\.?|inc\.?|corp\.?|co\.?|ltd\.?|lp\.?|plc\.?|pllc\.?|group|solutions|logistics|transport(?:ation)?|trucking|freight|brokerage|services?|systems?|enterprises?|partners?|associates?)\b\.?/gi;

export function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(STRIP_SUFFIXES, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// ── Company matching ────────────────────────────────────────────────────────

/**
 * Find an existing company for this user.
 * Confidence tiers (first match wins):
 *   1. MC number exact match       → very high confidence
 *   2. Email exact match           → high confidence
 *   3. Email domain match          → medium confidence (only if domain is specific, not gmail/yahoo)
 *   4. Normalized name exact match → medium confidence
 *   5. Normalized name substring   → low confidence (only for long names)
 */
export function findMatchingCompany(fields, userId) {
  const { companyName, companyEmail, emailDomain, mcNumber } = fields;

  // 1. MC number (most specific)
  if (mcNumber && mcNumber.length >= 5) {
    const mc = mcNumber.replace(/^MC-?/i, '');
    const row = db.prepare(
      `SELECT * FROM companies WHERE user_id = ? AND mc_number != '' AND (mc_number = ? OR mc_number = ?)`
    ).get(userId, mcNumber, `MC-${mc}`);
    if (row) return row;
  }

  // 2. Exact email match
  if (companyEmail) {
    const row = db.prepare(
      `SELECT * FROM companies WHERE user_id = ? AND email != '' AND LOWER(email) = LOWER(?)`
    ).get(userId, companyEmail);
    if (row) return row;
  }

  // 3. Email domain match (skip generic domains)
  const GENERIC_DOMAINS = new Set(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com']);
  const domain = emailDomain || (companyEmail ? getEmailDomain(companyEmail) : '');
  if (domain && !GENERIC_DOMAINS.has(domain)) {
    const row = db.prepare(
      `SELECT * FROM companies WHERE user_id = ? AND email_domain = ?`
    ).get(userId, domain);
    if (row) return row;
  }

  // 4 & 5. Name normalization
  if (companyName) {
    const inputNorm = normalizeName(companyName);
    if (inputNorm.length >= 3) {
      const candidates = db.prepare(
        `SELECT * FROM companies WHERE user_id = ? AND normalized_name != ''`
      ).all(userId);

      // Exact normalized match
      const exact = candidates.find((c) => c.normalized_name === inputNorm);
      if (exact) return exact;

      // Substring match (only for long strings to avoid false positives)
      if (inputNorm.length >= 6) {
        const partial = candidates.find((c) => {
          const sn = c.normalized_name;
          return sn.length >= 6 && (sn.includes(inputNorm) || inputNorm.includes(sn));
        });
        if (partial) return partial;
      }
    }
  }

  return null;
}

/**
 * Build the normalized_name and email_domain values to store with a company.
 */
export function buildCompanyIndexFields(name, email) {
  return {
    normalizedName: normalizeName(name || ''),
    emailDomain:    getEmailDomain(email || ''),
  };
}

// ── Load matching ────────────────────────────────────────────────────────────

/**
 * Find an existing load for this user.
 * Primary key: PO number (exact, case-insensitive).
 * Fallback: same company + same origin city + same pickup date.
 */
export function findMatchingLoad(fields, companyId, userId) {
  const { poNumber, originCity, pickupDate } = fields;

  // 1. PO number (primary key)
  if (poNumber) {
    const row = db.prepare(
      `SELECT * FROM loads WHERE user_id = ? AND UPPER(po_number) = UPPER(?)`
    ).get(userId, poNumber);
    if (row) return row;

    // Also check load_number column (some loads created manually use this)
    const row2 = db.prepare(
      `SELECT * FROM loads WHERE user_id = ? AND company_id = ? AND UPPER(load_number) = UPPER(?)`
    ).get(userId, companyId || '', poNumber);
    if (row2) return row2;
  }

  // 2. Fallback: company + origin city + pickup date (all must match)
  if (companyId && originCity && pickupDate) {
    const row = db.prepare(`
      SELECT * FROM loads
      WHERE user_id = ? AND company_id = ?
        AND LOWER(origin_city) = LOWER(?)
        AND pickup_date = ?
    `).get(userId, companyId, originCity, pickupDate);
    if (row) return row;
  }

  return null;
}

// ── Contact validation ────────────────────────────────────────────────────────

/**
 * Returns true only if this contact should be created.
 * Must have: real full name AND (direct phone OR personal email).
 * Billing/department emails never create contacts.
 */
export function shouldCreateContact({ firstName, lastName, phone, email }) {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim();
  if (!isRealPersonName(fullName)) return false;
  const hasPhone = phone && phone.replace(/\D/g, '').length >= 10;
  const hasPersonalEmail = email && !isGenericEmail(email);
  return hasPhone || hasPersonalEmail;
}

/**
 * Find an existing contact by email or (company + normalized name).
 */
export function findMatchingContact({ firstName, lastName, email, companyId }, userId) {
  // Email exact match
  if (email) {
    const row = db.prepare(
      `SELECT * FROM contacts WHERE user_id = ? AND LOWER(email) = LOWER(?)`
    ).get(userId, email);
    if (row) return row;
  }

  // Same company + same name
  if (companyId && firstName && lastName) {
    const row = db.prepare(
      `SELECT * FROM contacts WHERE user_id = ? AND company_id = ? AND LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?)`
    ).get(userId, companyId, firstName, lastName);
    if (row) return row;
  }

  return null;
}

// ── Field update rule ────────────────────────────────────────────────────────

/**
 * Merge new values into an existing row.
 * Rule: only fill EMPTY fields. Never overwrite existing data.
 * Exception: rate can be updated from a rate confirmation if current is 0.
 */
export function mergeFields(existing, incoming, allowedKeys) {
  const updates = {};
  for (const key of allowedKeys) {
    const existingVal = existing[key];
    const incomingVal = incoming[key];
    // Only fill if current is empty/zero/null
    if (
      incomingVal !== undefined && incomingVal !== null && incomingVal !== '' &&
      (existingVal === '' || existingVal === null || existingVal === undefined || existingVal === 0)
    ) {
      updates[key] = incomingVal;
    }
  }
  return updates;
}
