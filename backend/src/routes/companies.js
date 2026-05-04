import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function toApi(row) {
  if (!row) return null;
  return {
    id:         row.id,
    name:       row.name,
    mcNumber:   row.mc_number,
    dotNumber:  row.dot_number,
    type:       row.type,
    status:     row.status,
    address:    row.address,
    city:       row.city,
    state:      row.state,
    zip:        row.zip,
    phone:      row.phone,
    email:      row.email,
    website:    row.website,
    notes:      row.notes,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
  };
}

router.get('/', (req, res) => {
  const { type, status } = req.query;
  let sql = 'SELECT * FROM companies WHERE user_id = ?';
  const params = [req.userId];
  if (type)   { sql += ' AND type = ?';   params.push(type); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY name ASC';
  res.json(db.prepare(sql).all(...params).map(toApi));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM companies WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Company not found' });
  res.json(toApi(row));
});

router.post('/', (req, res) => {
  const b = req.body || {};
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO companies
      (id, user_id, name, mc_number, dot_number, type, status, address, city, state, zip, phone, email, website, notes, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id, req.userId,
    b.name || '', b.mcNumber || '', b.dotNumber || '',
    b.type || 'broker', b.status || 'active',
    b.address || '', b.city || '', b.state || '', b.zip || '',
    b.phone || '', b.email || '', b.website || '', b.notes || '',
    now, now,
  );
  res.status(201).json(toApi(db.prepare('SELECT * FROM companies WHERE id = ?').get(id)));
});

router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM companies WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Company not found' });
  const b = req.body || {};
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE companies SET
      name=?, mc_number=?, dot_number=?, type=?, status=?,
      address=?, city=?, state=?, zip=?, phone=?, email=?, website=?, notes=?, updated_at=?
    WHERE id = ? AND user_id = ?
  `).run(
    b.name       ?? row.name,
    b.mcNumber   ?? row.mc_number,
    b.dotNumber  ?? row.dot_number,
    b.type       ?? row.type,
    b.status     ?? row.status,
    b.address    ?? row.address,
    b.city       ?? row.city,
    b.state      ?? row.state,
    b.zip        ?? row.zip,
    b.phone      ?? row.phone,
    b.email      ?? row.email,
    b.website    ?? row.website,
    b.notes      ?? row.notes,
    now,
    req.params.id, req.userId,
  );
  res.json(toApi(db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM companies WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (info.changes === 0) return res.status(404).json({ error: 'Company not found' });
  res.status(204).send();
});

export default router;
