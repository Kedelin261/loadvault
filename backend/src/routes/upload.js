import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { DATA_DIR } from '../db.js';
import { extractTextFromBuffer } from '../utils/extractText.js';
import { parseFields } from '../utils/parseFields.js';
import { findMatchingCompany, findMatchingLoad } from '../utils/matchRecords.js';

export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
await fs.mkdir(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    cb(allowed.includes(file.mimetype) ? null : new Error('Only PDF, JPG, and PNG files are accepted'), allowed.includes(file.mimetype));
  },
});

function runUploadMiddleware(req, res) {
  return new Promise((resolve, reject) => {
    upload.single('file')(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

function computeExtractionStatus(rawText, fields) {
  if (!rawText || rawText.trim().length < 20) return 'failed';
  const keyFields = ['loadNumber', 'companyName', 'rate', 'originCity', 'destCity'];
  const found = keyFields.filter((k) => fields[k] != null && fields[k] !== '').length;
  return found >= 2 ? 'success' : 'partial';
}

function docToApi(row) {
  return {
    id:               row.id,
    loadId:           row.load_id,
    companyId:        row.company_id,
    type:             row.type,
    filename:         row.filename,
    originalName:     row.original_name,
    size:             row.size,
    mimeType:         row.mime_type,
    extractionStatus: row.extraction_status,
    extractionError:  row.extraction_error,
    status:           row.status,
    uploadedAt:       row.uploaded_at,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  };
}

function companyToApi(row) {
  if (!row) return null;
  return {
    id: row.id, name: row.name, mcNumber: row.mc_number, dotNumber: row.dot_number,
    type: row.type, status: row.status, phone: row.phone, email: row.email,
  };
}

function loadToApi(row) {
  if (!row) return null;
  return {
    id: row.id, loadNumber: row.load_number, companyId: row.company_id,
    originCity: row.origin_city, originState: row.origin_state,
    destCity: row.dest_city, destState: row.dest_state,
    pickupDate: row.pickup_date, deliveryDate: row.delivery_date,
    rate: row.rate, status: row.status,
  };
}

const router = Router();
router.use(requireAuth);

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

  const extracted = rawText ? parseFields(rawText) : {};
  const extractionStatus = extractionError
    ? 'failed'
    : computeExtractionStatus(rawText, extracted);

  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO documents
      (id, user_id, load_id, company_id, type, filename, original_name, size, mime_type,
       file_path, url, notes, raw_text, extracted_fields, extraction_status, extraction_error,
       status, uploaded_at, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id, req.userId, null, null, 'other',
    filename, file.originalname, file.size, file.mimetype,
    filePath, '', '', rawText,
    JSON.stringify(extracted), extractionStatus, extractionError || null,
    'pending_review', now, now, now,
  );

  res.status(201).json({
    documentId: id,
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
    extractionStatus,
    extractionError,
    extracted,
  });
});

router.post('/:docId/confirm', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?')
    .get(req.params.docId, req.userId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const { fields } = req.body;
  if (!fields) return res.status(400).json({ error: 'fields is required' });

  let companyRow = null;
  let companyCreated = false;
  let loadRow = null;
  let loadCreated = false;

  if (fields.companyName || fields.companyEmail || fields.companyPhone) {
    companyRow = findMatchingCompany(fields, req.userId);
    if (!companyRow && (fields.companyName || '').trim()) {
      const cId = uuidv4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO companies
          (id, user_id, name, mc_number, dot_number, type, status, address, city, state, zip, phone, email, website, notes, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        cId, req.userId,
        fields.companyName.trim(), fields.mcNumber || '', fields.dotNumber || '',
        'broker', 'active', '', '', '', '',
        fields.companyPhone || '', fields.companyEmail || '', '', '',
        now, now,
      );
      companyRow = db.prepare('SELECT * FROM companies WHERE id = ?').get(cId);
      companyCreated = true;
    }
  }

  const hasLoadInfo =
    (fields.loadNumber || '').trim() ||
    ((fields.originCity || '').trim() && (fields.destCity || '').trim()) ||
    Number(fields.rate) > 0;

  if (hasLoadInfo && companyRow) {
    loadRow = findMatchingLoad(fields, companyRow.id, req.userId);
    if (!loadRow) {
      const lId = uuidv4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO loads
          (id, user_id, load_number, company_id,
           origin_city, origin_state, origin_address, origin_zip,
           dest_city, dest_state, dest_address, dest_zip,
           pickup_date, pickup_time, delivery_date, delivery_time,
           rate, status, truck_type, weight, commodity, miles,
           driver_name, truck_number, trailer_number, notes,
           created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        lId, req.userId,
        fields.loadNumber || '', companyRow.id,
        fields.originCity || '', fields.originState || '', '', '',
        fields.destCity   || '', fields.destState   || '', '', '',
        fields.pickupDate   || null, fields.pickupTime   || '',
        fields.deliveryDate || null, fields.deliveryTime || '',
        Number(fields.rate) || 0, 'pending',
        fields.equipmentType || '', Number(fields.weight) || 0,
        fields.commodity || '', 0, '', '', '', '',
        now, now,
      );
      loadRow = db.prepare('SELECT * FROM loads WHERE id = ?').get(lId);
      loadCreated = true;
    }
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE documents SET
      company_id=?, load_id=?, type=?, status=?, updated_at=?
    WHERE id = ? AND user_id = ?
  `).run(
    companyRow?.id || null,
    loadRow?.id    || null,
    fields.docType || 'other',
    'confirmed',
    now,
    doc.id, req.userId,
  );

  const updatedDoc = db.prepare('SELECT * FROM documents WHERE id = ?').get(doc.id);

  res.json({
    document:  docToApi(updatedDoc),
    company:   companyToApi(companyRow),
    load:      loadToApi(loadRow),
    created:   { company: companyCreated, load: loadCreated },
  });
});

export default router;
