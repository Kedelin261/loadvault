import { useState } from 'react';

const EMPTY = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: '',
  notes: '',
};

export default function ContactForm({ initial = null, onSave, onCancel, loading = false, companies = [] }) {
  const [form, setForm] = useState(initial ? { ...EMPTY, ...initial } : { ...EMPTY, companyId: '' });
  const [error, setError] = useState('');

  const set = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.firstName.trim() && !form.lastName.trim()) {
      setError('First or last name is required.');
      return;
    }
    setError('');
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">
            First Name <span className="form-required">*</span>
          </label>
          <input
            className="form-input"
            name="firstName"
            value={form.firstName}
            onChange={set}
            placeholder="Jane"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label">Last Name</label>
          <input
            className="form-input"
            name="lastName"
            value={form.lastName}
            onChange={set}
            placeholder="Smith"
          />
        </div>
      </div>

      {companies.length > 0 && (
        <div className="form-group">
          <label className="form-label">Company</label>
          <select className="form-select" name="companyId" value={form.companyId || ''} onChange={set}>
            <option value="">— No company —</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Role / Title</label>
        <input
          className="form-input"
          name="role"
          value={form.role}
          onChange={set}
          placeholder="e.g. Dispatcher, Load Planner, AP"
        />
      </div>

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
            placeholder="jane@company.com"
            type="email"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea
          className="form-textarea"
          name="notes"
          value={form.notes}
          onChange={set}
          placeholder="Any notes about this contact…"
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving…' : initial ? 'Save Changes' : 'Add Contact'}
        </button>
      </div>
    </form>
  );
}
