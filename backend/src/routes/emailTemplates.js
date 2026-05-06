import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function toApi(row) {
  return {
    id:        row.id,
    name:      row.name,
    subject:   row.subject,
    body:      row.body,
    variables: JSON.parse(row.variables || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM email_templates WHERE user_id = ? ORDER BY name ASC').all(req.userId);
  res.json(rows.map(toApi));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM email_templates WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Template not found' });
  res.json(toApi(row));
});

router.post('/', (req, res) => {
  const b = req.body || {};
  const id = uuidv4();
  const now = new Date().toISOString();
  const variables = extractVariables(b.body || '');
  db.prepare(`
    INSERT INTO email_templates (id, user_id, name, subject, body, variables, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(id, req.userId, b.name || '', b.subject || '', b.body || '', JSON.stringify(variables), now, now);
  res.status(201).json(toApi(db.prepare('SELECT * FROM email_templates WHERE id = ?').get(id)));
});

router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM email_templates WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Template not found' });
  const b = req.body || {};
  const body = b.body ?? row.body;
  const variables = extractVariables(body);
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE email_templates SET name=?, subject=?, body=?, variables=?, updated_at=?
    WHERE id = ? AND user_id = ?
  `).run(b.name ?? row.name, b.subject ?? row.subject, body, JSON.stringify(variables), now, req.params.id, req.userId);
  res.json(toApi(db.prepare('SELECT * FROM email_templates WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM email_templates WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (info.changes === 0) return res.status(404).json({ error: 'Template not found' });
  res.status(204).send();
});

/** Extract {{variable_name}} tokens from template body */
function extractVariables(body) {
  const matches = (body || '').match(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

/** Apply variable values to a template — used server-side for preview */
router.post('/:id/preview', (req, res) => {
  const row = db.prepare('SELECT * FROM email_templates WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Template not found' });
  const values = req.body.values || {};
  let subject = row.subject;
  let body = row.body;
  for (const [key, val] of Object.entries(values)) {
    const re = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    subject = subject.replace(re, val);
    body    = body.replace(re, val);
  }
  res.json({ subject, body });
});

export default router;
