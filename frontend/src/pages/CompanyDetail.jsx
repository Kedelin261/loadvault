import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Building2, Phone, Mail, Globe, MapPin, FileText,
  Truck, Users, Plus, Edit2, Trash2, Hash, ExternalLink,
} from 'lucide-react';
import { api } from '../api/client';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import CompanyForm from '../components/CompanyForm';
import ContactForm from '../components/ContactForm';
import ConfirmDialog from '../components/ConfirmDialog';
import EmailModal from '../components/EmailModal';
import LoadForm from '../components/LoadForm';

const TYPE_MAP = {
  broker:  { cls: 'badge-info',    label: 'Broker' },
  shipper: { cls: 'badge-success', label: 'Shipper' },
  carrier: { cls: 'badge-orange',  label: 'Carrier' },
};

const STATUS_BADGE = {
  pending:     'badge-neutral',
  dispatched:  'badge-info',
  'in-transit': 'badge-warning',
  delivered:   'badge-success',
  invoiced:    'badge-orange',
  paid:        'badge-success',
};

function initials(contact) {
  return `${contact.firstName?.[0] || ''}${contact.lastName?.[0] || ''}`.toUpperCase() || '?';
}

function InfoRow({ icon: Icon, label, value, href }) {
  if (!value) return null;
  return (
    <div className="info-item">
      <div className="info-item-icon"><Icon size={15} /></div>
      <div>
        <div className="info-item-label">{label}</div>
        {href ? (
          <a className="info-item-value info-item-link" href={href} target="_blank" rel="noreferrer">
            {value} <ExternalLink size={11} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
          </a>
        ) : (
          <div className="info-item-value">{value}</div>
        )}
      </div>
    </div>
  );
}

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loads, setLoads] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Modal states
  const [showEditCompany, setShowEditCompany] = useState(false);
  const [deleteCompany, setDeleteCompany] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [editContact, setEditContact] = useState(null);
  const [deleteContact, setDeleteContact] = useState(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [showCreateLoad, setShowCreateLoad] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [co, cts, lds, docs] = await Promise.all([
          api.get(`/companies/${id}`),
          api.get(`/contacts?companyId=${id}`),
          api.get(`/loads?companyId=${id}`),
          api.get(`/documents?companyId=${id}`),
        ]);
        setCompany(co);
        setContacts(cts);
        setLoads(lds);
        setDocuments(docs);
      } catch (err) {
        if (err.message?.includes('404') || err.message?.includes('not found')) {
          setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // ── Company CRUD ───────────────────────────────────
  async function handleUpdateCompany(data) {
    setSaving(true);
    try {
      const updated = await api.put(`/companies/${id}`, data);
      setCompany(updated);
      setShowEditCompany(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCompany() {
    setSaving(true);
    try {
      await api.delete(`/companies/${id}`);
      navigate(-1);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  // ── Load CRUD ─────────────────────────────────────
  async function handleCreateLoad(data) {
    setSaving(true);
    try {
      const created = await api.post('/loads', { ...data, companyId: id });
      setLoads((l) => [created, ...l]);
      setShowCreateLoad(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  // ── Contact CRUD ───────────────────────────────────
  async function handleAddContact(data) {
    setSaving(true);
    try {
      const created = await api.post('/contacts', { ...data, companyId: id });
      setContacts((c) => [...c, created]);
      setShowAddContact(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateContact(data) {
    setSaving(true);
    try {
      const updated = await api.put(`/contacts/${editContact.id}`, data);
      setContacts((c) => c.map((x) => (x.id === updated.id ? updated : x)));
      setEditContact(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteContact() {
    setSaving(true);
    try {
      await api.delete(`/contacts/${deleteContact.id}`);
      setContacts((c) => c.filter((x) => x.id !== deleteContact.id));
      setDeleteContact(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  // ── Render states ──────────────────────────────────
  if (loading) return <div className="loading-state">Loading…</div>;

  if (notFound || !company) {
    return (
      <div className="page">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={16} /> Back
        </button>
        <div className="card" style={{ marginTop: 24 }}>
          <EmptyState
            icon={<Building2 />}
            title="Company not found"
            description="This company may have been deleted."
          />
        </div>
      </div>
    );
  }

  const type = TYPE_MAP[company.type] || { cls: 'badge-neutral', label: company.type };
  const address = [company.address, company.city, company.state, company.zip]
    .filter(Boolean).join(', ');

  return (
    <div className="page">
      {/* Header */}
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={16} /> Back
        </button>
        <div className="detail-title-section">
          <h1 className="detail-name">{company.name}</h1>
          <div className="detail-badges">
            <span className={`badge ${type.cls}`}>{type.label}</span>
            <span className={`badge ${company.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
              {company.status}
            </span>
          </div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-ghost" onClick={() => setEmailOpen(true)}>
            <Mail size={14} /> Email
          </button>
          <button className="btn btn-ghost" onClick={() => setShowEditCompany(true)}>
            <Edit2 size={14} /> Edit
          </button>
          <button className="btn btn-ghost" style={{ color: 'var(--danger)', borderColor: '#fecaca' }} onClick={() => setDeleteCompany(true)}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Company info card */}
      <div className="card">
        <div className="card-header">Company Info</div>
        <div style={{ padding: '4px 20px 8px' }}>
          <InfoRow icon={Hash} label="MC Number" value={company.mcNumber} />
          <InfoRow icon={Hash} label="DOT Number" value={company.dotNumber} />
          <InfoRow icon={Phone} label="Phone" value={company.phone} href={company.phone ? `tel:${company.phone}` : null} />
          <InfoRow icon={Mail} label="Email" value={company.email} href={company.email ? `mailto:${company.email}` : null} />
          <InfoRow icon={Globe} label="Website" value={company.website} href={company.website} />
          <InfoRow icon={MapPin} label="Address" value={address} />
          {company.notes && (
            <div className="info-item" style={{ borderBottom: 'none' }}>
              <div className="info-item-icon"><FileText size={15} /></div>
              <div>
                <div className="info-item-label">Notes</div>
                <div className="info-item-value" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {company.notes}
                </div>
              </div>
            </div>
          )}
          {!company.mcNumber && !company.phone && !company.email && !company.notes && !address && (
            <p style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              No additional info. Click Edit to add details.
            </p>
          )}
        </div>
      </div>

      {/* Contacts section */}
      <div className="section-header">
        <h2 className="section-title">
          <Users size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Contacts
          {contacts.length > 0 && (
            <span className="section-count">{contacts.length}</span>
          )}
        </h2>
        <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => setShowAddContact(true)}>
          <Plus size={14} /> Add Contact
        </button>
      </div>

      <div className="card">
        {contacts.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No contacts yet"
            description="Add the dispatchers, load planners, and billing contacts for this company."
            action={
              <button className="btn btn-ghost" onClick={() => setShowAddContact(true)}>
                <Plus size={14} /> Add Contact
              </button>
            }
          />
        ) : (
          contacts.map((contact, i) => (
            <div
              key={contact.id}
              className="contact-list-item"
              style={{ borderBottom: i < contacts.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <div className="contact-avatar">{initials(contact)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                  {[contact.firstName, contact.lastName].filter(Boolean).join(' ')}
                </div>
                {contact.role && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{contact.role}</div>
                )}
                <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
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
                <button className="icon-btn" onClick={() => setEditContact(contact)} aria-label="Edit contact">
                  <Edit2 size={14} />
                </button>
                <button
                  className="icon-btn"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => setDeleteContact(contact)}
                  aria-label="Delete contact"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Loads section */}
      <div className="section-header">
        <h2 className="section-title">
          <Truck size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Loads
          {loads.length > 0 && <span className="section-count">{loads.length}</span>}
        </h2>
        <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => setShowCreateLoad(true)}>
          <Plus size={14} /> New Load
        </button>
      </div>

      <div className="card">
        {loads.length === 0 ? (
          <EmptyState
            icon={<Truck />}
            title="No loads for this company"
            description="Loads assigned to this company will appear here."
            action={
              <button className="btn btn-ghost" onClick={() => setShowCreateLoad(true)}>
                <Plus size={14} /> New Load
              </button>
            }
          />
        ) : (
          loads.map((load, i) => (
            <div
              key={load.id}
              onClick={() => navigate(`/loads/${load.id}`)}
              style={{
                padding: '14px 18px',
                borderBottom: i < loads.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 7,
                background: '#fff7ed', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Truck size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {load.loadNumber || `Load #${load.id.slice(0, 6).toUpperCase()}`}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {load.originCity || '—'} → {load.destCity || '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {load.rate ? (
                  <div style={{ fontWeight: 700, fontSize: 14 }}>${Number(load.rate).toLocaleString()}</div>
                ) : null}
                <span className={`badge ${STATUS_BADGE[load.status] || 'badge-neutral'}`} style={{ marginTop: 4 }}>
                  {load.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Documents section */}
      <div className="section-header">
        <h2 className="section-title">
          <FileText size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Documents
          {documents.length > 0 && <span className="section-count">{documents.length}</span>}
        </h2>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        {documents.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title="No documents for this company"
            description="Uploaded documents linked to this company will appear here."
          />
        ) : (
          documents.map((doc, i) => (
            <div
              key={doc.id}
              style={{
                padding: '13px 18px',
                borderBottom: i < documents.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <FileText size={16} color="var(--text-muted)" />
              <span style={{ fontSize: 14, flex: 1 }}>{doc.originalName || doc.filename}</span>
              <span className="badge badge-neutral">{doc.type}</span>
            </div>
          ))
        )}
      </div>

      {/* ── Modals ───────────────────────────────────── */}
      <EmailModal
        isOpen={emailOpen}
        onClose={() => setEmailOpen(false)}
        company={company}
      />

      <Modal isOpen={showCreateLoad} onClose={() => setShowCreateLoad(false)} title="New Load">
        <LoadForm
          fixedCompanyId={id}
          onSave={handleCreateLoad}
          onCancel={() => setShowCreateLoad(false)}
          loading={saving}
        />
      </Modal>

      <Modal isOpen={showEditCompany} onClose={() => setShowEditCompany(false)} title="Edit Company">
        <CompanyForm
          initial={company}
          onSave={handleUpdateCompany}
          onCancel={() => setShowEditCompany(false)}
          loading={saving}
        />
      </Modal>

      <ConfirmDialog
        isOpen={deleteCompany}
        onClose={() => setDeleteCompany(false)}
        onConfirm={handleDeleteCompany}
        title="Delete Company"
        message={`Permanently delete "${company.name}"? All associated data will be removed. This cannot be undone.`}
        loading={saving}
      />

      <Modal
        isOpen={showAddContact}
        onClose={() => setShowAddContact(false)}
        title="Add Contact"
      >
        <ContactForm
          onSave={handleAddContact}
          onCancel={() => setShowAddContact(false)}
          loading={saving}
        />
      </Modal>

      <Modal
        isOpen={!!editContact}
        onClose={() => setEditContact(null)}
        title="Edit Contact"
      >
        <ContactForm
          initial={editContact}
          onSave={handleUpdateContact}
          onCancel={() => setEditContact(null)}
          loading={saving}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteContact}
        onClose={() => setDeleteContact(null)}
        onConfirm={handleDeleteContact}
        title="Delete Contact"
        message={`Remove ${deleteContact ? [deleteContact.firstName, deleteContact.lastName].filter(Boolean).join(' ') : 'this contact'}? This cannot be undone.`}
        loading={saving}
      />
    </div>
  );
}
