import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function toApi(row) {
  if (!row) return null;
  return {
    id:          row.id,
    companyId:   row.company_id,
    firstName:   row.first_name,
    lastName:    row.last_name,
    role:        row.role,
    phone:       row.phone,
    email:       row.email,
    notes:       row.notes,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

router.get('/', (req, res) => {
  const { companyId } = req.query;
  let sql = 'SELECT * FROM contacts WHERE user_id = ?';
  const params = [req.userId];
  if (companyId) { sql += ' AND company_id = ?'; params.push(companyId); }
  sql += ' ORDER BY last_name ASC, first_name ASC';
  res.json(db.prepare(sql).all(...params).map(toApi));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Contact not found' });
  res.json(toApi(row));
});

router.post('/', (req, res) => {
  const b = req.body || {};
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO contacts
      (id, user_id, company_id, first_name, last_name, role, phone, email, notes, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id, req.userId, b.companyId || null,
    b.firstName || '', b.lastName || '',
    b.role || '', b.phone || '', b.email || '', b.notes || '',
    now, now,
  );
  res.status(201).json(toApi(db.prepare('SELECT * FROM contacts WHERE id = ?').get(id)));
});

router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Contact not found' });
  const b = req.body || {};
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE contacts SET
      company_id=?, first_name=?, last_name=?, role=?, phone=?, email=?, notes=?, updated_at=?
    WHERE id = ? AND user_id = ?
  `).run(
    b.companyId   !== undefined ? (b.companyId || null) : row.company_id,
    b.firstName   ?? row.first_name,
    b.lastName    ?? row.last_name,
    b.role        ?? row.role,
    b.phone       ?? row.phone,
    b.email       ?? row.email,
    b.notes       ?? row.notes,
    now,
    req.params.id, req.userId,
  );
  res.json(toApi(db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM contacts WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (info.changes === 0) return res.status(404).json({ error: 'Contact not found' });
  res.status(204).send();
});

export default router;
