import { useState, useEffect, useMemo } from 'react';
import { Plus, Building2, Truck, FileText, DollarSign } from 'lucide-react';
import { api } from '../api/client';
import CompanyCard from '../components/CompanyCard';
import Modal from '../components/Modal';
import CompanyForm from '../components/CompanyForm';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import EmailModal from '../components/EmailModal';

export default function Dashboard() {
  const [companies, setCompanies] = useState([]);
  const [loads, setLoads] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [deleteCompany, setDeleteCompany] = useState(null);
  const [emailCompany, setEmailCompany] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [c, l, d] = await Promise.all([
          api.get('/companies'),
          api.get('/loads'),
          api.get('/documents'),
        ]);
        setCompanies(c);
        setLoads(l);
        setDocuments(d);
      } catch {
        // API unreachable — start empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const companyStats = useMemo(() => {
    const map = {};
    for (const load of loads) {
      if (!load.companyId) continue;
      if (!map[load.companyId]) map[load.companyId] = { count: 0, lastDate: null };
      map[load.companyId].count++;
      if (!map[load.companyId].lastDate || load.createdAt > map[load.companyId].lastDate) {
        map[load.companyId].lastDate = load.createdAt;
      }
    }
    return map;
  }, [loads]);

  const summary = useMemo(() => ({
    companies: companies.length,
    loads: loads.length,
    documents: documents.length,
    revenue: loads.reduce((s, l) => s + (Number(l.rate) || 0), 0),
  }), [companies, loads, documents]);

  async function handleCreate(data) {
    setSaving(true);
    try {
      const created = await api.post('/companies', data);
      setCompanies((c) => [...c, created]);
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
      const updated = await api.put(`/companies/${editCompany.id}`, data);
      setCompanies((c) => c.map((x) => (x.id === updated.id ? updated : x)));
      setEditCompany(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await api.delete(`/companies/${deleteCompany.id}`);
      setCompanies((c) => c.filter((x) => x.id !== deleteCompany.id));
      setDeleteCompany(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your dispatch operations at a glance</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus /> Add Company
        </button>
      </div>

      {/* Compact stat row */}
      <div className="stat-row">
        {[
          { label: 'Companies', value: summary.companies, Icon: Building2, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Loads', value: summary.loads, Icon: Truck, color: '#f97316', bg: '#fff7ed' },
          { label: 'Documents', value: summary.documents, Icon: FileText, color: '#8b5cf6', bg: '#f5f3ff' },
          { label: 'Revenue', value: `$${summary.revenue.toLocaleString()}`, Icon: DollarSign, color: '#16a34a', bg: '#f0fdf4' },
        ].map(({ label, value, Icon, color, bg }) => (
          <div key={label} className="stat-pill">
            <div className="stat-pill-icon" style={{ background: bg, color }}>
              <Icon size={14} />
            </div>
            <div>
              <div className="stat-pill-value">{loading ? '—' : value}</div>
              <div className="stat-pill-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Company cards */}
      {loading ? (
        <div className="loading-state">Loading…</div>
      ) : companies.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Building2 />}
            title="No companies yet"
            description="Upload a document or create your first company to get started."
            action={
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                <Plus /> Create Company
              </button>
            }
          />
        </div>
      ) : (
        <div className="company-cards-grid">
          {companies.map((c) => {
            const s = companyStats[c.id] || { count: 0, lastDate: null };
            return (
              <CompanyCard
                key={c.id}
                company={c}
                loadsCount={s.count}
                lastLoadDate={s.lastDate}
                onEdit={(co) => setEditCompany(co)}
                onDelete={(co) => setDeleteCompany(co)}
                onEmail={(co) => setEmailCompany(co)}
              />
            );
          })}
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Company">
        <CompanyForm
          onSave={handleCreate}
          onCancel={() => setShowCreate(false)}
          loading={saving}
        />
      </Modal>

      <Modal isOpen={!!editCompany} onClose={() => setEditCompany(null)} title="Edit Company">
        <CompanyForm
          initial={editCompany}
          onSave={handleEdit}
          onCancel={() => setEditCompany(null)}
          loading={saving}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteCompany}
        onClose={() => setDeleteCompany(null)}
        onConfirm={handleDelete}
        title="Delete Company"
        message={`Permanently delete "${deleteCompany?.name}"? This cannot be undone.`}
        loading={saving}
      />

      <EmailModal
        isOpen={!!emailCompany}
        onClose={() => setEmailCompany(null)}
        company={emailCompany}
      />
    </div>
  );
}
