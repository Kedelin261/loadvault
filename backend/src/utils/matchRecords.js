import db from '../db.js';

function normalizeName(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

export function findMatchingCompany(fields, userId) {
  const { companyEmail, companyPhone, companyName } = fields;

  if (companyEmail) {
    const match = db.prepare(
      'SELECT * FROM companies WHERE user_id = ? AND LOWER(email) = LOWER(?)'
    ).get(userId, companyEmail);
    if (match) return match;
  }

  if (companyPhone) {
    const normalized = normalizePhone(companyPhone);
    if (normalized.length >= 7) {
      const candidates = db.prepare(
        'SELECT * FROM companies WHERE user_id = ? AND phone != ?'
      ).all(userId, '');
      const match = candidates.find(
        (c) => normalizePhone(c.phone) === normalized,
      );
      if (match) return match;
    }
  }

  if (companyName) {
    const inputNorm = normalizeName(companyName);
    if (inputNorm.length >= 3) {
      const candidates = db.prepare(
        'SELECT * FROM companies WHERE user_id = ? AND name != ?'
      ).all(userId, '');
      const match = candidates.find((c) => {
        const storedNorm = normalizeName(c.name);
        return (
          storedNorm === inputNorm ||
          (inputNorm.length >= 5 && storedNorm.includes(inputNorm)) ||
          (storedNorm.length >= 5 && inputNorm.includes(storedNorm))
        );
      });
      if (match) return match;
    }
  }

  return null;
}

export function findMatchingLoad(fields, companyId, userId) {
  const { loadNumber } = fields;
  if (!loadNumber) return null;

  const normalizedInput = loadNumber.trim().toLowerCase();
  const candidates = db.prepare(
    'SELECT * FROM loads WHERE user_id = ? AND company_id = ? AND load_number != ?'
  ).all(userId, companyId, '');

  return (
    candidates.find(
      (l) => (l.load_number || '').trim().toLowerCase() === normalizedInput,
    ) || null
  );
}
