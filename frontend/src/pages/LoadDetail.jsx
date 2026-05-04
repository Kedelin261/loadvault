import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, Truck, Clock, FileText, DollarSign,
  User, Edit2, Trash2, Building2, Hash, Package,
} from 'lucide-react';
import { api } from '../api/client';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import LoadForm from '../components/LoadForm';
import ConfirmDialog from '../components/ConfirmDialog';

const STATUS_BADGE = {
  pending:      'badge-neutral',
  dispatched:   'badge-info',
  'in-transit': 'badge-warning',
  delivered:    'badge-success',
  invoiced:     'badge-orange',
  paid:         'badge-success',
};

function fmtDate(d) {
  if (!d) return null;
  const [y, m, day] = d.split('-');
  return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function fmtTime(t) {
  if (!t) return null;
  const [h, min] = t.split(':');
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${min} ${hr >= 12 ? 'PM' : 'AM'}`;
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="info-item">
      <div className="info-item-icon"><Icon size={15} /></div>
      <div>
        <div className="info-item-label">{label}</div>
        <div className="info-item-value">{value}</div>
      </div>
    </div>
  );
}

export default function LoadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [load, setLoad] = useState(null);
  const [company, setCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetch() {
      try {
        const [ld, allCompanies, docs] = await Promise.all([
          api.get(`/loads/${id}`),
          api.get('/companies'),
          api.get(`/documents?loadId=${id}`),
        ]);
        setLoad(ld);
        setCompanies(allCompanies);
        setDocuments(docs);
        if (ld.companyId) {
          setCompany(allCompanies.find((c) => c.id === ld.companyId) || null);
        }
      } catch (err) {
        if (err.message?.includes('404') || err.message?.includes('not found')) {
          setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [id]);

  async function handleUpdate(data) {
    setSaving(true);
    try {
      const updated = await api.put(`/loads/${id}`, data);
      setLoad(updated);
      setCompany(companies.find((c) => c.id === updated.companyId) || null);
      setShowEdit(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await api.delete(`/loads/${id}`);
      navigate(-1);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-state">Loading…</div>;

  if (notFound || !load) {
    return (
      <div className="page">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={16} /> Back
        </button>
        <div className="card" style={{ marginTop: 24 }}>
          <EmptyState icon={<Truck />} title="Load not found" description="This load may have been deleted." />
        </div>
      </div>
    );
  }

  const hasPickup = load.originCity || load.pickupDate;
  const hasDelivery = load.destCity || load.deliveryDate;
  const hasDriver = load.driverName || load.truckNumber || load.trailerNumber;

  return (
    <div className="page">
      {/* Header */}
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={16} /> Back
        </button>
        <div className="detail-title-section">
          <h1 className="detail-name">
            {load.loadNumber || `Load ${load.id.slice(0, 8).toUpperCase()}`}
          </h1>
          <div className="detail-badges">
            <span className={`badge ${STATUS_BADGE[load.status] || 'badge-neutral'}`}>
              {load.status}
            </span>
            {company && (
              <Link to={`/companies/${company.id}`} className="detail-company-link">
                <Building2 size={11} /> {company.name}
              </Link>
            )}
          </div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-ghost" onClick={() => setShowEdit(true)}>
            <Edit2 size={14} /> Edit
          </button>
          <button
            className="btn btn-ghost"
            style={{ color: 'var(--danger)', borderColor: '#fecaca' }}
            onClick={() => setShowDelete(true)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Rate banner */}
      {load.rate > 0 && (
        <div className="rate-banner">
          <DollarSign size={16} />
          <span className="rate-banner-amount">
            ${Number(load.rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="rate-banner-label">Total Rate</span>
        </div>
      )}

      {/* Route card */}
      {(hasPickup || hasDelivery) && (
        <div className="card">
          <div className="route-display">
            <div className="route-stop">
              <div className="route-stop-label">Pickup</div>
              <div className="route-stop-city">
                {[load.originCity, load.originState].filter(Boolean).join(', ') || '—'}
              </div>
              {load.pickupDate && (
                <div className="route-stop-date">{fmtDate(load.pickupDate)}</div>
              )}
              {load.pickupTime && (
                <div className="route-stop-time">
                  <Clock size={11} /> {fmtTime(load.pickupTime)}
                </div>
              )}
            </div>

            <div className="route-arrow">
              <div className="route-line" />
              <div className="route-truck-icon"><Truck size={18} /></div>
              <div className="route-line" />
            </div>

            <div className="route-stop route-stop-right">
              <div className="route-stop-label">Delivery</div>
              <div className="route-stop-city">
                {[load.destCity, load.destState].filter(Boolean).join(', ') || '—'}
              </div>
              {load.deliveryDate && (
                <div className="route-stop-date">{fmtDate(load.deliveryDate)}</div>
              )}
              {load.deliveryTime && (
                <div className="route-stop-time">
                  <Clock size={11} /> {fmtTime(load.deliveryTime)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cargo details */}
      {(load.truckType || load.commodity || load.weight > 0) && (
        <div className="card mt-4">
          <div className="card-header">Cargo</div>
          <div style={{ padding: '4px 20px 8px' }}>
            <InfoRow icon={Truck} label="Equipment" value={load.truckType} />
            <InfoRow icon={Package} label="Commodity" value={load.commodity} />
            {load.weight > 0 && (
              <div className="info-item" style={{ borderBottom: 'none' }}>
                <div className="info-item-icon"><Hash size={15} /></div>
                <div>
                  <div className="info-item-label">Weight</div>
                  <div className="info-item-value">{Number(load.weight).toLocaleString()} lbs</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Driver & equipment */}
      {hasDriver && (
        <div className="card mt-4">
          <div className="card-header">Driver & Equipment</div>
          <div style={{ padding: '4px 20px 8px' }}>
            <InfoRow icon={User} label="Driver" value={load.driverName} />
            <InfoRow icon={Truck} label="Truck #" value={load.truckNumber} />
            <div className={load.trailerNumber ? '' : 'info-item-last'}>
              <InfoRow icon={Hash} label="Trailer #" value={load.trailerNumber} />
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {load.notes && (
        <div className="card mt-4">
          <div className="card-header">Notes</div>
          <div style={{ padding: '14px 20px', fontSize: 14, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {load.notes}
          </div>
        </div>
      )}

      {/* Documents */}
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
            title="No documents for this load"
            description="Upload rate confirmations, BOLs, and PODs to keep everything organized."
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

      {/* Modals */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Load">
        <LoadForm
          initial={load}
          companies={companies}
          onSave={handleUpdate}
          onCancel={() => setShowEdit(false)}
          loading={saving}
        />
      </Modal>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Load"
        message={`Delete "${load.loadNumber || load.id}"? This cannot be undone.`}
        loading={saving}
      />
    </div>
  );
}
