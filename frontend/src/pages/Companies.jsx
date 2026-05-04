import { useState, useEffect, useMemo } from 'react';
import { Plus, Building2, Search } from 'lucide-react';
import { api } from '../api/client';
import CompanyCard from '../components/CompanyCard';
import Modal from '../components/Modal';
import CompanyForm from '../components/CompanyForm';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import EmailModal from '../components/EmailModal';

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [deleteCompany, setDeleteCompany] = useState(null);
  const [emailCompany, setEmailCompany] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [c, l] = await Promise.all([api.get('/companies'), api.get('/loads')]);
        setCompanies(c);
        setLoads(l);
      } catch {
        // start empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredCompanies = useMemo(() => {
    if (!search.trim()) return companies;
    const q = search.trim().toLowerCase();
    return companies.filter(
      (c) =>
        (c.name  || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.mcNumber || '').toLowerCase().includes(q) ||
        (c.city  || '').toLowerCase().includes(q),
    );
  }, [companies, search]);

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
      <div className="page-header">
        <div>
          <h1 className="page-title">Companies</h1>
          <p className="page-subtitle">Brokers, shippers, and carriers</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus /> Add Company
        </button>
      </div>

      {!loading && companies.length > 0 && (
        <div className="filter-bar">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input
              className="search-input"
              type="text"
              placeholder="Search companies…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading…</div>
      ) : companies.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Building2 />}
            title="No companies yet"
            description="Add your first broker, shipper, or carrier to start building your network."
            action={
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                <Plus /> Add Company
              </button>
            }
          />
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Search />} title="No companies match" description="Try a different search." />
        </div>
      ) : (
        <div className="company-cards-grid">
          {filteredCompanies.map((c) => {
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
