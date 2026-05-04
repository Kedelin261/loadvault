import { useState, useEffect } from 'react';
import { api } from '../api/client';

const EQUIPMENT_TYPES = [
  'Dry Van', 'Reefer', 'Flatbed', 'Step Deck',
  'RGN', 'Power Only', 'Tanker', 'Hotshot', 'Other',
];

const STATUSES = [
  { value: 'pending',     label: 'Pending' },
  { value: 'dispatched',  label: 'Dispatched' },
  { value: 'in-transit',  label: 'In Transit' },
  { value: 'delivered',   label: 'Delivered' },
  { value: 'invoiced',    label: 'Invoiced' },
  { value: 'paid',        label: 'Paid' },
];

const EMPTY = {
  loadNumber: '',
  companyId: '',
  status: 'pending',
  rate: '',
  originCity: '',
  originState: '',
  pickupDate: '',
  pickupTime: '',
  destCity: '',
  destState: '',
  deliveryDate: '',
  deliveryTime: '',
  commodity: '',
  weight: '',
  truckType: '',
  driverName: '',
  truckNumber: '',
  trailerNumber: '',
  notes: '',
};

function flatten(load) {
  return {
    ...EMPTY,
    ...load,
    companyId: load.companyId || '',
    rate: load.rate != null ? String(load.rate) : '',
    weight: load.weight != null ? String(load.weight) : '',
    originCity: load.origin?.city || load.originCity || '',
    originState: load.origin?.state || load.originState || '',
    destCity: load.destination?.city || load.destCity || '',
    destState: load.destination?.state || load.destState || '',
    pickupDate: load.pickupDate || '',
    pickupTime: load.pickupTime || '',
    deliveryDate: load.deliveryDate || '',
    deliveryTime: load.deliveryTime || '',
  };
}

export default function LoadForm({
  initial = null,
  fixedCompanyId = null,
  companies: companiesProp = null,
  onSave,
  onCancel,
  loading = false,
}) {
  const [form, setForm] = useState(() => {
    const f = initial ? flatten(initial) : { ...EMPTY };
    if (fixedCompanyId) f.companyId = fixedCompanyId;
    return f;
  });
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState(companiesProp || []);

  useEffect(() => {
    if (!companiesProp) {
      api.get('/companies').then(setCompanies).catch(() => {});
    }
  }, [companiesProp]);

  const set = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cid = fixedCompanyId || form.companyId;
    if (!cid) { setError('Please select a company.'); return; }
    setError('');

    onSave({
      loadNumber: form.loadNumber.trim() || `LV-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      companyId: cid,
      status: form.status,
      rate: Number(form.rate) || 0,
      origin: { city: form.originCity.trim(), state: form.originState.trim().toUpperCase(), address: '', zip: '' },
      destination: { city: form.destCity.trim(), state: form.destState.trim().toUpperCase(), address: '', zip: '' },
      pickupDate: form.pickupDate || null,
      pickupTime: form.pickupTime || '',
      deliveryDate: form.deliveryDate || null,
      deliveryTime: form.deliveryTime || '',
      commodity: form.commodity,
      weight: Number(form.weight) || 0,
      truckType: form.truckType,
      driverName: form.driverName,
      truckNumber: form.truckNumber,
      trailerNumber: form.trailerNumber,
      notes: form.notes,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}

      <div className="form-section-title">Basic Info</div>

      {!fixedCompanyId && (
        <div className="form-group">
          <label className="form-label">
            Company <span className="form-required">*</span>
          </label>
          <select className="form-select" name="companyId" value={form.companyId} onChange={set}>
            <option value="">Select a company…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {companies.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              No companies yet — add one on the Companies page first.
            </p>
          )}
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Load Number</label>
          <input
            className="form-input"
            name="loadNumber"
            value={form.loadNumber}
            onChange={set}
            placeholder="Auto-generated if blank"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" name="status" value={form.status} onChange={set}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Rate ($)</label>
        <input
          className="form-input"
          name="rate"
          value={form.rate}
          onChange={set}
          placeholder="0.00"
          type="number"
          min="0"
          step="0.01"
        />
      </div>

      <div className="form-divider" />
      <div className="form-section-title">Pickup</div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">City</label>
          <input className="form-input" name="originCity" value={form.originCity} onChange={set} placeholder="Chicago" />
        </div>
        <div className="form-group">
          <label className="form-label">State</label>
          <input className="form-input" name="originState" value={form.originState} onChange={set} placeholder="IL" maxLength={2} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Date</label>
          <input className="form-input" name="pickupDate" value={form.pickupDate} onChange={set} type="date" />
        </div>
        <div className="form-group">
          <label className="form-label">Time</label>
          <input className="form-input" name="pickupTime" value={form.pickupTime} onChange={set} type="time" />
        </div>
      </div>

      <div className="form-divider" />
      <div className="form-section-title">Delivery</div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">City</label>
          <input className="form-input" name="destCity" value={form.destCity} onChange={set} placeholder="Dallas" />
        </div>
        <div className="form-group">
          <label className="form-label">State</label>
          <input className="form-input" name="destState" value={form.destState} onChange={set} placeholder="TX" maxLength={2} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Date</label>
          <input className="form-input" name="deliveryDate" value={form.deliveryDate} onChange={set} type="date" />
        </div>
        <div className="form-group">
          <label className="form-label">Time</label>
          <input className="form-input" name="deliveryTime" value={form.deliveryTime} onChange={set} type="time" />
        </div>
      </div>

      <div className="form-divider" />
      <div className="form-section-title">Cargo</div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Commodity</label>
          <input
            className="form-input"
            name="commodity"
            value={form.commodity}
            onChange={set}
            placeholder="e.g. Auto Parts"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Weight (lbs)</label>
          <input
            className="form-input"
            name="weight"
            value={form.weight}
            onChange={set}
            placeholder="42000"
            type="number"
            min="0"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Equipment Type</label>
        <select className="form-select" name="truckType" value={form.truckType} onChange={set}>
          <option value="">Select equipment…</option>
          {EQUIPMENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="form-divider" />
      <div className="form-section-title">Driver</div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Driver Name</label>
          <input
            className="form-input"
            name="driverName"
            value={form.driverName}
            onChange={set}
            placeholder="John Smith"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Truck #</label>
          <input
            className="form-input"
            name="truckNumber"
            value={form.truckNumber}
            onChange={set}
            placeholder="T-123"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Trailer #</label>
        <input
          className="form-input"
          name="trailerNumber"
          value={form.trailerNumber}
          onChange={set}
          placeholder="TR-456"
        />
      </div>

      <div className="form-divider" />

      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea
          className="form-textarea"
          name="notes"
          value={form.notes}
          onChange={set}
          placeholder="Additional notes about this load…"
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving…' : initial ? 'Save Changes' : 'Create Load'}
        </button>
      </div>
    </form>
  );
}
