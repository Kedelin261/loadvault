import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Plus, MoreVertical, Edit2, Trash2, ArrowRight, Search } from 'lucide-react';
import { api } from '../api/client';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import LoadForm from '../components/LoadForm';
import ConfirmDialog from '../components/ConfirmDialog';

const STATUS_OPTIONS = ['all', 'pending', 'dispatched', 'in-transit', 'delivered', 'invoiced', 'paid'];

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
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function LoadMenu({ load, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label="Load options">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="dropdown">
          <button className="dropdown-item" onClick={() => { setOpen(false); onEdit(load); }}>
            <Edit2 size={13} /> Edit
          </button>
          <button className="dropdown-item dropdown-item-danger" onClick={() => { setOpen(false); onDelete(load); }}>
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function Loads() {
  const navigate = useNavigate();
  const [loads, setLoads] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showCreate, setShowCreate] = useState(false);
  const [editLoad, setEditLoad] = useState(null);
  const [deleteLoad, setDeleteLoad] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [l, c] = await Promise.all([api.get('/loads'), api.get('/companies')]);
        setLoads(l);
        setCompanies(c);
      } catch {
        // start empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const companyMap = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies],
  );

  const filtered = useMemo(() => {
    let result = loads;
    if (statusFilter !== 'all') {
      result = result.filter((l) => l.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((l) => {
        const co = companyMap[l.companyId];
        return (
          (l.loadNumber || '').toLowerCase().includes(q) ||
          (l.originCity || '').toLowerCase().includes(q) ||
          (l.destCity || '').toLowerCase().includes(q) ||
          (co?.name || '').toLowerCase().includes(q) ||
          (l.commodity || '').toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [loads, search, statusFilter, companyMap]);

  async function handleCreate(data) {
    setSaving(true);
    try {
      const created = await api.post('/loads', data);
      setLoads((l) => [created, ...l]);
      setShowCreate(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(data) {
    setSaving(true);
    try {
      const updated = await api.put(`/loads/${editLoad.id}`, data);
      setLoads((l) => l.map((x) => (x.id === updated.id ? updated : x)));
      setEditLoad(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await api.delete(`/loads/${deleteLoad.id}`);
      setLoads((l) => l.filter((x) => x.id !== deleteLoad.id));
      setDeleteLoad(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Loads</h1>
          <p className="page-subtitle">Track and manage freight loads</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus /> New Load
        </button>
      </div>

      {/* Search + filter bar */}
      {!loading && loads.length > 0 && (
        <div className="filter-bar">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input
              className="search-input"
              type="text"
              placeholder="Search loads…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading…</div>
      ) : loads.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Truck />}
            title="No loads yet"
            description="Upload paperwork or create a load manually to get started."
            action={
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                <Plus /> Create Load
              </button>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Search />} title="No loads match" description="Try a different search or filter." />
        </div>
      ) : (
        <div className="load-list">
          {filtered.map((load) => {
            const co = companyMap[load.companyId];
            const origin = [load.originCity, load.originState].filter(Boolean).join(', ') || '—';
            const dest   = [load.destCity,   load.destState  ].filter(Boolean).join(', ') || '—';
            return (
              <div key={load.id} className="load-card">
                <div className="load-card-icon">
                  <Truck size={18} />
                </div>
                <div className="load-card-body">
                  <div className="load-card-top-row">
                    <span className="load-card-number">
                      {load.loadNumber || `LV-${load.id.slice(0, 6).toUpperCase()}`}
                    </span>
                    <span className={`badge ${STATUS_BADGE[load.status] || 'badge-neutral'}`}>
                      {load.status}
                    </span>
                  </div>
                  {co && <div className="load-card-company">{co.name}</div>}
                  <div className="load-card-route">
                    <span>{origin}</span>
                    <ArrowRight size={12} color="var(--text-light)" style={{ flexShrink: 0 }} />
                    <span>{dest}</span>
                  </div>
                  {load.pickupDate && (
                    <div className="load-card-date">{fmtDate(load.pickupDate)}</div>
                  )}
                </div>
                <div className="load-card-right">
                  {load.rate > 0 && (
                    <div className="load-card-rate">${Number(load.rate).toLocaleString()}</div>
                  )}
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 12, padding: '6px 10px' }}
                      onClick={() => navigate(`/loads/${load.id}`)}
                    >
                      View
                    </button>
                    <LoadMenu load={load} onEdit={setEditLoad} onDelete={setDeleteLoad} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Load">
        <LoadForm companies={companies} onSave={handleCreate} onCancel={() => setShowCreate(false)} loading={saving} />
      </Modal>
      <Modal isOpen={!!editLoad} onClose={() => setEditLoad(null)} title="Edit Load">
        <LoadForm initial={editLoad} companies={companies} onSave={handleEdit} onCancel={() => setEditLoad(null)} loading={saving} />
      </Modal>
      <ConfirmDialog
        isOpen={!!deleteLoad}
        onClose={() => setDeleteLoad(null)}
        onConfirm={handleDelete}
        title="Delete Load"
        message={`Delete "${deleteLoad?.loadNumber || 'this load'}"? This cannot be undone.`}
        loading={saving}
      />
    </div>
  );
}
