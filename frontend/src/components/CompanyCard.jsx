import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, ChevronRight, MoreVertical, Edit2, Trash2 } from 'lucide-react';

const TYPE_MAP = {
  broker:  { cls: 'badge-info',    label: 'Broker' },
  shipper: { cls: 'badge-success', label: 'Shipper' },
  carrier: { cls: 'badge-orange',  label: 'Carrier' },
};

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CompanyCard({ company, loadsCount = 0, lastLoadDate = null, onEdit, onDelete, onEmail }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const type = TYPE_MAP[company.type] || { cls: 'badge-neutral', label: company.type };

  useEffect(() => {
    if (!menuOpen) return;
    function handle(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  return (
    <div className="company-card">
      {/* Top section */}
      <div className="company-card-top">
        <div className="company-card-name-row">
          <h3 className="company-card-name">{company.name}</h3>
          <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              className="icon-btn"
              onClick={() => setMenuOpen((m) => !m)}
              aria-label="Options"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="dropdown">
                <button
                  className="dropdown-item"
                  onClick={() => { setMenuOpen(false); onEdit(company); }}
                >
                  <Edit2 size={13} /> Edit
                </button>
                <button
                  className="dropdown-item dropdown-item-danger"
                  onClick={() => { setMenuOpen(false); onDelete(company); }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <span className={`badge ${type.cls}`}>{type.label}</span>
          <span className={`badge ${company.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
            {company.status}
          </span>
        </div>
      </div>

      {/* Stats strip */}
      <div className="company-card-stats">
        <div>
          <div className="company-card-stat-value">{loadsCount}</div>
          <div className="company-card-stat-label">Loads Booked</div>
        </div>
        <div>
          <div
            className="company-card-stat-value"
            style={{ fontSize: lastLoadDate ? 13 : 20 }}
          >
            {lastLoadDate ? fmtDate(lastLoadDate) : '—'}
          </div>
          <div className="company-card-stat-label">Last Load</div>
        </div>
      </div>

      {/* Contact info */}
      {(company.phone || company.email) && (
        <div className="company-card-contact">
          {company.phone && (
            <div className="company-card-contact-row">
              <Phone size={12} />
              <span>{company.phone}</span>
            </div>
          )}
          {company.email && (
            <div className="company-card-contact-row">
              <Mail size={12} />
              <span>{company.email}</span>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="company-card-actions">
        <button
          className="btn btn-primary"
          style={{ flex: 1, fontSize: 13 }}
          onClick={() => navigate(`/companies/${company.id}`)}
        >
          View <ChevronRight size={13} />
        </button>
        {company.phone && (
          <a className="btn btn-ghost" href={`tel:${company.phone}`} style={{ padding: '9px 12px' }}>
            <Phone size={14} />
          </a>
        )}
        <button className="btn btn-ghost" style={{ padding: '9px 12px' }} onClick={() => onEmail(company)}>
          <Mail size={14} />
        </button>
      </div>
    </div>
  );
}
