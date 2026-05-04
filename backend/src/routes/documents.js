import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function toApi(row) {
  if (!row) return null;
  return {
    id:               row.id,
    loadId:           row.load_id,
    companyId:        row.company_id,
    type:             row.type,
    filename:         row.filename,
    originalName:     row.original_name,
    size:             row.size,
    mimeType:         row.mime_type,
    filePath:         row.file_path,
    url:              row.url,
    notes:            row.notes,
    extractionStatus: row.extraction_status,
    extractionError:  row.extraction_error,
    status:           row.status,
    uploadedAt:       row.uploaded_at,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  };
}

router.get('/', (req, res) => {
  const { loadId, companyId, type } = req.query;
  let sql = 'SELECT * FROM documents WHERE user_id = ?';
  const params = [req.userId];
  if (loadId)    { sql += ' AND load_id = ?';    params.push(loadId); }
  if (companyId) { sql += ' AND company_id = ?'; params.push(companyId); }
  if (type)      { sql += ' AND type = ?';       params.push(type); }
  sql += ' ORDER BY uploaded_at DESC';
  res.json(db.prepare(sql).all(...params).map(toApi));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Document not found' });
  res.json(toApi(row));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (info.changes === 0) return res.status(404).json({ error: 'Document not found' });
  res.status(204).send();
});

export default router;
