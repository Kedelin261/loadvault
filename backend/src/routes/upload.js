import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { DATA_DIR } from '../db.js';
import { extractTextFromBuffer } from '../utils/extractText.js';
import { classifyDocument, detectedTypeToDocType } from '../utils/classifyDocument.js';
import { parseRateConfirmation } from '../utils/parsers/rateConfirmation.js';
import { parseInvoice } from '../utils/parsers/invoice.js';
import { parseBol } from '../utils/parsers/bol.js';
import {
  findMatchingCompany, findMatchingLoad, findMatchingContact,
  shouldCreateContact, buildCompanyIndexFields, mergeFields,
} from '../utils/matchRecords.js';

export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
await fs.mkdir(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(file.mimetype);
    cb(ok ? null : new Error('Only PDF, JPG, and PNG files are accepted'), ok);
  },
});

function runUploadMiddleware(req, res) {
  return new Promise((resolve, reject) => {
    upload.single('file')(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

function computeExtractionStatus(rawText, fields, detectedType) {
  if (!rawText || rawText.trim().length < 20) return 'failed';
  const keys = Object.keys(fields).filter((k) => fields[k] !== null && fields[k] !== '' && fields[k] !== undefined);
  if (keys.length === 0) return 'failed';
  if (detectedType === 'UNKNOWN') return keys.length >= 2 ? 'partial' : 'failed';
  return keys.length >= 3 ? 'success' : 'partial';
}

/** Dispatch to the correct type-specific parser */
function parseByType(text, detectedType) {
  if (detectedType === 'RATE_CONFIRMATION') return parseRateConfirmation(text);
  if (detectedType === 'INVOICE')           return parseInvoice(text);
  if (detectedType === 'BOL')               return parseBol(text);
  // RECEIPT / UNKNOWN — try rate confirmation heuristics as fallback
  const fields = parseRateConfirmation(text);
  return Object.keys(fields).length >= 2 ? fields : {};
}

function docRowToApi(row) {
  return {
    id:               row.id,
    loadId:           row.load_id,
    companyId:        row.company_id,
    type:             row.type,
    detectedType:     row.detected_type,
    filename:         row.filename,
    originalName:     row.original_name,
    size:             row.size,
    mimeType:         row.mime_type,
    billingEmail:     row.billing_email,
    extractionStatus: row.extraction_status,
    extractionError:  row.extraction_error,
    status:           row.status,
    uploadedAt:       row.uploaded_at,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  };
}

const router = Router();
router.use(requireAuth);

// ── POST /api/upload ─────────────────────────────────────────────────────────
// 1. Receive file  2. Extract text  3. Classify  4. Parse  5. Return for review
router.post('/', async (req, res) => {
  try {
    await runUploadMiddleware(req, res);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const ext = path.extname(file.originalname).toLowerCase() || '.bin';
  const filename = `${uuidv4()}${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);
  await fs.writeFile(filePath, file.buffer);

  let rawText = '';
  let extractionError = null;
  try {
    rawText = await extractTextFromBuffer(file.buffer, file.mimetype);
  } catch (e) {
    extractionError = e.message;
  }

  const detectedType = rawText ? classifyDocument(rawText) : 'UNKNOWN';
  const docType      = detectedTypeToDocType(detectedType);
  const extracted    = rawText ? parseByType(rawText, detectedType) : {};
  const extractionStatus = extractionError
    ? 'failed'
    : computeExtractionStatus(rawText, extracted, detectedType);

  const id  = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO documents
      (id, user_id, load_id, company_id, type, detected_type,
       filename, original_name, size, mime_type,
       file_path, url, notes, billing_email, raw_text, extracted_fields,
       extraction_status, extraction_error, status,
       uploaded_at, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id, req.userId, null, null, docType, detectedType,
    filename, file.originalname, file.size, file.mimetype,
    filePath, '', '', extracted.billingEmail || '',
    rawText, JSON.stringify(extracted),
    extractionStatus, extractionError || null,
    'pending_review', now, now, now,
  );

  res.status(201).json({
    documentId:      id,
    originalName:    file.originalname,
    size:            file.size,
    mimeType:        file.mimetype,
    detectedType,
    docType,
    extractionStatus,
    extractionError,
    extracted,
  });
});

// ── POST /api/upload/:docId/confirm ──────────────────────────────────────────
// Apply the reviewed fields: match or create company/load, create contact if valid
router.post('/:docId/confirm', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?')
    .get(req.params.docId, req.userId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const { fields } = req.body;
  if (!fields) return res.status(400).json({ error: 'fields is required' });

  const now = new Date().toISOString();
  const result = {
    document: null,
    company:  null,
    load:     null,
    contact:  null,
    created:  { company: false, load: false, contact: false },
    matched:  { company: false, load: false },
  };

  // ── Company: match or create ─────────────────────────────────────────────
  let companyRow = null;
  if (fields.companyName || fields.companyEmail) {
    companyRow = findMatchingCompany(fields, req.userId);
    if (companyRow) {
      result.matched.company = true;
      // Update empty fields only
      const { normalizedName, emailDomain } = buildCompanyIndexFields(
        fields.companyName || companyRow.name,
        fields.companyEmail || companyRow.email,
      );
      const updates = mergeFields(companyRow, {
        phone:           fields.companyPhone,
        email:           fields.companyEmail,
        mc_number:       fields.mcNumber,
        dot_number:      fields.dotNumber,
        normalized_name: normalizedName,
        email_domain:    emailDomain,
      }, ['phone', 'email', 'mc_number', 'dot_number', 'normalized_name', 'email_domain']);
      if (Object.keys(updates).length) {
        const setClauses = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
        db.prepare(`UPDATE companies SET ${setClauses}, updated_at = ? WHERE id = ?`)
          .run(...Object.values(updates), now, companyRow.id);
      }
      companyRow = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyRow.id);
    } else if ((fields.companyName || '').trim()) {
      // Create new company
      const cId = uuidv4();
      const { normalizedName, emailDomain } = buildCompanyIndexFields(
        fields.companyName, fields.companyEmail || '',
      );
      db.prepare(`
        INSERT INTO companies
          (id, user_id, name, normalized_name, mc_number, dot_number,
           type, status, address, city, state, zip,
           phone, email, email_domain, website, notes, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        cId, req.userId,
        fields.companyName.trim(), normalizedName,
        fields.mcNumber || '', fields.dotNumber || '',
        fields.companyType || 'broker', 'active',
        '', '', '', '',
        fields.companyPhone || '', fields.companyEmail || '', emailDomain, '', '',
        now, now,
      );
      companyRow = db.prepare('SELECT * FROM companies WHERE id = ?').get(cId);
      result.created.company = true;
    }
  }
  result.company = companyRow ? companyApiShape(companyRow) : null;

  // ── Load: match or create (type-dependent rules) ─────────────────────────
  let loadRow = null;
  const detectedType = doc.detected_type;

  const hasLoadInfo =
    (fields.poNumber  || '').trim() ||
    (fields.loadNumber || '').trim() ||
    ((fields.originCity || '').trim() && (fields.destCity || '').trim()) ||
    Number(fields.rate) > 0;

  if (hasLoadInfo) {
    loadRow = findMatchingLoad(fields, companyRow?.id || null, req.userId);

    if (loadRow) {
      result.matched.load = true;
      // Enrich the existing load with any empty fields from the document
      const updates = mergeFields(loadRow, {
        po_number:     fields.poNumber,
        load_number:   fields.loadNumber,
        company_id:    companyRow?.id,
        origin_city:   fields.originCity,
        origin_state:  fields.originState,
        dest_city:     fields.destCity,
        dest_state:    fields.destState,
        pickup_date:   fields.pickupDate || null,
        pickup_time:   fields.pickupTime,
        delivery_date: fields.deliveryDate || null,
        delivery_time: fields.deliveryTime,
        rate:          Number(fields.rate) || null,
        truck_type:    fields.equipmentType,
        commodity:     fields.commodity,
        weight:        Number(fields.weight) || null,
      }, [
        'po_number', 'load_number', 'company_id',
        'origin_city', 'origin_state', 'dest_city', 'dest_state',
        'pickup_date', 'pickup_time', 'delivery_date', 'delivery_time',
        'rate', 'truck_type', 'commodity', 'weight',
      ]);
      if (Object.keys(updates).length) {
        const setClauses = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
        db.prepare(`UPDATE loads SET ${setClauses}, updated_at = ? WHERE id = ?`)
          .run(...Object.values(updates), now, loadRow.id);
      }
      loadRow = db.prepare('SELECT * FROM loads WHERE id = ?').get(loadRow.id);

    } else if (detectedType !== 'INVOICE') {
      // Invoices must NOT create new loads
      const lId = uuidv4();
      db.prepare(`
        INSERT INTO loads
          (id, user_id, load_number, po_number, company_id,
           origin_city, origin_state, origin_address, origin_zip,
           dest_city, dest_state, dest_address, dest_zip,
           pickup_date, pickup_time, delivery_date, delivery_time,
           rate, status, truck_type, weight, commodity,
           miles, driver_name, truck_number, trailer_number, notes,
           created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        lId, req.userId,
        fields.loadNumber || '', fields.poNumber || '',
        companyRow?.id || null,
        fields.originCity  || '', fields.originState  || '', '', '',
        fields.destCity    || '', fields.destState    || '', '', '',
        fields.pickupDate  || null, fields.pickupTime  || '',
        fields.deliveryDate || null, fields.deliveryTime || '',
        Number(fields.rate) || 0, 'pending',
        fields.equipmentType || '', Number(fields.weight) || 0,
        fields.commodity || '', 0, '', '', '', '',
        now, now,
      );
      loadRow = db.prepare('SELECT * FROM loads WHERE id = ?').get(lId);
      result.created.load = true;

    } else {
      // Invoice with no matching load — flag as unmatched
      result.unmatchedInvoice = true;
    }
  }
  result.load = loadRow ? loadApiShape(loadRow) : null;

  // ── Contact: create only if valid ────────────────────────────────────────
  if (fields.contactFirstName || fields.contactLastName) {
    const contactData = {
      firstName: fields.contactFirstName || '',
      lastName:  fields.contactLastName  || '',
      phone:     fields.contactPhone     || fields.companyPhone || '',
      email:     fields.contactEmail     || (fields.companyEmail && !isGenericEmail(fields.companyEmail) ? fields.companyEmail : ''),
      companyId: companyRow?.id || null,
    };
    if (shouldCreateContact(contactData)) {
      const existing = findMatchingContact(contactData, req.userId);
      if (existing) {
        result.contact = contactApiShape(existing);
      } else {
        const ctId = uuidv4();
        db.prepare(`
          INSERT INTO contacts
            (id, user_id, company_id, first_name, last_name, role, phone, email, notes, source, created_at, updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(
          ctId, req.userId, contactData.companyId,
          contactData.firstName, contactData.lastName,
          fields.contactRole || '', contactData.phone, contactData.email,
          '', 'document', now, now,
        );
        result.contact = contactApiShape(db.prepare('SELECT * FROM contacts WHERE id = ?').get(ctId));
        result.created.contact = true;
      }
    }
  }

  // ── Update document record ───────────────────────────────────────────────
  db.prepare(`
    UPDATE documents SET
      company_id=?, load_id=?, type=?, billing_email=?, status=?, updated_at=?
    WHERE id = ? AND user_id = ?
  `).run(
    companyRow?.id || null,
    loadRow?.id    || null,
    fields.docType || doc.type,
    fields.billingEmail || doc.billing_email || '',
    'confirmed', now,
    doc.id, req.userId,
  );

  result.document = docRowToApi(db.prepare('SELECT * FROM documents WHERE id = ?').get(doc.id));
  res.json(result);
});

// ── Helper shape functions ────────────────────────────────────────────────────

function isGenericEmail(email) {
  if (!email) return true;
  const prefix = email.split('@')[0].toLowerCase().replace(/[^a-z]/g, '');
  const GENERIC = new Set(['invoice','invoices','billing','bill','quickpay','payment','payments','accounts','ar','ap','support','dispatch','dispatching','info','noreply','donotreply','freightbill','freight','sales','admin','hello','contact','accounting','claims','edi','operations','ops','loads','docs']);
  return GENERIC.has(prefix);
}

function companyApiShape(row) {
  return {
    id: row.id, name: row.name, mcNumber: row.mc_number, dotNumber: row.dot_number,
    type: row.type, status: row.status, phone: row.phone, email: row.email,
    address: row.address, city: row.city, state: row.state, zip: row.zip,
  };
}

function loadApiShape(row) {
  return {
    id: row.id, loadNumber: row.load_number, poNumber: row.po_number,
    companyId: row.company_id,
    originCity: row.origin_city, originState: row.origin_state,
    destCity: row.dest_city, destState: row.dest_state,
    pickupDate: row.pickup_date, deliveryDate: row.delivery_date,
    rate: row.rate, status: row.status,
  };
}

function contactApiShape(row) {
  return {
    id: row.id, firstName: row.first_name, lastName: row.last_name,
    role: row.role, phone: row.phone, email: row.email, companyId: row.company_id,
  };
}

export default router;
