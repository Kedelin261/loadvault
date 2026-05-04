import { useState } from 'react';

const EMPTY = {
  name: '',
  type: 'broker',
  status: 'active',
  mcNumber: '',
  dotNumber: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  notes: '',
};

export default function CompanyForm({ initial = null, onSave, onCancel, loading = false }) {
  const [form, setForm] = useState(initial ? { ...EMPTY, ...initial } : EMPTY);
  const [error, setError] = useState('');

  const set = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Company name is required.');
      return;
    }
    setError('');
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}

      <div className="form-section-title">Basic Info</div>

      <div className="form-group">
        <label className="form-label">
          Company Name <span className="form-required">*</span>
        </label>
        <input
          className="form-input"
          name="name"
          value={form.name}
          onChange={set}
          placeholder="e.g. Apex Freight Brokers"
          autoFocus
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-select" name="type" value={form.type} onChange={set}>
            <option value="broker">Broker</option>
            <option value="shipper">Shipper</option>
            <option value="carrier">Carrier</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" name="status" value={form.status} onChange={set}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">MC Number</label>
          <input
            className="form-input"
            name="mcNumber"
            value={form.mcNumber}
            onChange={set}
            placeholder="MC-XXXXXX"
          />
        </div>
        <div className="form-group">
          <label className="form-label">DOT Number</label>
          <input
            className="form-input"
            name="dotNumber"
            value={form.dotNumber}
            onChange={set}
            placeholder="XXXXXXX"
          />
        </div>
      </div>

      <div className="form-divider" />
      <div className="form-section-title">Contact</div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input
            className="form-input"
            name="phone"
            value={form.phone}
            onChange={set}
            placeholder="(555) 000-0000"
            type="tel"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            name="email"
            value={form.email}
            onChange={set}
            placeholder="contact@company.com"
            type="email"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Website</label>
        <input
          className="form-input"
          name="website"
          value={form.website}
          onChange={set}
          placeholder="https://company.com"
        />
      </div>

      <div className="form-divider" />
      <div className="form-section-title">Address</div>

      <div className="form-group">
        <label className="form-label">Street</label>
        <input
          className="form-input"
          name="address"
          value={form.address}
          onChange={set}
          placeholder="123 Main St"
        />
      </div>

      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">City</label>
          <input className="form-input" name="city" value={form.city} onChange={set} placeholder="Chicago" />
        </div>
        <div className="form-group">
          <label className="form-label">State</label>
          <input
            className="form-input"
            name="state"
            value={form.state}
            onChange={set}
            placeholder="IL"
            maxLength={2}
          />
        </div>
        <div className="form-group">
          <label className="form-label">ZIP</label>
          <input className="form-input" name="zip" value={form.zip} onChange={set} placeholder="60601" />
        </div>
      </div>

      <div className="form-divider" />

      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea
          className="form-textarea"
          name="notes"
          value={form.notes}
          onChange={set}
          placeholder="Additional notes about this company…"
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving…' : initial ? 'Save Changes' : 'Create Company'}
        </button>
      </div>
    </form>
  );
}
