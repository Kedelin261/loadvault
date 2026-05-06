import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { DATA_DIR } from '../db.js';

const RECEIPTS_DIR = path.join(DATA_DIR, 'receipts');
await fs.mkdir(RECEIPTS_DIR, { recursive: true });

const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(file.mimetype);
    cb(ok ? null : new Error('Only PDF, JPG, and PNG receipts are accepted'), ok);
  },
});

function runReceiptUpload(req, res) {
  return new Promise((resolve, reject) => {
    receiptUpload.single('receipt')(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

function truckToApi(row) {
  return {
    id: row.id, number: row.number, vin: row.vin,
    make: row.make, model: row.model, year: row.year,
    notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function maintToApi(row) {
  return {
    id:          row.id,
    truckId:     row.truck_id,
    type:        row.type,
    description: row.description,
    cost:        row.cost,
    date:        row.date,
    receiptFilename: row.receipt_filename,
    receiptOriginal: row.receipt_original,
    notes:       row.notes,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

const router = Router();
router.use(requireAuth);

// ── Trucks CRUD ───────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM trucks WHERE user_id = ? ORDER BY number ASC').all(req.userId);
  res.json(rows.map(truckToApi));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM trucks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Truck not found' });
  res.json(truckToApi(row));
});

router.post('/', (req, res) => {
  const b = req.body || {};
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO trucks (id, user_id, number, vin, make, model, year, notes, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(id, req.userId, b.number || '', b.vin || '', b.make || '', b.model || '', b.year || '', b.notes || '', now, now);
  res.status(201).json(truckToApi(db.prepare('SELECT * FROM trucks WHERE id = ?').get(id)));
});

router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM trucks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Truck not found' });
  const b = req.body || {};
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE trucks SET number=?, vin=?, make=?, model=?, year=?, notes=?, updated_at=?
    WHERE id = ? AND user_id = ?
  `).run(
    b.number ?? row.number, b.vin ?? row.vin,
    b.make ?? row.make, b.model ?? row.model, b.year ?? row.year,
    b.notes ?? row.notes, now,
    req.params.id, req.userId,
  );
  res.json(truckToApi(db.prepare('SELECT * FROM trucks WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM trucks WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (info.changes === 0) return res.status(404).json({ error: 'Truck not found' });
  res.status(204).send();
});

// ── Maintenance records ───────────────────────────────────────────────────────

router.get('/:truckId/maintenance', (req, res) => {
  const truck = db.prepare('SELECT id FROM trucks WHERE id = ? AND user_id = ?').get(req.params.truckId, req.userId);
  if (!truck) return res.status(404).json({ error: 'Truck not found' });
  const rows = db.prepare(
    'SELECT * FROM maintenance_records WHERE truck_id = ? ORDER BY date DESC, created_at DESC'
  ).all(req.params.truckId);
  res.json(rows.map(maintToApi));
});

router.post('/:truckId/maintenance', async (req, res) => {
  const truck = db.prepare('SELECT id FROM trucks WHERE id = ? AND user_id = ?').get(req.params.truckId, req.userId);
  if (!truck) return res.status(404).json({ error: 'Truck not found' });

  // Handle optional file upload
  try { await runReceiptUpload(req, res); } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  let receiptFilename = '';
  let receiptPath = '';
  let receiptOriginal = '';

  if (req.file) {
    const ext = path.extname(req.file.originalname).toLowerCase() || '.bin';
    receiptFilename = `${uuidv4()}${ext}`;
    receiptPath = path.join(RECEIPTS_DIR, receiptFilename);
    await fs.writeFile(receiptPath, req.file.buffer);
    receiptOriginal = req.file.originalname;
  }

  const b = req.body || {};
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO maintenance_records
      (id, user_id, truck_id, type, description, cost, date,
       receipt_filename, receipt_path, receipt_original, notes, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id, req.userId, req.params.truckId,
    b.type || 'other', b.description || '',
    Number(b.cost) || 0, b.date || null,
    receiptFilename, receiptPath, receiptOriginal,
    b.notes || '', now, now,
  );
  res.status(201).json(maintToApi(db.prepare('SELECT * FROM maintenance_records WHERE id = ?').get(id)));
});

router.delete('/:truckId/maintenance/:id', (req, res) => {
  const truck = db.prepare('SELECT id FROM trucks WHERE id = ? AND user_id = ?').get(req.params.truckId, req.userId);
  if (!truck) return res.status(404).json({ error: 'Truck not found' });
  const info = db.prepare('DELETE FROM maintenance_records WHERE id = ? AND truck_id = ?')
    .run(req.params.id, req.params.truckId);
  if (info.changes === 0) return res.status(404).json({ error: 'Record not found' });
  res.status(204).send();
});

export default router;
