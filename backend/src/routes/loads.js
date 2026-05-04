import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function toApi(row) {
  if (!row) return null;
  return {
    id:            row.id,
    loadNumber:    row.load_number,
    companyId:     row.company_id,
    originCity:    row.origin_city,
    originState:   row.origin_state,
    originAddress: row.origin_address,
    originZip:     row.origin_zip,
    destCity:      row.dest_city,
    destState:     row.dest_state,
    destAddress:   row.dest_address,
    destZip:       row.dest_zip,
    pickupDate:    row.pickup_date,
    pickupTime:    row.pickup_time,
    deliveryDate:  row.delivery_date,
    deliveryTime:  row.delivery_time,
    rate:          row.rate,
    status:        row.status,
    truckType:     row.truck_type,
    weight:        row.weight,
    commodity:     row.commodity,
    miles:         row.miles,
    driverName:    row.driver_name,
    truckNumber:   row.truck_number,
    trailerNumber: row.trailer_number,
    notes:         row.notes,
    documentIds:   row.document_ids ? row.document_ids.split(',') : [],
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
  };
}

router.get('/', (req, res) => {
  const { companyId, status } = req.query;
  let sql = `
    SELECT l.*, GROUP_CONCAT(d.id) AS document_ids
    FROM loads l
    LEFT JOIN documents d ON d.load_id = l.id AND d.status = 'confirmed'
    WHERE l.user_id = ?
  `;
  const params = [req.userId];
  if (companyId) { sql += ' AND l.company_id = ?'; params.push(companyId); }
  if (status)    { sql += ' AND l.status = ?';     params.push(status); }
  sql += ' GROUP BY l.id ORDER BY l.created_at DESC';
  res.json(db.prepare(sql).all(...params).map(toApi));
});

router.get('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT l.*, GROUP_CONCAT(d.id) AS document_ids
    FROM loads l
    LEFT JOIN documents d ON d.load_id = l.id AND d.status = 'confirmed'
    WHERE l.id = ? AND l.user_id = ?
    GROUP BY l.id
  `).get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Load not found' });
  res.json(toApi(row));
});

router.post('/', (req, res) => {
  const b = req.body || {};
  const id = uuidv4();
  const now = new Date().toISOString();
  const origin = b.origin || {};
  const dest   = b.destination || {};
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
    id, req.userId,
    b.loadNumber || '', b.companyId || null,
    origin.city  || b.originCity  || '', origin.state || b.originState || '',
    origin.address || b.originAddress || '', origin.zip || b.originZip || '',
    dest.city    || b.destCity    || '', dest.state   || b.destState   || '',
    dest.address || b.destAddress || '', dest.zip     || b.destZip     || '',
    b.pickupDate   || null, b.pickupTime   || '',
    b.deliveryDate || null, b.deliveryTime || '',
    Number(b.rate)   || 0, b.status     || 'pending',
    b.truckType  || '', Number(b.weight) || 0,
    b.commodity  || '', Number(b.miles)  || 0,
    b.driverName || '', b.truckNumber || '', b.trailerNumber || '',
    b.notes || '',
    now, now,
  );
  const newRow = db.prepare(`
    SELECT l.*, GROUP_CONCAT(d.id) AS document_ids
    FROM loads l LEFT JOIN documents d ON d.load_id = l.id AND d.status = 'confirmed'
    WHERE l.id = ? GROUP BY l.id
  `).get(id);
  res.status(201).json(toApi(newRow));
});

router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM loads WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Load not found' });
  const b = req.body || {};
  const now = new Date().toISOString();
  const origin = b.origin || {};
  const dest   = b.destination || {};
  db.prepare(`
    UPDATE loads SET
      load_number=?, company_id=?,
      origin_city=?, origin_state=?, origin_address=?, origin_zip=?,
      dest_city=?, dest_state=?, dest_address=?, dest_zip=?,
      pickup_date=?, pickup_time=?, delivery_date=?, delivery_time=?,
      rate=?, status=?, truck_type=?, weight=?, commodity=?, miles=?,
      driver_name=?, truck_number=?, trailer_number=?, notes=?, updated_at=?
    WHERE id = ? AND user_id = ?
  `).run(
    b.loadNumber !== undefined ? b.loadNumber : row.load_number,
    b.companyId  !== undefined ? (b.companyId || null) : row.company_id,
    origin.city    || b.originCity    || row.origin_city,
    origin.state   || b.originState   || row.origin_state,
    origin.address || b.originAddress || row.origin_address,
    origin.zip     || b.originZip     || row.origin_zip,
    dest.city    || b.destCity    || row.dest_city,
    dest.state   || b.destState   || row.dest_state,
    dest.address || b.destAddress || row.dest_address,
    dest.zip     || b.destZip     || row.dest_zip,
    b.pickupDate   !== undefined ? (b.pickupDate   || null) : row.pickup_date,
    b.pickupTime   !== undefined ? b.pickupTime    : row.pickup_time,
    b.deliveryDate !== undefined ? (b.deliveryDate || null) : row.delivery_date,
    b.deliveryTime !== undefined ? b.deliveryTime  : row.delivery_time,
    b.rate       !== undefined ? Number(b.rate)   : row.rate,
    b.status     !== undefined ? b.status         : row.status,
    b.truckType  !== undefined ? b.truckType      : row.truck_type,
    b.weight     !== undefined ? Number(b.weight) : row.weight,
    b.commodity  !== undefined ? b.commodity      : row.commodity,
    b.miles      !== undefined ? Number(b.miles)  : row.miles,
    b.driverName    !== undefined ? b.driverName    : row.driver_name,
    b.truckNumber   !== undefined ? b.truckNumber   : row.truck_number,
    b.trailerNumber !== undefined ? b.trailerNumber : row.trailer_number,
    b.notes      !== undefined ? b.notes      : row.notes,
    now,
    req.params.id, req.userId,
  );
  const updated = db.prepare(`
    SELECT l.*, GROUP_CONCAT(d.id) AS document_ids
    FROM loads l LEFT JOIN documents d ON d.load_id = l.id AND d.status = 'confirmed'
    WHERE l.id = ? GROUP BY l.id
  `).get(req.params.id);
  res.json(toApi(updated));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM loads WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (info.changes === 0) return res.status(404).json({ error: 'Load not found' });
  res.status(204).send();
});

export default router;
