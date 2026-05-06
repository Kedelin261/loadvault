import { useState, useEffect } from 'react';
import { Truck, Plus, Edit2, Trash2, ChevronDown, ChevronRight, Wrench, Receipt, X } from 'lucide-react';
import { api } from '../api/client';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

const MAINT_TYPES = ['Oil Change', 'Tire Rotation', 'Tire Replacement', 'Brake Service', 'Engine Repair', 'Transmission', 'Fuel Filter', 'Air Filter', 'Inspection', 'Registration', 'Other'];

const EMPTY_TRUCK = { number: '', vin: '', make: '', model: '', year: '', notes: '' };
const EMPTY_MAINT = { type: 'Oil Change', description: '', cost: '', date: '', notes: '' };

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtCost(cost) {
  if (!cost && cost !== 0) return '';
  return `$${Number(cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Truck Form ────────────────────────────────────────────────────────────────

function TruckForm({ initial = null, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial ? { ...EMPTY_TRUCK, ...initial } : { ...EMPTY_TRUCK });
  const [error, setError] = useState('');

  const set = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.number.trim()) { setError('Truck number is required.'); return; }
    setError('');
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Truck Number <span className="form-required">*</span></label>
          <input className="form-input" name="number" value={form.number} onChange={set} placeholder="e.g. T-101" autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Year</label>
          <input className="form-input" name="year" value={form.year} onChange={set} placeholder="2022" type="number" min="1970" max="2099" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Make</label>
          <input className="form-input" name="make" value={form.make} onChange={set} placeholder="Freightliner" />
        </div>
        <div className="form-group">
          <label className="form-label">Model</label>
          <input className="form-input" name="model" value={form.model} onChange={set} placeholder="Cascadia" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">VIN</label>
        <input className="form-input" name="vin" value={form.vin} onChange={set} placeholder="1FUJGBDV0CLBP8765" />
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-textarea" name="notes" value={form.notes} onChange={set} placeholder="Any notes about this truck…" />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving…' : initial ? 'Save Changes' : 'Add Truck'}
        </button>
      </div>
    </form>
  );
}

// ── Maintenance Form ──────────────────────────────────────────────────────────

function MaintForm({ onSave, onCancel, loading }) {
  const [form, setForm] = useState({ ...EMPTY_MAINT });
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  const set = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.date) { setError('Date is required.'); return; }
    setError('');
    onSave(form, receipt);
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-select" name="type" value={form.type} onChange={set}>
            {MAINT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Date <span className="form-required">*</span></label>
          <input className="form-input" name="date" value={form.date} onChange={set} type="date" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Cost ($)</label>
          <input className="form-input" name="cost" value={form.cost} onChange={set} type="number" min="0" step="0.01" placeholder="0.00" />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <input className="form-input" name="description" value={form.description} onChange={set} placeholder="e.g. Replaced front tires" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-textarea" name="notes" value={form.notes} onChange={set} placeholder="Additional details…" />
      </div>
      <div className="form-group">
        <label className="form-label">Receipt (PDF / JPG / PNG)</label>
        <div className="maint-receipt-upload">
          {receipt ? (
            <div className="maint-receipt-chosen">
              <Receipt size={13} />
              <span>{receipt.name}</span>
              <button type="button" className="icon-btn" onClick={() => setReceipt(null)} aria-label="Remove">
                <X size={12} />
              </button>
            </div>
          ) : (
            <label className="maint-receipt-btn">
              <Receipt size={13} /> Attach Receipt
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setReceipt(f); e.target.value = ''; }}
              />
            </label>
          )}
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving…' : 'Add Record'}
        </button>
      </div>
    </form>
  );
}

// ── Maintenance Record Row ────────────────────────────────────────────────────

function MaintRow({ record, onDelete }) {
  return (
    <div className="maint-record-row">
      <div className="maint-record-left">
        <span className="maint-type-badge">{record.type}</span>
        <span className="maint-date">{fmtDate(record.date)}</span>
        {record.description && <span className="maint-desc">{record.description}</span>}
      </div>
      <div className="maint-record-right">
        {record.cost > 0 && <span className="maint-cost">{fmtCost(record.cost)}</span>}
        {record.receiptFilename && (
          <a
            href={`/receipts/${record.receiptFilename}`}
            target="_blank"
            rel="noopener noreferrer"
            className="maint-receipt-link"
            title={record.receiptOriginal || 'Receipt'}
          >
            <Receipt size={13} /> Receipt
          </a>
        )}
        <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => onDelete(record)} aria-label="Delete">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Truck Card ────────────────────────────────────────────────────────────────

function TruckCard({ truck, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [showAddMaint, setShowAddMaint] = useState(false);
  const [savingMaint, setSavingMaint] = useState(false);
  const [deleteMaint, setDeleteMaint] = useState(null);

  async function fetchRecords() {
    setLoadingRecords(true);
    try {
      const data = await api.get(`/trucks/${truck.id}/maintenance`);
      setRecords(data);
    } catch {}
    finally { setLoadingRecords(false); }
  }

  function toggleExpand() {
    if (!expanded) fetchRecords();
    setExpanded((v) => !v);
  }

  async function handleAddMaint(form, receiptFile) {
    setSavingMaint(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      if (receiptFile) fd.append('receipt', receiptFile);
      const created = await api.uploadForm(`/trucks/${truck.id}/maintenance`, fd);
      setRecords((r) => [created, ...r]);
      setShowAddMaint(false);
    } catch {}
    finally { setSavingMaint(false); }
  }

  async function handleDeleteMaint() {
    try {
      await api.delete(`/trucks/${truck.id}/maintenance/${deleteMaint.id}`);
      setRecords((r) => r.filter((x) => x.id !== deleteMaint.id));
      setDeleteMaint(null);
    } catch {}
  }

  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);

  return (
    <div className="truck-card">
      <div className="truck-card-header">
        <div className="truck-card-info">
          <div className="truck-card-number">
            <Truck size={16} />
            {truck.number}
          </div>
          <div className="truck-card-meta">
            {[truck.year, truck.make, truck.model].filter(Boolean).join(' ')}
            {truck.vin && <span className="truck-vin">VIN {truck.vin}</span>}
          </div>
        </div>
        <div className="truck-card-actions">
          <button className="icon-btn" onClick={() => onEdit(truck)} aria-label="Edit"><Edit2 size={14} /></button>
          <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => onDelete(truck)} aria-label="Delete"><Trash2 size={14} /></button>
          <button className="truck-expand-btn" onClick={toggleExpand} aria-label="Toggle maintenance">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span>Maintenance</span>
            {records.length > 0 && <span className="truck-record-count">{records.length}</span>}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="truck-maint-panel">
          <div className="truck-maint-toolbar">
            <span className="truck-maint-label">
              <Wrench size={13} /> Records
              {records.length > 0 && totalCost > 0 && (
                <span className="truck-maint-total">Total: {fmtCost(totalCost)}</span>
              )}
            </span>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setShowAddMaint(true)}>
              <Plus size={12} /> Add Record
            </button>
          </div>

          {loadingRecords ? (
            <div className="maint-loading">Loading…</div>
          ) : records.length === 0 ? (
            <div className="maint-empty">No maintenance records yet.</div>
          ) : (
            records.map((r) => (
              <MaintRow key={r.id} record={r} onDelete={setDeleteMaint} />
            ))
          )}

          <Modal isOpen={showAddMaint} onClose={() => setShowAddMaint(false)} title="Add Maintenance Record">
            <MaintForm onSave={handleAddMaint} onCancel={() => setShowAddMaint(false)} loading={savingMaint} />
          </Modal>
          <ConfirmDialog
            isOpen={!!deleteMaint}
            onClose={() => setDeleteMaint(null)}
            onConfirm={handleDeleteMaint}
            title="Delete Record"
            message={`Remove this ${deleteMaint?.type || 'maintenance'} record?`}
          />
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Trucks() {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTruck, setEditTruck] = useState(null);
  const [deleteTruck, setDeleteTruck] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/trucks').then(setTrucks).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleCreate(data) {
    setSaving(true);
    try {
      const created = await api.post('/trucks', data);
      setTrucks((t) => [created, ...t]);
      setShowCreate(false);
    } catch {}
    finally { setSaving(false); }
  }

  async function handleEdit(data) {
    setSaving(true);
    try {
      const updated = await api.put(`/trucks/${editTruck.id}`, data);
      setTrucks((t) => t.map((x) => (x.id === updated.id ? updated : x)));
      setEditTruck(null);
    } catch {}
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await api.delete(`/trucks/${deleteTruck.id}`);
      setTrucks((t) => t.filter((x) => x.id !== deleteTruck.id));
      setDeleteTruck(null);
    } catch {}
    finally { setSaving(false); }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Maintenance Tracker</h1>
          <p className="page-subtitle">Track service records and costs per truck</p>
        </div>
        <button className="btn btn-ghost" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> Add Truck
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading…</div>
      ) : trucks.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Truck />}
            title="No trucks yet"
            description="Add your trucks to start tracking maintenance records, costs, and receipts."
            action={
              <button className="btn btn-ghost" onClick={() => setShowCreate(true)}>
                <Plus size={14} /> Add Truck
              </button>
            }
          />
        </div>
      ) : (
        <div className="truck-list">
          {trucks.map((truck) => (
            <TruckCard
              key={truck.id}
              truck={truck}
              onEdit={setEditTruck}
              onDelete={setDeleteTruck}
            />
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Truck">
        <TruckForm onSave={handleCreate} onCancel={() => setShowCreate(false)} loading={saving} />
      </Modal>
      <Modal isOpen={!!editTruck} onClose={() => setEditTruck(null)} title="Edit Truck">
        <TruckForm initial={editTruck} onSave={handleEdit} onCancel={() => setEditTruck(null)} loading={saving} />
      </Modal>
      <ConfirmDialog
        isOpen={!!deleteTruck}
        onClose={() => setDeleteTruck(null)}
        onConfirm={handleDelete}
        title="Delete Truck"
        message={`Remove truck ${deleteTruck?.number || ''}? All maintenance records will also be deleted.`}
        loading={saving}
      />
    </div>
  );
}
