import { useState, useEffect, useMemo } from 'react';
import { Users, Search, Mail, Phone, Plus, Edit2, Trash2, Send, X, ChevronDown } from 'lucide-react';
import { api } from '../api/client';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import ContactForm from '../components/ContactForm';
import ConfirmDialog from '../components/ConfirmDialog';

const EQUIPMENT_TYPES = ['Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'RGN', 'Power Only', 'Tanker', 'Hotshot', 'Other'];

function initials(c) {
  return `${(c.firstName || '')[0] || ''}${(c.lastName || '')[0] || ''}`.toUpperCase() || '?';
}

// ── Variable input panel for template composition ─────────────────────────────

function VariablePanel({ variables, values, onChange }) {
  if (!variables || variables.length === 0) return null;
  return (
    <div className="template-vars-panel">
      <div className="template-vars-title">Fill in template variables</div>
      {variables.map((v) => {
        if (v === 'truck_count') {
          return (
            <div key={v} className="form-group">
              <label className="form-label">truck_count</label>
              <select className="form-select" value={values[v] || ''} onChange={(e) => onChange(v, e.target.value)}>
                <option value="">Select…</option>
                {['1','2','3','4','5','6','7','8','9','10','10+'].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          );
        }
        if (v === 'equipment_type') {
          return (
            <div key={v} className="form-group">
              <label className="form-label">equipment_type</label>
              <select className="form-select" value={values[v] || ''} onChange={(e) => onChange(v, e.target.value)}>
                <option value="">Select…</option>
                {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          );
        }
        return (
          <div key={v} className="form-group">
            <label className="form-label">{v.replace(/_/g, ' ')}</label>
            <input
              className="form-input"
              value={values[v] || ''}
              onChange={(e) => onChange(v, e.target.value)}
              placeholder={`Enter ${v.replace(/_/g, ' ')}…`}
            />
          </div>
        );
      })}
    </div>
  );
}

function applyVariables(text, values) {
  let result = text || '';
  for (const [key, val] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val || `{{${key}}}`);
  }
  return result;
}

// ── Email Blast Modal ─────────────────────────────────────────────────────────

function BlastModal({ contacts, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [varValues, setVarValues] = useState({});
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    api.get('/email-templates').then(setTemplates).catch(() => {});
  }, []);

  const selectedTemplate = templates.find((t) => t.id === templateId);

  function selectTemplate(id) {
    setTemplateId(id);
    setVarValues({});
    if (!id) { setSubject(''); setBody(''); return; }
    const t = templates.find((t) => t.id === id);
    if (t) { setSubject(t.subject); setBody(t.body); }
  }

  function setVar(key, val) {
    setVarValues((v) => ({ ...v, [key]: val }));
  }

  const previewSubject = applyVariables(subject, varValues);
  const previewBody    = applyVariables(body,    varValues);

  function handleSend() {
    const emailList = contacts.filter((c) => c.email).map((c) => c.email);
    if (emailList.length === 0) return;
    // Build a mailto with BCC for multiple recipients
    const to  = emailList[0];
    const bcc = emailList.slice(1).join(',');
    const params = new URLSearchParams();
    if (bcc) params.set('bcc', bcc);
    params.set('subject', previewSubject);
    params.set('body', previewBody);
    window.open(`mailto:${to}?${params.toString()}`, '_blank');
    onClose();
  }

  const emailCount = contacts.filter((c) => c.email).length;

  return (
    <Modal isOpen onClose={onClose} title={`Email Blast — ${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`}>
      {emailCount < contacts.length && (
        <div className="form-error" style={{ marginBottom: 12 }}>
          {contacts.length - emailCount} selected contact{contacts.length - emailCount !== 1 ? 's have' : ' has'} no email and will be skipped.
        </div>
      )}

      <div className="email-to-bar" style={{ flexWrap: 'wrap', gap: 6, height: 'auto', minHeight: 40 }}>
        <span className="email-to-label">To</span>
        {contacts.slice(0, 5).map((c) => (
          <span key={c.id} className="contact-chip">
            {c.firstName} {c.lastName}
          </span>
        ))}
        {contacts.length > 5 && (
          <span className="contact-chip contact-chip-more">+{contacts.length - 5} more</span>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Template</label>
        <select className="form-select" value={templateId} onChange={(e) => selectTemplate(e.target.value)}>
          <option value="">— No template, write from scratch —</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {selectedTemplate?.variables?.length > 0 && (
        <VariablePanel
          variables={selectedTemplate.variables}
          values={varValues}
          onChange={setVar}
        />
      )}

      <div className="form-group">
        <label className="form-label">Subject</label>
        <input
          className="form-input"
          value={previewSubject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject…"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Message</label>
        <textarea
          className="form-textarea email-textarea"
          value={previewBody}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message or select a template above…"
          style={{ minHeight: 160 }}
        />
      </div>

      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={emailCount === 0 || !previewSubject.trim()}
        >
          <Send size={14} /> Open in Mail ({emailCount})
        </button>
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [selected, setSelected] = useState(new Set());

  const [showCreate, setShowCreate] = useState(false);
  const [editContact, setEditContact] = useState(null);
  const [deleteContact, setDeleteContact] = useState(null);
  const [showBlast, setShowBlast] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [c, co] = await Promise.all([api.get('/contacts'), api.get('/companies')]);
        setContacts(c);
        setCompanies(co);
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  const companyMap = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c])), [companies]);

  const filtered = useMemo(() => {
    let result = contacts;
    if (companyFilter) result = result.filter((c) => c.companyId === companyFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        (c.email  || '').toLowerCase().includes(q) ||
        (c.phone  || '').toLowerCase().includes(q) ||
        (c.role   || '').toLowerCase().includes(q) ||
        (companyMap[c.companyId]?.name || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [contacts, search, companyFilter, companyMap]);

  function toggleSelect(id) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }

  const selectedContacts = contacts.filter((c) => selected.has(c.id));

  async function handleCreate(data) {
    setSaving(true);
    try {
      const created = await api.post('/contacts', data);
      setContacts((c) => [created, ...c]);
      setShowCreate(false);
    } catch {}
    finally { setSaving(false); }
  }

  async function handleEdit(data) {
    setSaving(true);
    try {
      const updated = await api.put(`/contacts/${editContact.id}`, data);
      setContacts((c) => c.map((x) => (x.id === updated.id ? updated : x)));
      setEditContact(null);
    } catch {}
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await api.delete(`/contacts/${deleteContact.id}`);
      setContacts((c) => c.filter((x) => x.id !== deleteContact.id));
      setSelected((s) => { const n = new Set(s); n.delete(deleteContact.id); return n; });
      setDeleteContact(null);
    } catch {}
    finally { setSaving(false); }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Contact Hub</h1>
          <p className="page-subtitle">Real contacts extracted from documents</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {selected.size > 0 && (
            <button className="btn btn-primary" onClick={() => setShowBlast(true)}>
              <Send size={14} /> Email {selected.size}
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Add Contact
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {!loading && contacts.length > 0 && (
        <div className="filter-bar">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input
              className="search-input"
              type="text"
              placeholder="Search contacts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
          >
            <option value="">All companies</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {/* Selection bar */}
      {filtered.length > 0 && (
        <div className="selection-bar">
          <label className="selection-checkbox-wrap">
            <input
              type="checkbox"
              checked={selected.size > 0 && selected.size === filtered.length}
              ref={(el) => el && (el.indeterminate = selected.size > 0 && selected.size < filtered.length)}
              onChange={toggleSelectAll}
            />
            <span>{selected.size > 0 ? `${selected.size} selected` : 'Select all'}</span>
          </label>
          {selected.size > 0 && (
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => setSelected(new Set())}>
              <X size={12} /> Clear
            </button>
          )}
        </div>
      )}

      {/* Contact list */}
      {loading ? (
        <div className="loading-state">Loading…</div>
      ) : contacts.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Users />}
            title="No contacts yet"
            description="Contacts are created when you upload rate confirmations with real broker names and direct contact info."
            action={
              <button className="btn btn-ghost" onClick={() => setShowCreate(true)}>
                <Plus size={14} /> Add Contact Manually
              </button>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Search />} title="No contacts match" description="Try a different search or filter." />
        </div>
      ) : (
        <div className="card">
          {filtered.map((contact, i) => {
            const co = companyMap[contact.companyId];
            const isSelected = selected.has(contact.id);
            return (
              <div
                key={contact.id}
                className={`contact-hub-row${isSelected ? ' selected' : ''}`}
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
              >
                <input
                  type="checkbox"
                  className="contact-hub-checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(contact.id)}
                />
                <div className="contact-avatar">{initials(contact)}</div>
                <div className="contact-hub-info">
                  <div className="contact-hub-name">
                    {contact.firstName} {contact.lastName}
                    {contact.source === 'document' && (
                      <span className="source-tag">from doc</span>
                    )}
                  </div>
                  {contact.role && <div className="contact-hub-role">{contact.role}</div>}
                  {co && <div className="contact-hub-company">{co.name}</div>}
                  <div className="contact-hub-details">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="contact-detail-link">
                        <Mail size={11} /> {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="contact-detail-link">
                        <Phone size={11} /> {contact.phone}
                      </a>
                    )}
                  </div>
                </div>
                <div className="contact-item-actions">
                  <button className="icon-btn" onClick={() => setEditContact(contact)} aria-label="Edit">
                    <Edit2 size={14} />
                  </button>
                  <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => setDeleteContact(contact)} aria-label="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Contact">
        <ContactForm onSave={handleCreate} onCancel={() => setShowCreate(false)} loading={saving} companies={companies} />
      </Modal>
      <Modal isOpen={!!editContact} onClose={() => setEditContact(null)} title="Edit Contact">
        <ContactForm initial={editContact} onSave={handleEdit} onCancel={() => setEditContact(null)} loading={saving} companies={companies} />
      </Modal>
      <ConfirmDialog
        isOpen={!!deleteContact}
        onClose={() => setDeleteContact(null)}
        onConfirm={handleDelete}
        title="Delete Contact"
        message={`Remove ${deleteContact ? `${deleteContact.firstName} ${deleteContact.lastName}` : 'this contact'}?`}
        loading={saving}
      />
      {showBlast && (
        <BlastModal contacts={selectedContacts} onClose={() => setShowBlast(false)} />
      )}
    </div>
  );
}
